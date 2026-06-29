import { searchNotes } from "./_lib/notes";
import {
  queryParam,
  sendError,
  sendJson,
  sendMethodNotAllowed,
} from "./_lib/http";
import { authenticate } from "./_lib/auth";

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    const user = await authenticate(req);
    const q = queryParam(req.query?.q)?.trim() ?? "";
    if (!q) {
      sendJson(res, 200, []);
      return;
    }

    sendJson(res, 200, await searchNotes(q, user.id));
  } catch (error) {
    sendError(res, error);
  }
}
