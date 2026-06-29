import { Signer } from "@aws-sdk/rds-signer"
import { awsCredentialsProvider } from "@vercel/functions/oidc"
import pg from "pg"
import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

const { Pool } = pg
const rootDir = process.cwd()
const envPath = path.join(rootDir, ".env.local")
const migrationsDir = path.join(rootDir, "migrations")

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return
  }

  const contents = existsSync(filePath) ? readFile(filePath, "utf8") : null
  return contents.then((text) => {
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith("#")) continue
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line)
      if (!match) continue
      const [, key, rawValue] = match
      if (process.env[key] !== undefined) continue
      const value = rawValue
        .replace(/^["']|["']$/g, "")
        .replace(/\\n/g, "\n")
      process.env[key] = value
    }
  })
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function decodeOidcSubject(token) {
  if (!token) return null
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    )
    return payload.sub ?? null
  } catch {
    return null
  }
}

function oidcTrustPolicyHelp(roleArn, oidcSubject) {
  const teamSlug = oidcSubject?.match(/^owner:([^:]+):/)?.[1]
  if (!teamSlug || !oidcSubject) {
    return [
      "Your Vercel OIDC token cannot assume the AWS role.",
      "In AWS IAM, edit the trust policy on:",
      `  ${roleArn}`,
      "and allow your local development OIDC subject from VERCEL_OIDC_TOKEN.",
      "Then refresh env vars with: npx vercel env pull",
    ].join("\n")
  }

  const audience = `https://vercel.com/${teamSlug}`
  const conditionKey = `oidc.vercel.com/${teamSlug}:sub`
  const audienceKey = `oidc.vercel.com/${teamSlug}:aud`

  return [
    "Your Vercel OIDC token cannot assume the AWS role.",
    "Local `vercel env pull` issues a development token, but the role trust",
    "policy often only allows production/preview.",
    "",
    "In AWS IAM -> Roles -> access-mnemo-db -> Trust relationships, add:",
    "",
    `  "${conditionKey}": "${oidcSubject}",`,
    `  "${audienceKey}": "${audience}"`,
    "",
    "Or use StringLike to allow all environments for this project:",
    "",
    `  "${conditionKey}": "owner:${teamSlug}:project:mnemo:environment:*"`,
    "",
    "After saving the trust policy, refresh env vars:",
    "  npx vercel env pull",
    "  pnpm migrate",
  ].join("\n")
}

async function createPool() {
  await loadEnvFile(envPath)

  const region = requireEnv("AWS_REGION")
  const roleArn = requireEnv("AWS_ROLE_ARN")
  const host = requireEnv("PGHOST")
  const port = Number(requireEnv("PGPORT"))
  const user = requireEnv("PGUSER")
  const database = requireEnv("PGDATABASE")
  const oidcSubject = decodeOidcSubject(process.env.VERCEL_OIDC_TOKEN)

  let credentials
  try {
    credentials = awsCredentialsProvider({
      roleArn,
      clientConfig: { region },
    })
    await credentials()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("AssumeRoleWithWebIdentity")) {
      throw new Error(
        `${message}\n\n${oidcTrustPolicyHelp(roleArn, oidcSubject)}`,
      )
    }
    throw error
  }

  const signer = new Signer({
    hostname: host,
    port,
    username: user,
    region,
    credentials,
  })

  return new Pool({
    host,
    port,
    user,
    database,
    password: () => signer.getAuthToken(),
    ssl: process.env.PGSSL_MODE === "disable" ? false : { rejectUnauthorized: false },
    max: 1,
  })
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
}

async function listMigrationFiles() {
  const files = await readdir(migrationsDir)
  return files
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b))
}

async function hasMigrationRun(client, filename) {
  const result = await client.query(
    "SELECT 1 FROM schema_migrations WHERE filename = $1",
    [filename],
  )
  return result.rowCount > 0
}

async function runMigration(client, filename) {
  const sql = await readFile(path.join(migrationsDir, filename), "utf8")

  await client.query("BEGIN")
  try {
    await client.query(sql)
    await client.query(
      "INSERT INTO schema_migrations (filename) VALUES ($1)",
      [filename],
    )
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  }
}

async function main() {
  const pool = await createPool()
  const client = await pool.connect()

  try {
    await client.query("SELECT pg_advisory_lock(2026062901)")
    await ensureMigrationsTable(client)

    const files = await listMigrationFiles()
    if (files.length === 0) {
      console.log("No migration files found.")
      return
    }

    for (const filename of files) {
      if (await hasMigrationRun(client, filename)) {
        console.log(`Skipping ${filename} (already applied)`)
        continue
      }

      console.log(`Applying ${filename}`)
      await runMigration(client, filename)
      console.log(`Applied ${filename}`)
    }

    console.log("Migrations complete.")
  } finally {
    await client.query("SELECT pg_advisory_unlock(2026062901)").catch(() => {})
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error("Migration failed:")
  console.error(error instanceof Error ? error.message : error)
  if (
    error instanceof Error &&
    error.message.includes("AssumeRoleWithWebIdentity")
  ) {
    console.error("")
    console.error(
      "Docs: https://vercel.com/docs/oidc/aws#configuring-a-trust-policy-between-vercel-and-aws",
    )
  }
  process.exitCode = 1
})
