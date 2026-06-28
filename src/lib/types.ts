export type NoteStatus = "draft" | "queued" | "processing" | "indexed"

export interface AudioClip {
  id: string
  name: string
  durationSec: number
  createdAt: string
  /** mock transcript produced by AI indexing */
  transcript?: string
}

export interface ImageMemory {
  id: string
  url: string
  alt: string
  /** mock AI caption */
  caption?: string
}

export interface Note {
  id: string
  title: string
  /** markdown body */
  content: string
  excerpt: string
  tags: string[]
  status: NoteStatus
  createdAt: string
  updatedAt: string
  audioClips: AudioClip[]
  images: ImageMemory[]
  /** AI generated artifacts, present once indexed */
  aiSummary?: string
  aiKeywords?: string[]
  pinned?: boolean
}

export type SyncState =
  /** nothing to report yet */
  | "idle"
  /** draft written to the device, not yet uploaded */
  | "savedLocal"
  /** actively uploading to the cloud */
  | "syncing"
  /** local changes are up to date in the cloud */
  | "synced"
  /** saved locally and queued, waiting for a connection/upload */
  | "pending"
  /** no network connection */
  | "offline"
  /** the last upload attempt failed */
  | "error"
