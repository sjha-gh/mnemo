import { Signer } from "@aws-sdk/rds-signer"
import { awsCredentialsProvider } from "@vercel/functions/oidc"
import { attachDatabasePool } from "@vercel/functions"
import pg from "pg"
import type { PoolClient, QueryResultRow } from "pg"

const { Pool } = pg

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const region = requireEnv("AWS_REGION")
const roleArn = requireEnv("AWS_ROLE_ARN")
const host = requireEnv("PGHOST")
const port = Number(requireEnv("PGPORT"))
const user = requireEnv("PGUSER")
const database = requireEnv("PGDATABASE")

const signer = new Signer({
  hostname: host,
  port,
  username: user,
  region,
  credentials: awsCredentialsProvider({
    roleArn,
    clientConfig: { region },
  }),
})

export const pool = new Pool({
  host,
  port,
  user,
  database,
  password: () => signer.getAuthToken(),
  ssl: process.env.PGSSL_MODE === "disable" ? false : { rejectUnauthorized: false },
  max: 5,
})

attachDatabasePool(pool)

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  return pool.query<T>(sql, params)
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const result = await fn(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
