import { Link } from "react-router-dom"
import { ImageIcon, Mic, Pin } from "lucide-react"
import type { Note } from "@/lib/types"
import { relativeTime } from "@/lib/format"
import { StatusBadge } from "./status-badge"
import { cn } from "@/lib/utils"

export function NoteCard({ note, className }: { note: Note; className?: string }) {
  return (
    <Link
      to={`/note/${note.id}`}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-pretty text-[15px] font-semibold leading-snug tracking-tight">
          {note.title}
        </h3>
        {note.pinned && <Pin className="mt-0.5 size-3.5 shrink-0 text-primary" aria-label="Pinned" />}
      </div>

      <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{note.excerpt}</p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {note.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="truncate rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
          {note.audioClips.length > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px]">
              <Mic className="size-3" />
              {note.audioClips.length}
            </span>
          )}
          {note.images.length > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px]">
              <ImageIcon className="size-3" />
              {note.images.length}
            </span>
          )}
          <span className="text-[11px]">{relativeTime(note.updatedAt)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <StatusBadge status={note.status} />
      </div>
    </Link>
  )
}
