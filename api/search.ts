import { searchNotes } from "./_lib/notes"
import { queryParam, sendJson, sendMethodNotAllowed } from "./_lib/http"

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"])
      return
    }

    const q = queryParam(req.query?.q)?.trim() ?? ""
    if (!q) {
      sendJson(res, 200, [])
      return
    }

    sendJson(res, 200, await searchNotes(q))
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Unknown error" })
  }
}
