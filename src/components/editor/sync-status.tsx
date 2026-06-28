import { Check, Cloud, CloudOff, CloudUpload, Loader2, TriangleAlert } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { SyncState } from "@/lib/types"
import { cn } from "@/lib/utils"

type Tone = "muted" | "ok" | "attention" | "error"

interface Descriptor {
  Icon: LucideIcon
  /** full phrase shown on larger screens */
  label: string
  /** compact label shown on small screens */
  short: string
  tone: Tone
  spin?: boolean
}

const DESCRIPTORS: Record<Exclude<SyncState, "idle">, Descriptor> = {
  savedLocal: { Icon: Check, label: "Saved locally", short: "Saved", tone: "muted" },
  syncing: { Icon: Loader2, label: "Syncing", short: "Syncing", tone: "muted", spin: true },
  synced: { Icon: Cloud, label: "Synced", short: "Synced", tone: "ok" },
  pending: { Icon: CloudUpload, label: "Pending upload", short: "Pending", tone: "attention" },
  offline: { Icon: CloudOff, label: "Offline", short: "Offline", tone: "muted" },
  error: { Icon: TriangleAlert, label: "Sync failed", short: "Failed", tone: "error" },
}

const TONE_CLASSES: Record<Tone, string> = {
  muted: "text-muted-foreground",
  ok: "text-primary",
  attention: "text-foreground",
  error: "text-destructive",
}

const DOT_CLASSES: Record<Tone, string> = {
  muted: "bg-muted-foreground/50",
  ok: "bg-primary",
  attention: "bg-foreground/70",
  error: "bg-destructive",
}

export function SyncStatus({
  state,
  lastSavedAt,
  className,
}: {
  state: SyncState
  lastSavedAt: number | null
  className?: string
}) {
  if (state === "idle") return null

  const { Icon, label, short, tone, spin } = DESCRIPTORS[state]
  const time = state === "synced" || state === "savedLocal" ? relativeTime(lastSavedAt) : null

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label + (time ? ` ${time}` : "")}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1.5 pr-2.5 text-xs font-medium tabular-nums transition-colors",
        "bg-muted/40",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {/* color dot reads at a glance even when the icon is ambiguous on small screens */}
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASSES[tone])} />
      <Icon aria-hidden className={cn("size-3.5 shrink-0", spin && "animate-spin")} />
      {/* compact on mobile, descriptive on larger screens */}
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">
        {label}
        {time ? <span className="text-muted-foreground/70">{` · ${time}`}</span> : null}
      </span>
    </span>
  )
}

function relativeTime(ts: number | null) {
  if (!ts) return null
  const diff = Math.round((Date.now() - ts) / 1000)
  if (diff < 5) return "just now"
  if (diff < 60) return `${diff}s ago`
  const mins = Math.round(diff / 60)
  return `${mins}m ago`
}
