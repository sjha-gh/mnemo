import { useCallback, useEffect, useRef, useState } from "react"

export interface LocalClip {
  id: string
  name: string
  url: string
  durationSec: number
  createdAt: string
}

type RecorderState = "idle" | "recording" | "unsupported" | "denied"

export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>("idle")
  const [clips, setClips] = useState<LocalClip[]>([])
  const [elapsed, setElapsed] = useState(0)

  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const startRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.mediaDevices || !window.MediaRecorder) {
      setState("unsupported")
    }
  }, [])

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const start = useCallback(async () => {
    if (state === "recording" || state === "unsupported") return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        const url = URL.createObjectURL(blob)
        const durationSec = Math.max(1, Math.round((Date.now() - startRef.current) / 1000))
        setClips((prev) => [
          ...prev,
          {
            id: `clip_${Date.now()}`,
            name: `Voice clip ${prev.length + 1}`,
            url,
            durationSec,
            createdAt: new Date().toISOString(),
          },
        ])
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      mediaRef.current = recorder
      startRef.current = Date.now()
      recorder.start()
      setState("recording")
      setElapsed(0)
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.round((Date.now() - startRef.current) / 1000))
      }, 250)
    } catch {
      setState("denied")
    }
  }, [state])

  const stop = useCallback(() => {
    stopTimer()
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop()
    }
    setState("idle")
    setElapsed(0)
  }, [])

  const removeClip = useCallback((id: string) => {
    setClips((prev) => {
      const target = prev.find((c) => c.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((c) => c.id !== id)
    })
  }, [])

  const renameClip = useCallback((id: string, name: string) => {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
  }, [])

  useEffect(() => {
    return () => {
      stopTimer()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return { state, clips, elapsed, start, stop, removeClip, renameClip }
}
