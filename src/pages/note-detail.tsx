"use client";

import {
  ArrowLeft,
  Pencil,
  Play,
  Pause,
  Sparkles,
  Tag,
  Wand2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { StatusBadge } from "@/components/status-badge";
import { useIndexNote, useNote } from "@/hooks/use-notes";
import { formatDuration, relativeTime } from "@/lib/format";
import type { AudioClip, NoteStatus } from "@/lib/types";

export function NoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: note, isLoading } = useNote(id);
  const index = useIndexNote(id);
  const [liveStatus, setLiveStatus] = useState<NoteStatus | null>(null);
  const startedRef = useRef(false);

  function runIndex() {
    if (index.isPending) return;
    startedRef.current = true;
    setLiveStatus("queued");
    index.mutate((s) => setLiveStatus(s), {
      onSettled: () => setLiveStatus(null),
    });
  }

  // Auto-run the AI pipeline once whenever a note is queued (e.g. just saved or
  // re-saved). Don't gate on aiSummary — re-saved notes keep their old summary
  // but still need re-indexing, otherwise they'd be stuck in "queued" forever.
  useEffect(() => {
    if (!note || startedRef.current) return;
    if (note.status === "queued") runIndex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id, note?.status]);

  if (isLoading) return <DetailSkeleton />;
  if (!note) return <Navigate to="/app" replace />;

  const status = liveStatus ?? note.status;
  const isIndexing =
    index.isPending || status === "processing" || status === "queued";

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/app")}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <Link
          to={`/note/${note.id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <Pencil className="size-3.5" />
          Edit
        </Link>
      </div>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          <span className="text-xs text-muted-foreground">
            Updated {relativeTime(note.updatedAt)}
          </span>
        </div>
        <h1 className="text-balance font-serif text-3xl font-semibold leading-tight tracking-tight">
          {note.title}
        </h1>
        {note.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {note.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                <Tag className="size-3" />
                {t}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* AI panel */}
      <section className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="size-4 text-primary" />
            AI insights
          </h2>
          {status !== "processing" && (
            <button
              type="button"
              onClick={runIndex}
              disabled={index.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Wand2 className="size-3.5" />
              {note.status === "indexed" ? "Re-index" : "Index now"}
            </button>
          )}
        </div>

        {isIndexing ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {status === "queued"
              ? "Queued for indexing…"
              : "Analyzing your note…"}
          </p>
        ) : note.aiSummary ? (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-foreground">
              {note.aiSummary}
            </p>
            {note.aiKeywords && note.aiKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {note.aiKeywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            This note hasn&apos;t been indexed yet. Run indexing to generate a
            summary and keywords.
          </p>
        )}
      </section>

      {/* Body */}
      <div className="prose-note text-[17px] leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {note.content}
        </ReactMarkdown>
      </div>

      {/* Images */}
      {note.images.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Image memories
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {note.images.map((img) => (
              <figure key={img.id} className="flex flex-col gap-1.5">
                <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                  <img
                    src={img.url || "/placeholder.svg"}
                    alt={img.alt}
                    className="size-full object-cover"
                  />
                </div>
                {img.caption && (
                  <figcaption className="text-[11px] leading-snug text-muted-foreground">
                    <Sparkles className="mr-1 inline size-3 text-primary" />
                    {img.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Audio */}
      {note.audioClips.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Voice memos
          </h2>
          <div className="flex flex-col gap-2">
            {note.audioClips.map((clip) => (
              <AudioClipRow key={clip.id} clip={clip} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function AudioClipRow({ clip }: { clip: AudioClip }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement | null>(null);

  function toggle() {
    const audio = ref.current;
    if (!audio || !clip.url) return;

    if (playing) audio.pause();
    else void audio.play();
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={!clip.url}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4 translate-x-px" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{clip.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatDuration(clip.durationSec)}
          </p>
        </div>
        {clip.url && (
          <audio
            ref={ref}
            src={clip.url}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
        )}
      </div>
      {clip.transcript && (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          <Sparkles className="mr-1 inline size-3 text-primary" />
          {clip.transcript}
        </p>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="h-5 w-24 animate-pulse rounded bg-muted" />
      <div className="h-9 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-28 w-full animate-pulse rounded-2xl bg-muted" />
      <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
