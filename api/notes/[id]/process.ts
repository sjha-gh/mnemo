import { processNote } from "../../_lib/notes"
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

    const note = await processNote(id)
    if (!note) {
      sendJson(res, 404, { error: "Note not found" })
      return
    }

    sendJson(res, 200, note)
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Unknown error" })
  }
}
