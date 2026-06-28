import { useCallback, useEffect, useRef, useState } from "react"
import type { SyncState } from "@/lib/types"

interface Options {
  /** Persist the current draft. Should be cheap/synchronous-ish (mock store). */
  onSave: (reason: SaveReason) => void
  /** Whether there is anything worth saving. */
  enabled: boolean
  debounceMs?: number
}

export type SaveReason = "autosave" | "exit" | "navigation" | "minimize" | "close"

/**
 * Local draft autosave. Saves on a debounce while typing, and immediately when
 * the page is about to be hidden, navigated away from, minimized, or closed.
 */
export function useAutosave({ onSave, enabled, debounceMs = 900 }: Options) {
  const [state, setState] = useState<SyncState>("idle")
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const dirtyRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const syncTimerRef = useRef<number | null>(null)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const clearSyncTimer = () => {
    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }
  }

  const flush = useCallback(
    (reason: SaveReason) => {
      if (!dirtyRef.current || !enabled) return
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      // The local draft write is effectively instant.
      onSaveRef.current(reason)
      setLastSavedAt(Date.now())
      dirtyRef.current = false

      clearSyncTimer()
      // Without a connection the change is saved locally and queued for later.
      if (!navigator.onLine) {
        setState("pending")
        return
      }
      // Mock cloud upload: a brief "syncing" window, then "synced".
      setState("syncing")
      syncTimerRef.current = window.setTimeout(() => {
        setState(navigator.onLine ? "synced" : "pending")
      }, 600)
    },
    [enabled],
  )

  const touch = useCallback(() => {
    if (!enabled) return
    dirtyRef.current = true
    clearSyncTimer()
    // Local autosave is immediate; the cloud sync is debounced below.
    setState(navigator.onLine ? "savedLocal" : "offline")
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => flush("autosave"), debounceMs)
  }, [enabled, debounceMs, flush])

  // Reflect connectivity changes; resume syncing queued work when back online.
  useEffect(() => {
    if (!enabled) return
    const onOffline = () => {
      clearSyncTimer()
      setState(dirtyRef.current || lastSavedAt ? "pending" : "offline")
    }
    const onOnline = () => {
      if (dirtyRef.current) {
        flush("autosave")
        return
      }
      if (lastSavedAt) {
        setState("syncing")
        clearSyncTimer()
        syncTimerRef.current = window.setTimeout(() => {
          // If the connection dropped again before the retry finished, the
          // upload is considered failed; otherwise it's up to date.
          setState(navigator.onLine ? "synced" : "error")
        }, 600)
      }
    }
    window.addEventListener("offline", onOffline)
    window.addEventListener("online", onOnline)
    return () => {
      window.removeEventListener("offline", onOffline)
      window.removeEventListener("online", onOnline)
    }
  }, [enabled, flush, lastSavedAt])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush("minimize")
    }
    const onPageHide = () => flush("close")
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current && enabled) {
        flush("close")
        e.preventDefault()
        e.returnValue = ""
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("pagehide", onPageHide)
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pagehide", onPageHide)
      window.removeEventListener("beforeunload", onBeforeUnload)
      clearSyncTimer()
      // flush on unmount = navigation away within the SPA
      flush("navigation")
    }
  }, [flush, enabled])

  return { state, lastSavedAt, touch, flush }
}
