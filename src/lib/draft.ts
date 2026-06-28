import type { LocalClip } from "@/hooks/use-audio-recorder"
import type { ImageMemory } from "./types"

export interface Draft {
  title: string
  content: string
  tags: string[]
  clips: LocalClip[]
  images: ImageMemory[]
  updatedAt: number
}

// In-memory draft (mock). Survives SPA navigation; no localStorage by design.
let draft: Draft | null = null

export function loadDraft(): Draft | null {
  return draft
}

export function saveDraft(next: Draft) {
  draft = next
}

export function clearDraft() {
  draft = null
}
