import type { LocalClip } from "@/hooks/use-audio-recorder"
import type { ImageMemory } from "./types"

const DB_NAME = "mnemo-local"
const DB_VERSION = 1
const DRAFT_STORE = "drafts"
const ACTIVE_DRAFT_ID = "active"

export interface Draft {
  title: string
  content: string
  tags: string[]
  clips: LocalClip[]
  images: ImageMemory[]
  updatedAt: number
  localRevision: string
  syncStatus: "local_only" | "sync_pending" | "synced" | "sync_failed"
}

let memoryDraft: Draft | null = null

function canUseIndexedDb() {
  return typeof indexedDB !== "undefined"
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error("IndexedDB is not available"))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: "id" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(DRAFT_STORE, mode)
        const store = tx.objectStore(DRAFT_STORE)
        const request = callback(store)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        tx.oncomplete = () => db.close()
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
      }),
  )
}

function normalizeDraft(draft: Omit<Draft, "localRevision" | "syncStatus"> & Partial<Draft>): Draft {
  return {
    ...draft,
    localRevision: draft.localRevision ?? crypto.randomUUID(),
    syncStatus: draft.syncStatus ?? "local_only",
  }
}

export async function loadDraft(): Promise<Draft | null> {
  if (!canUseIndexedDb()) return memoryDraft

  try {
    const record = await withStore<Draft | undefined>("readonly", (store) => store.get(ACTIVE_DRAFT_ID))
    return record ? normalizeDraft(record) : null
  } catch {
    return memoryDraft
  }
}

export async function saveDraft(next: Omit<Draft, "localRevision" | "syncStatus"> & Partial<Draft>) {
  const draft = normalizeDraft(next)
  memoryDraft = draft

  if (!canUseIndexedDb()) return

  try {
    await withStore<IDBValidKey>("readwrite", (store) =>
      store.put({
        id: ACTIVE_DRAFT_ID,
        ...draft,
      }),
    )
  } catch {
    // Keep the in-memory fallback so typing never breaks if IndexedDB is unavailable.
  }
}

export async function clearDraft() {
  memoryDraft = null

  if (!canUseIndexedDb()) return

  try {
    await withStore<undefined>("readwrite", (store) => store.delete(ACTIVE_DRAFT_ID))
  } catch {
    // Ignore local cleanup failures.
  }
}
