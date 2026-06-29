import { getObject } from "./_lib/s3"
import { queryParam, sendJson, sendMethodNotAllowed } from "./_lib/http"

async function streamToBuffer(stream: any) {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"])
      return
    }

    const key = queryParam(req.query?.key)
    if (!key) {
      sendJson(res, 400, { error: "Missing media key" })
      return
    }

    const object = await getObject(key)
    const body = await streamToBuffer(object.Body)
    res.status(200)
    res.setHeader("Content-Type", object.ContentType ?? "application/octet-stream")
    res.setHeader("Cache-Control", "private, max-age=300")
    res.end(body)
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Unknown error" })
  }
}
