import { listNotes, saveNote, type SaveNoteInput } from "../_lib/notes";
import {
  readJsonBody,
  sendError,
  sendJson,
  sendMethodNotAllowed,
} from "../_lib/http";
import { authenticate } from "../_lib/auth";

export default async function handler(req: any, res: any) {
  try {
    const user = await authenticate(req);

    if (req.method === "GET") {
      sendJson(res, 200, await listNotes(user.id));
      return;
    }

    if (req.method === "POST") {
      const input = await readJsonBody<SaveNoteInput & { id?: string }>(req);
      const note = await saveNote(input, user.id);
      sendJson(res, 200, note);
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    sendError(res, error);
  }
}
