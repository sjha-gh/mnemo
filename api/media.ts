import { getObject } from "./_lib/s3";
import {
  queryParam,
  sendError,
  sendJson,
  sendMethodNotAllowed,
} from "./_lib/http";
import { authenticate } from "./_lib/auth";
import { noteBelongsToUser } from "./_lib/notes";

async function streamToBuffer(stream: any) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Media object keys are namespaced by note id, e.g. `audio/<noteId>/...` and
 * `images/<noteId>/...`. Extract the note id so we can verify the requester
 * owns the note before streaming private bytes back.
 */
function noteIdFromKey(key: string): string | null {
  const parts = key.split("/");
  if (parts.length < 2) return null;
  if (parts[0] !== "audio" && parts[0] !== "images") return null;
  return parts[1] || null;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    const user = await authenticate(req);

    const key = queryParam(req.query?.key);
    if (!key) {
      sendJson(res, 400, { error: "Missing media key" });
      return;
    }

    const noteId = noteIdFromKey(key);
    if (!noteId || !(await noteBelongsToUser(noteId, user.id))) {
      sendJson(res, 403, { error: "Forbidden" });
      return;
    }

    const object = await getObject(key);
    const body = await streamToBuffer(object.Body);
    res.status(200);
    res.setHeader(
      "Content-Type",
      object.ContentType ?? "application/octet-stream",
    );
    res.setHeader("Cache-Control", "private, max-age=300");
    res.end(body);
  } catch (error) {
    sendError(res, error);
  }
}
