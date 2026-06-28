import { Check, CircleDashed, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { statusLabel } from "@/lib/format"
import type { NoteStatus } from "@/lib/types"

export function StatusBadge({ status, className }: { status: NoteStatus; className?: string }) {
  const map = {
    draft: { Icon: CircleDashed, cls: "text-muted-foreground bg-muted", spin: false },
    queued: { Icon: Sparkles, cls: "text-primary bg-primary/10", spin: false },
    processing: { Icon: Loader2, cls: "text-primary bg-primary/10", spin: true },
    indexed: { Icon: Check, cls: "text-primary bg-primary/10", spin: false },
  } as const
  const { Icon, cls, spin } = map[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        cls,
        className,
      )}
    >
      <Icon className={cn("size-3", spin && "animate-spin")} />
      {statusLabel(status)}
    </span>
  )
}
