import type { Note } from "./types"
import { initialNotes } from "./mock-data"

/**
 * In-memory mock backend. Lives for the lifetime of the session (survives
 * client-side navigation) without touching localStorage. Swap these functions
 * for real network calls later — the shapes are intentionally async.
 */
let notes: Note[] = [...initialNotes]

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function uid(prefix = "n") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export async function listNotes(): Promise<Note[]> {
  await delay(220)
  return [...notes].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
}

export async function getNote(id: string): Promise<Note | undefined> {
  await delay(160)
  return notes.find((n) => n.id === id)
}

export async function searchNotes(query: string): Promise<Note[]> {
  await delay(260)
  const q = query.trim().toLowerCase()
  if (!q) return []
  return notes
    .filter((n) => {
      const haystack = [
        n.title,
        n.content,
        n.excerpt,
        n.aiSummary ?? "",
        ...n.tags,
        ...(n.aiKeywords ?? []),
        ...n.audioClips.map((c) => `${c.name} ${c.transcript ?? ""}`),
        ...n.images.map((i) => `${i.alt} ${i.caption ?? ""}`),
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
}

export interface CreateNoteInput {
  title: string
  content: string
  tags: string[]
  audioClips: Note["audioClips"]
  images: Note["images"]
}

function deriveExcerpt(content: string) {
  const text = content
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text.slice(0, 160)
}

export async function saveNote(
  input: CreateNoteInput & { id?: string },
): Promise<Note> {
  await delay(500)
  const title = input.title.trim() || "Untitled note"
  const excerpt = deriveExcerpt(input.content) || "No content yet."

  if (input.id) {
    const existing = notes.find((n) => n.id === input.id)
    if (existing) {
      Object.assign(existing, {
        title,
        content: input.content,
        excerpt,
        tags: input.tags,
        audioClips: input.audioClips,
        images: input.images,
        status: "queued" as const,
        updatedAt: new Date().toISOString(),
      })
      return existing
    }
  }

  const note: Note = {
    id: uid(),
    title,
    content: input.content,
    excerpt,
    tags: input.tags,
    status: "queued",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    audioClips: input.audioClips,
    images: input.images,
  }
  notes = [note, ...notes]
  return note
}

/**
 * Simulates the async AI indexing pipeline (queued -> processing -> indexed),
 * producing a mock summary + keywords. Calls onStage as it progresses.
 */
export async function runAiIndexing(
  id: string,
  onStage?: (status: Note["status"]) => void,
): Promise<Note | undefined> {
  const note = notes.find((n) => n.id === id)
  if (!note) return undefined

  note.status = "queued"
  onStage?.("queued")
  await delay(700)

  note.status = "processing"
  onStage?.("processing")
  await delay(1600)

  const words = note.content
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4)
  const freq = new Map<string, number>()
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1)
  const keywords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w)

  note.aiKeywords = keywords.length ? keywords : note.tags
  note.aiSummary =
    note.excerpt.length > 12
      ? `AI summary · ${note.excerpt.slice(0, 120)}${note.excerpt.length > 120 ? "…" : ""}`
      : "AI summary will appear once this note has more content."
  note.audioClips = note.audioClips.map((c) => ({
    ...c,
    transcript: c.transcript ?? "Transcribed locally · tap to view full transcript.",
  }))
  note.status = "indexed"
  note.updatedAt = new Date().toISOString()
  onStage?.("indexed")
  return note
}

export function getTopTags(): { tag: string; count: number }[] {
  const map = new Map<string, number>()
  for (const n of notes) for (const t of n.tags) map.set(t, (map.get(t) ?? 0) + 1)
  return [...map.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count)
}
