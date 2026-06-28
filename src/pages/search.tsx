"use client"

import {
  ArrowUpRight,
  FileText,
  ImageIcon,
  Mic,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag as TagIcon,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useSearch } from "@/hooks/use-notes"
import { relativeTime } from "@/lib/format"
import { StatusBadge } from "@/components/status-badge"
import { cn } from "@/lib/utils"
import type { Note } from "@/lib/types"

type SourceType = "text" | "voice" | "image" | "summary" | "tag"
type DateRange = "any" | "day" | "week" | "month"

interface MatchReason {
  type: SourceType
  /** short contextual snippet around the match */
  snippet: string
  /** where the match was found, for the reason line */
  field: string
}

const SOURCE_META: Record<
  SourceType,
  { label: string; Icon: typeof FileText; cls: string }
> = {
  text: { label: "Text", Icon: FileText, cls: "bg-primary/10 text-primary" },
  voice: { label: "Voice transcript", Icon: Mic, cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  image: { label: "Image caption", Icon: ImageIcon, cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  summary: { label: "AI summary", Icon: Sparkles, cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  tag: { label: "Tag", Icon: TagIcon, cls: "bg-muted text-muted-foreground" },
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const initial = params.get("q") ?? ""
  const [input, setInput] = useState(initial)
  const [query, setQuery] = useState(initial)

  // Active filters (client-side, mock only).
  const [sources, setSources] = useState<Set<SourceType>>(new Set())
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>("any")
  const [showFilters, setShowFilters] = useState(false)

  // Debounce typing into the active query.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(input)
      setParams(input.trim() ? { q: input.trim() } : {}, { replace: true })
    }, 250)
    return () => clearTimeout(t)
  }, [input, setParams])

  const { data: results, isFetching } = useSearch(query)

  // Compute match reasons once per result set.
  const analyzed = useMemo(() => {
    return (results ?? []).map((note) => ({
      note,
      reasons: getMatchReasons(note, query),
    }))
  }, [results, query])

  // Tags available across the current result set, for the tag filter.
  const availableTags = useMemo(() => {
    const set = new Set<string>()
    for (const { note } of analyzed) note.tags.forEach((t) => set.add(t))
    return [...set].sort()
  }, [analyzed])

  // Apply the active filters.
  const filtered = useMemo(() => {
    return analyzed.filter(({ note, reasons }) => {
      if (sources.size > 0 && !reasons.some((r) => sources.has(r.type))) return false
      if (activeTag && !note.tags.includes(activeTag)) return false
      if (dateRange !== "any" && !withinRange(note.updatedAt, dateRange)) return false
      return true
    })
  }, [analyzed, sources, activeTag, dateRange])

  const activeFilterCount = sources.size + (activeTag ? 1 : 0) + (dateRange !== "any" ? 1 : 0)
  const hasQuery = query.trim().length > 0

  function toggleSource(type: SourceType) {
    setSources((prev) => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  function clearFilters() {
    setSources(new Set())
    setActiveTag(null)
    setDateRange("any")
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Semantic search across notes, transcripts, and image captions.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What are you looking for?"
            aria-label="Search query"
            className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-11 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
          />
          {input && (
            <button
              type="button"
              onClick={() => setInput("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {hasQuery && (
          <FilterBar
            show={showFilters}
            onToggleShow={() => setShowFilters((s) => !s)}
            activeFilterCount={activeFilterCount}
            sources={sources}
            onToggleSource={toggleSource}
            availableTags={availableTags}
            activeTag={activeTag}
            onSelectTag={setActiveTag}
            dateRange={dateRange}
            onSelectDate={setDateRange}
            onClear={clearFilters}
          />
        )}
      </div>

      {!hasQuery ? (
        <Hint />
      ) : isFetching ? (
        <ResultsSkeleton />
      ) : analyzed.length === 0 ? (
        <NoResults query={query} />
      ) : filtered.length === 0 ? (
        <NoFilterMatches onClear={clearFilters} />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "result" : "results"}
            {activeFilterCount > 0 ? " after filters" : ""} for “{query}”
          </p>
          {filtered.map(({ note, reasons }) => (
            <ResultRow key={note.id} note={note} reasons={reasons} query={query} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterBar(props: {
  show: boolean
  onToggleShow: () => void
  activeFilterCount: number
  sources: Set<SourceType>
  onToggleSource: (t: SourceType) => void
  availableTags: string[]
  activeTag: string | null
  onSelectTag: (t: string | null) => void
  dateRange: DateRange
  onSelectDate: (d: DateRange) => void
  onClear: () => void
}) {
  const {
    show,
    onToggleShow,
    activeFilterCount,
    sources,
    onToggleSource,
    availableTags,
    activeTag,
    onSelectTag,
    dateRange,
    onSelectDate,
    onClear,
  } = props

  const dateOptions: { value: DateRange; label: string }[] = [
    { value: "any", label: "Any time" },
    { value: "day", label: "Past day" },
    { value: "week", label: "Past week" },
    { value: "month", label: "Past month" },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleShow}
          aria-expanded={show}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            show || activeFilterCount > 0
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {show && (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <FilterGroup label="Source type">
            {(Object.keys(SOURCE_META) as SourceType[]).map((type) => {
              const { label, Icon, cls } = SOURCE_META[type]
              const active = sources.has(type)
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onToggleSource(type)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                    active ? cls + " ring-1 ring-current/30" : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3" />
                  {label}
                </button>
              )
            })}
          </FilterGroup>

          {availableTags.length > 0 && (
            <FilterGroup label="Tag">
              {availableTags.map((tag) => {
                const active = activeTag === tag
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onSelectTag(active ? null : tag)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                      active
                        ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    #{tag}
                  </button>
                )
              })}
            </FilterGroup>
          )}

          <FilterGroup label="Date">
            {dateOptions.map((opt) => {
              const active = dateRange === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onSelectDate(opt.value)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                    active
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </FilterGroup>
        </div>
      )}
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function ResultRow({ note, reasons, query }: { note: Note; reasons: MatchReason[]; query: string }) {
  // Lead with the strongest match for the snippet; fall back to the excerpt.
  const lead = reasons[0]
  const snippet = lead?.snippet ?? note.excerpt.slice(0, 160)
  const sourceTypes = useMemo(() => {
    const seen = new Set<SourceType>()
    const ordered: SourceType[] = []
    for (const r of reasons) {
      if (!seen.has(r.type)) {
        seen.add(r.type)
        ordered.push(r.type)
      }
    }
    return ordered
  }, [reasons])

  return (
    <Link
      to={`/note/${note.id}`}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-pretty font-semibold leading-snug tracking-tight">{note.title}</h2>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>

      {/* Source-type badges describing where the query matched */}
      {sourceTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {sourceTypes.map((type) => {
            const { label, Icon, cls } = SOURCE_META[type]
            return (
              <span
                key={type}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  cls,
                )}
              >
                <Icon className="size-3" />
                {label}
              </span>
            )
          })}
        </div>
      )}

      <p className="text-[13px] leading-relaxed text-muted-foreground">{highlight(snippet, query)}</p>

      {/* Human-readable match reason */}
      {lead && (
        <p className="text-[11px] text-muted-foreground/80">
          <span className="font-medium text-foreground/70">Matched in {lead.field}</span>
          {reasons.length > 1 && ` · +${reasons.length - 1} more`}
        </p>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <StatusBadge status={note.status} />
        {note.tags.slice(0, 3).map((t) => (
          <span key={t} className="rounded-md bg-muted px-1.5 py-0.5">
            #{t}
          </span>
        ))}
        <span className="ml-auto">{relativeTime(note.updatedAt)}</span>
      </div>
    </Link>
  )
}

/**
 * Determines which sources matched the query and builds a contextual snippet
 * for each. Order reflects match priority for the lead snippet.
 */
function getMatchReasons(note: Note, query: string): MatchReason[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const reasons: MatchReason[] = []
  const has = (s: string | undefined) => !!s && s.toLowerCase().includes(q)

  // Text: title / body / excerpt
  if (has(note.title)) {
    reasons.push({ type: "text", field: "the title", snippet: contextual(note.title, q) })
  }
  const body = `${note.excerpt} ${note.content}`.replace(/\s+/g, " ").trim()
  if (has(body)) {
    reasons.push({ type: "text", field: "the note body", snippet: contextual(body, q) })
  }

  // Voice transcripts
  for (const clip of note.audioClips) {
    if (has(clip.transcript) || has(clip.name)) {
      const source = has(clip.transcript) ? clip.transcript! : clip.name
      reasons.push({
        type: "voice",
        field: `a voice transcript (${clip.name})`,
        snippet: contextual(source, q),
      })
      break
    }
  }

  // Image captions
  for (const img of note.images) {
    if (has(img.caption) || has(img.alt)) {
      const source = has(img.caption) ? img.caption! : img.alt
      reasons.push({ type: "image", field: "an image caption", snippet: contextual(source, q) })
      break
    }
  }

  // AI summary / keywords
  if (has(note.aiSummary) || (note.aiKeywords ?? []).some((k) => k.toLowerCase().includes(q))) {
    const kw = (note.aiKeywords ?? []).find((k) => k.toLowerCase().includes(q))
    reasons.push({
      type: "summary",
      field: "the AI summary",
      snippet: note.aiSummary ? contextual(note.aiSummary, q) : `Keyword: ${kw}`,
    })
  }

  // Tags
  const tag = note.tags.find((t) => t.toLowerCase().includes(q))
  if (tag) {
    reasons.push({ type: "tag", field: `the tag #${tag}`, snippet: `Tagged #${tag}` })
  }

  // Fallback: matched somewhere generic
  if (reasons.length === 0) {
    reasons.push({ type: "text", field: "this note", snippet: note.excerpt.slice(0, 160) })
  }

  return reasons
}

function contextual(text: string, q: string) {
  const clean = text.replace(/\s+/g, " ").trim()
  const idx = clean.toLowerCase().indexOf(q)
  if (idx === -1) return clean.slice(0, 160)
  const start = Math.max(0, idx - 50)
  const end = Math.min(clean.length, idx + q.length + 90)
  return `${start > 0 ? "…" : ""}${clean.slice(start, end)}${end < clean.length ? "…" : ""}`
}

function withinRange(iso: string, range: DateRange): boolean {
  const age = Date.now() - new Date(iso).getTime()
  const day = 1000 * 60 * 60 * 24
  switch (range) {
    case "day":
      return age <= day
    case "week":
      return age <= day * 7
    case "month":
      return age <= day * 31
    default:
      return true
  }
}

function highlight(text: string, query: string) {
  const q = query.trim()
  if (!q) return text
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "ig"))
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="rounded bg-primary/20 px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function Hint() {
  const examples = ["calm software", "transcript", "RAG", "warm palette", "iA Writer"]
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="size-6" />
      </span>
      <div>
        <p className="font-medium">Search your whole notebook</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Text, voice transcripts, image captions, and AI summaries — all in one place.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {examples.map((e) => (
          <span key={e} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            {e}
          </span>
        ))}
      </div>
    </div>
  )
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Search className="size-6" />
      </span>
      <div>
        <p className="font-medium">No matches for “{query}”</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try fewer or different keywords — search also covers transcripts and captions.
        </p>
      </div>
    </div>
  )
}

function NoFilterMatches({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <SlidersHorizontal className="size-6" />
      </span>
      <div>
        <p className="font-medium">No results match your filters</p>
        <p className="mt-1 text-sm text-muted-foreground">
          There are matches for this search, but the active filters hide them.
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Clear filters
      </button>
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
      ))}
    </div>
  )
}
