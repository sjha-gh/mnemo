import type { Draft } from "./draft"
import { saveNoteRemote } from "./api-client"
import type { AudioClip } from "./types"

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function isRecoverableDraft(draft: Draft | null | undefined) {
  if (!draft) return false
  return Boolean(
    draft.title.trim() ||
      draft.content.trim() ||
      draft.tags.length > 0 ||
      draft.clips.length > 0 ||
      draft.images.length > 0,
  )
}

export async function draftToSaveInput(draft: Draft) {
  const audioClips: AudioClip[] = await Promise.all(
    draft.clips.map(async (clip) => ({
      id: clip.id,
      name: clip.name,
      durationSec: clip.durationSec,
      createdAt: clip.createdAt,
      mimeType: clip.mimeType,
      fileSizeBytes: clip.fileSizeBytes,
      dataUrl: clip.blob ? await blobToDataUrl(clip.blob) : undefined,
    })),
  )

  return {
    id: draft.noteId,
    title: draft.title.trim() || "Untitled note",
    content: draft.content,
    tags: draft.tags,
    audioClips,
    images: draft.images,
  }
}

export async function syncPendingDraft(draft: Draft) {
  const input = await draftToSaveInput(draft)
  return saveNoteRemote(input)
}
