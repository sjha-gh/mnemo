"use client"

import { ArrowLeft, FileText, Sparkles, Type } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { AudioAttachments, type DisplayClip } from "@/components/editor/audio-attachments"
import { ImageAttachments } from "@/components/editor/image-attachments"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { SyncStatus } from "@/components/editor/sync-status"
import { useAudioRecorder, type LocalClip } from "@/hooks/use-audio-recorder"
import { useAutosave } from "@/hooks/use-autosave"
import { useNote, useSaveNote } from "@/hooks/use-notes"
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft"
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown"
import type { AudioClip, ImageMemory } from "@/lib/types"
import { cn } from "@/lib/utils"

type Mode = "rich" | "markdown"

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function EditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isExisting = Boolean(id)

  const { data: existingNote } = useNote(id)
  const saveNote = useSaveNote()
  const recorder = useAudioRecorder()

  const [title, setTitle] = useState("")
  const [html, setHtml] = useState("")
  const [markdown, setMarkdown] = useState("")
  const [mode, setMode] = useState<Mode>("rich")
  const [tags, setTags] = useState<string[]>([])
  const [savedClips, setSavedClips] = useState<AudioClip[]>([])
  const [images, setImages] = useState<ImageMemory[]>([])
  const [hydrated, setHydrated] = useState(false)

  const savedNoteId = useRef<string | undefined>(id)

  // Hydrate from an existing note or a durable local draft.
  useEffect(() => {
    if (hydrated) return
    if (isExisting) {
      if (existingNote) {
        setTitle(existingNote.title)
        setMarkdown(existingNote.content)
        setHtml(markdownToHtml(existingNote.content))
        setTags(existingNote.tags)
        setSavedClips(existingNote.audioClips)
        setImages(existingNote.images)
        setHydrated(true)
      }
      return
    }
    let cancelled = false
    void loadDraft().then((draft) => {
      if (cancelled) return
      if (draft) {
        setTitle(draft.title)
        setMarkdown(draft.content)
        setHtml(markdownToHtml(draft.content))
        setTags(draft.tags)
        setImages(draft.images)
        recorder.restoreClips(draft.clips)
      }
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [existingNote, hydrated, isExisting, recorder])

  // Combined clip list for display: saved clips + clips recorded this session.
  const displayClips: DisplayClip[] = useMemo(
    () => [
      ...savedClips.map((c) => ({ id: c.id, name: c.name, durationSec: c.durationSec, url: c.url })),
      ...recorder.clips.map((c) => ({ id: c.id, name: c.name, durationSec: c.durationSec, url: c.url })),
    ],
    [savedClips, recorder.clips],
  )

  const toAudioClips = useCallback(
    async (sessionClips: LocalClip[]): Promise<AudioClip[]> => [
      ...savedClips,
      ...(await Promise.all(
        sessionClips.map(async (c) => ({
          id: c.id,
          name: c.name,
          durationSec: c.durationSec,
          createdAt: c.createdAt,
          mimeType: c.mimeType,
          fileSizeBytes: c.fileSizeBytes,
          url: c.url,
          dataUrl: c.blob ? await blobToDataUrl(c.blob) : undefined,
        })),
      )),
    ],
    [savedClips],
  )

  const isEmpty =
    !title.trim() && !markdown.trim() && displayClips.length === 0 && images.length === 0

  const handleHtmlChange = useCallback((next: string) => {
    setHtml(next)
    setMarkdown(htmlToMarkdown(next))
  }, [])

  const handleMarkdownChange = useCallback((next: string) => {
    setMarkdown(next)
    setHtml(markdownToHtml(next))
  }, [])

  function switchMode(next: Mode) {
    if (next === mode) return
    if (next === "markdown") setMarkdown(htmlToMarkdown(html))
    else setHtml(markdownToHtml(markdown))
    setMode(next)
  }

  // Keep a snapshot of current values for the autosave callback.
  const snapshot = useRef({ title, markdown, tags, images, sessionClips: recorder.clips })
  snapshot.current = { title, markdown, tags, images, sessionClips: recorder.clips }

  const persist = useCallback(async () => {
    const { title: t, markdown: md, tags: tg, images: im, sessionClips } = snapshot.current
    const audioClips = await toAudioClips(sessionClips)
    if (!t.trim() && !md.trim() && im.length === 0 && audioClips.length === 0) return
    const saved = await saveNote.mutateAsync({
      id: savedNoteId.current,
      title: t.trim() || "Untitled note",
      content: md,
      tags: tg,
      audioClips,
      images: im,
    })
    if (!savedNoteId.current) {
      savedNoteId.current = saved.id
      void clearDraft()
    }
  }, [saveNote, toAudioClips])

  const { state, lastSavedAt, touch, flush } = useAutosave({
    onSave: () => void persist(),
    enabled: hydrated && !isEmpty,
  })

  // Mirror current edits into the in-memory draft (resilience for new notes).
  useEffect(() => {
    if (!hydrated) return
    touch()
    if (!isExisting && !savedNoteId.current && !isEmpty) {
      void saveDraft({
        title,
        content: markdown,
        tags,
        clips: recorder.clips,
        images,
        updatedAt: Date.now(),
        syncStatus: "local_only",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, markdown, tags, images, recorder.clips])

  async function handleDone() {
    flush("exit")
    await persist()
    navigate(savedNoteId.current ? `/note/${savedNoteId.current}` : "/app")
  }

  function removeClip(clipId: string) {
    if (savedClips.some((c) => c.id === clipId)) {
      setSavedClips((prev) => prev.filter((c) => c.id !== clipId))
    } else {
      recorder.removeClip(clipId)
    }
  }

  const wordCount = useMemo(() => {
    const text = markdown.replace(/[#>*_`[\]()\-!]/g, " ")
    return text.trim().split(/\s+/).filter(Boolean).length
  }, [markdown])

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/40 bg-background/95 px-4 py-2.5 backdrop-blur-md">
        <button
          type="button"
          onClick={handleDone}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="flex items-center gap-2">
          <SyncStatus state={state} lastSavedAt={lastSavedAt} />
          <div className="flex items-center rounded-md border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => switchMode("rich")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                mode === "rich" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={mode === "rich"}
              title="Rich text editor"
            >
              <Type className="size-3.5" />
              <span className="hidden sm:inline">Rich</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode("markdown")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                mode === "markdown" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={mode === "markdown"}
              title="Markdown editor"
            >
              <FileText className="size-3.5" />
              <span className="hidden sm:inline">Markdown</span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleDone}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Done
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-32 pt-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          aria-label="Note title"
          className="mb-2 w-full bg-transparent font-serif text-4xl font-semibold leading-tight tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40 focus:outline-none"
        />
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground/70">
          <Sparkles className="size-3 text-primary/60" />
          <span>Saved notes are automatically indexed by AI</span>
        </div>

        {mode === "rich" ? (
          <RichTextEditor html={html} onChange={handleHtmlChange} />
        ) : (
          <textarea
            value={markdown}
            onChange={(e) => handleMarkdownChange(e.target.value)}
            placeholder="Start writing with Markdown…&#10;&#10;Use # for headings, **bold** for emphasis, or type freely."
            aria-label="Markdown editor"
            spellCheck
            className="editor-textarea min-h-[50vh] w-full flex-1 resize-none bg-transparent px-0.5 font-serif text-[17px] leading-[1.75] text-foreground outline-none placeholder:text-muted-foreground/40 focus:ring-0"
          />
        )}

        <div className="mt-10 flex flex-col gap-6 border-t border-border/40 pt-8">
          <AudioAttachments
            clips={displayClips}
            isRecording={recorder.state === "recording"}
            elapsed={recorder.elapsed}
            onToggleRecord={() => (recorder.state === "recording" ? recorder.stop() : void recorder.start())}
            onRemove={removeClip}
          />
          <ImageAttachments
            images={images}
            onAdd={(image) => setImages((prev) => [...prev, image])}
            onRemove={(imageId) => setImages((prev) => prev.filter((i) => i.id !== imageId))}
          />
        </div>

        <p className="mt-8 text-xs text-muted-foreground/60">{wordCount} words</p>
      </main>
    </div>
  )
}
