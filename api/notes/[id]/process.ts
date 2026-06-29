import { processNote } from "../../_lib/notes";
import {
  queryParam,
  sendError,
  sendJson,
  sendMethodNotAllowed,
} from "../../_lib/http";
import { authenticate } from "../../_lib/auth";

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
    const note = await processNote(id, user.id);
    if (!note) {
      sendJson(res, 404, { error: "Note not found" });
      return;
    }

    sendJson(res, 200, note);
  } catch (error) {
    sendError(res, error);
  }
}
