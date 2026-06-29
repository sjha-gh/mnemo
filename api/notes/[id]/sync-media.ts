import { getNote } from "../../_lib/notes"
import { queryParam, sendJson, sendMethodNotAllowed } from "../../_lib/http"

export default async function handler(req: any, res: any) {
  const id = queryParam(req.query?.id)
  if (!id) {
    sendJson(res, 400, { error: "Missing note id" })
    return
  }

  try {
    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"])
      return
    }

    // Media data URLs are currently accepted through POST /api/notes as part of
    // the MVP save payload. This endpoint exists so the frontend has a stable
    // boundary for queued-media sync when larger/direct uploads are introduced.
    const note = await getNote(id)
    if (!note) {
      sendJson(res, 404, { error: "Note not found" })
      return
    }

    sendJson(res, 200, { ok: true, note })
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Unknown error" })
  }
}
