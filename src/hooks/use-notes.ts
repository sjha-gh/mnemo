import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  listNotes,
  getNote,
  searchNotes,
  saveNote,
  runAiIndexing,
  type CreateNoteInput,
} from "@/lib/store"
import type { NoteStatus } from "@/lib/types"

export const noteKeys = {
  all: ["notes"] as const,
  detail: (id: string) => ["notes", id] as const,
  search: (q: string) => ["search", q] as const,
}

export function useNotes() {
  return useQuery({ queryKey: noteKeys.all, queryFn: listNotes })
}

export function useNote(id: string | undefined) {
  return useQuery({
    queryKey: noteKeys.detail(id ?? ""),
    queryFn: () => getNote(id as string),
    enabled: Boolean(id),
  })
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: noteKeys.search(query),
    queryFn: () => searchNotes(query),
    enabled: query.trim().length > 0,
  })
}

export function useSaveNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateNoteInput & { id?: string }) => saveNote(input),
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: noteKeys.all })
      qc.invalidateQueries({ queryKey: noteKeys.detail(note.id) })
    },
  })
}

export function useIndexNote(id: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (onStage?: (status: NoteStatus) => void) => runAiIndexing(id as string, onStage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noteKeys.all })
      if (id) qc.invalidateQueries({ queryKey: noteKeys.detail(id) })
    },
  })
}
