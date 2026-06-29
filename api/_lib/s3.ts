import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { awsCredentialsProvider } from "@vercel/functions/oidc"

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const region = requireEnv("AWS_REGION")
const roleArn = requireEnv("AWS_ROLE_ARN")
const bucket = process.env.S3_MEDIA_BUCKET

const s3 = new S3Client({
  region,
  credentials: awsCredentialsProvider({
    roleArn,
    clientConfig: { region },
  }),
}) as any

export function hasMediaBucket() {
  return Boolean(bucket)
}

export function parseDataUrl(dataUrl: string) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/.exec(dataUrl)
  if (!match) throw new Error("Invalid data URL")

  const [, contentType = "application/octet-stream", isBase64, payload] = match
  const body = isBase64
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf8")

  return { body, contentType }
}

export async function uploadDataUrl({
  dataUrl,
  key,
}: {
  dataUrl: string
  key: string
}) {
  if (!bucket) return null

  const { body, contentType } = parseDataUrl(dataUrl)

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: "AES256",
    }),
  )

  return key
}

export async function getObject(key: string) {
  if (!bucket) throw new Error("Missing S3_MEDIA_BUCKET")

  return s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  )
}
