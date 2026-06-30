import { getNote } from "../../_lib/notes.js";
import {
  queryParam,
  sendError,
  sendJson,
  sendMethodNotAllowed,
} from "../../_lib/http.js";
import { authenticate } from "../../_lib/auth.js";

export default async function handler(req: any, res: any) {
  const id = queryParam(req.query?.id);
  if (!id) {
    sendJson(res, 400, { error: "Missing note id" });
    return;
  }

  try {
    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }

    const user = await authenticate(req);

    // Media data URLs are currently accepted through POST /api/notes as part of
    // the MVP save payload. This endpoint exists so the frontend has a stable
    // boundary for queued-media sync when larger/direct uploads are introduced.
    const note = await getNote(id, user.id);
    if (!note) {
      sendJson(res, 404, { error: "Note not found" });
      return;
    }

    sendJson(res, 200, { ok: true, note });
  } catch (error) {
    sendError(res, error);
  }
}
