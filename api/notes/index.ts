import { listNotes, saveNote, type SaveNoteInput } from "../_lib/notes"
import { readJsonBody, sendJson, sendMethodNotAllowed } from "../_lib/http"

export default async function handler(req: any, res: any) {
  try {
    if (req.method === "GET") {
      sendJson(res, 200, await listNotes())
      return
    }

    if (req.method === "POST") {
      const input = await readJsonBody<SaveNoteInput & { id?: string }>(req)
      const note = await saveNote(input)
      sendJson(res, 200, note)
      return
    }

    sendMethodNotAllowed(res, ["GET", "POST"])
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Unknown error" })
  }
}
