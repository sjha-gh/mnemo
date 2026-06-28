import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Plus, Search, Sparkles } from "lucide-react"
import { useNotes } from "@/hooks/use-notes"
import { NoteCard } from "@/components/note-card"
import { cn } from "@/lib/utils"
import type { Note } from "@/lib/types"

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: notes, isLoading } = useNotes()
  const [query, setQuery] = useState("")
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const tags = useMemo(() => {
    const map = new Map<string, number>()
    for (const n of notes ?? []) for (const t of n.tags) map.set(t, (map.get(t) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [notes])

  const filtered = useMemo(() => {
    let list = notes ?? []
    if (activeTag) list = list.filter((n) => n.tags.includes(activeTag))
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((n) => `${n.title} ${n.excerpt} ${n.tags.join(" ")}`.toLowerCase().includes(q))
    return list
  }, [notes, query, activeTag])

  const pinned = filtered.filter((n) => n.pinned)
  const rest = filtered.filter((n) => !n.pinned)

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const indexedCount = (notes ?? []).filter((n) => n.status === "indexed").length

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{greeting()}</p>
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          Your notebook
        </h1>
      </header>

      {/* Search */}
      <form onSubmit={submitSearch} className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes, transcripts, captions…"
          aria-label="Search your notebook"
          className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-24 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
        />
        <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground sm:flex">
          <Sparkles className="size-3 text-primary" /> AI search
        </span>
      </form>

      {/* Stats + tags */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" />
          {indexedCount} indexed
        </span>
        <button
          onClick={() => setActiveTag(null)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            activeTag === null ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </button>
        {tags.map(([tag, count]) => (
          <button
            key={tag}
            onClick={() => setActiveTag((t) => (t === tag ? null : tag))}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              activeTag === tag
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            #{tag}
            <span className="ml-1 opacity-60">{count}</span>
          </button>
        ))}
      </div>

      {/* Notes */}
      {isLoading ? (
        <NotesSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState hasNotes={(notes ?? []).length > 0} />
      ) : (
        <div className="flex flex-col gap-5">
          {pinned.length > 0 && (
            <Section title="Pinned" notes={pinned} />
          )}
          <Section title={activeTag || query ? "Results" : "Recent"} notes={rest} />
        </div>
      )}

      <Link
        to="/new"
        className="fixed bottom-24 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-opacity hover:opacity-90 sm:hidden"
      >
        <Plus className="size-4" /> New
      </Link>
    </div>
  )
}

function Section({ title, notes }: { title: string; notes: Note[] }) {
  if (notes.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {notes.map((n) => (
          <NoteCard key={n.id} note={n} />
        ))}
      </div>
    </section>
  )
}

function EmptyState({ hasNotes }: { hasNotes: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="size-6" />
      </span>
      <div>
        <p className="font-medium">{hasNotes ? "No matches" : "Your notebook is empty"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasNotes ? "Try a different search or tag." : "Capture your first thought to begin."}
        </p>
      </div>
      <Link
        to="/new"
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Plus className="size-4" /> New note
      </Link>
    </div>
  )
}

function NotesSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-2xl border border-border bg-card" />
      ))}
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}
