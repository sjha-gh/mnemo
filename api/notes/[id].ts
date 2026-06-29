import { autosaveNote, getNote, type SaveNoteInput } from "../_lib/notes"
import { queryParam, readJsonBody, sendJson, sendMethodNotAllowed } from "../_lib/http"

export default async function handler(req: any, res: any) {
  const id = queryParam(req.query?.id)
  if (!id) {
    sendJson(res, 400, { error: "Missing note id" })
    return
  }

  try {
    if (req.method === "GET") {
      const note = await getNote(id)
      if (!note) {
        sendJson(res, 404, { error: "Note not found" })
        return
      }
      sendJson(res, 200, note)
      return
    }

    if (req.method === "PATCH") {
      const input = await readJsonBody<Partial<SaveNoteInput>>(req)
      const note = await autosaveNote(id, input)
      if (!note) {
        sendJson(res, 404, { error: "Note not found" })
        return
      }
      sendJson(res, 200, note)
      return
    }

    sendMethodNotAllowed(res, ["GET", "PATCH"])
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Unknown error" })
  }
}
