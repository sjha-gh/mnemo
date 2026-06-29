import type { Note, NoteStatus } from "./types"
import * as mockStore from "./store"
import type { CreateNoteInput } from "./store"

export type { CreateNoteInput }

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<T>
}

async function withMockFallback<T>(
  request: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await request()
  } catch {
    return fallback()
  }
}

export function listNotes(): Promise<Note[]> {
  return withMockFallback(
    () => requestJson<Note[]>("/api/notes"),
    () => mockStore.listNotes(),
  )
}

export function getNote(id: string): Promise<Note | undefined> {
  return withMockFallback(
    () => requestJson<Note>(`/api/notes/${encodeURIComponent(id)}`),
    () => mockStore.getNote(id),
  )
}

export function searchNotes(query: string): Promise<Note[]> {
  const params = new URLSearchParams({ q: query })
  return withMockFallback(
    () => requestJson<Note[]>(`/api/search?${params.toString()}`),
    () => mockStore.searchNotes(query),
  )
}

export function saveNote(input: CreateNoteInput & { id?: string }): Promise<Note> {
  return withMockFallback(
    () =>
      requestJson<Note>("/api/notes", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    () => mockStore.saveNote(input),
  )
}

export async function runAiIndexing(
  id: string,
  onStage?: (status: NoteStatus) => void,
): Promise<Note | undefined> {
  return withMockFallback(
    async () => {
      onStage?.("queued")
      const queued = await requestJson<Note>(`/api/notes/${encodeURIComponent(id)}/process`, {
        method: "POST",
      })
      onStage?.(queued.status)
      return queued
    },
    () => mockStore.runAiIndexing(id, onStage),
  )
}
