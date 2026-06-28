import { cn } from "@/lib/utils"

export function Logo({ className, showWord = true }: { className?: string; showWord?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid size-7 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
        <svg viewBox="0 0 32 32" className="size-4" aria-hidden="true">
          <path
            d="M8 22V12.5c0-2 1.4-3.2 3-3.2 1.4 0 2.4.8 3 2 .6-1.2 1.6-2 3-2 1.6 0 3 1.2 3 3.2V22"
            fill="none"
            stroke="currentColor"
            className="text-primary"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="23.5" cy="9.5" r="1.9" className="fill-primary" />
        </svg>
      </span>
      {showWord && <span className="text-[15px] font-semibold tracking-tight">Mnemo</span>}
    </span>
  )
}
