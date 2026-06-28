import { Link } from "react-router-dom"
import {
  ArrowRight,
  ArrowUpRight,
  ImageIcon,
  Lock,
  Mic,
  PenLine,
  Sparkles,
  WifiOff,
} from "lucide-react"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"

export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Capture />
        <AiSection />
        <Cta />
      </main>
      <SiteFooter />
    </div>
  )
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 pt-[env(safe-area-inset-top)]">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#capture" className="transition-colors hover:text-foreground">
            Capture
          </a>
          <a href="#intelligence" className="transition-colors hover:text-foreground">
            Intelligence
          </a>
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            Open Mnemo
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* subtle warm glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[420px] w-[680px] -translate-x-1/2 rounded-full opacity-30 blur-[120px]"
        style={{ background: "radial-gradient(closest-side, var(--primary), transparent)" }}
      />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-5 pt-20 pb-14 text-center sm:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Private AI notebook
        </span>
        <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Capture the thought.{" "}
          <span className="font-serif italic text-primary">Mnemo remembers</span> the rest.
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          A calm, focused notebook for creators and coders. Write, speak, or snap a memory — Mnemo
          turns everything you save into a searchable, AI-indexed mind.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            to="/new"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            Start writing
            <PenLine className="size-4" />
          </Link>
          <Link
            to="/app"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-medium transition-colors hover:bg-accent"
          >
            Explore the notebook
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="size-3.5" /> Private by default
          </span>
          <span className="inline-flex items-center gap-1.5">
            <WifiOff className="size-3.5" /> Works offline
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5" /> AI-indexed on save
          </span>
        </div>
      </div>

      <EditorPreview />
    </section>
  )
}

function EditorPreview() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-10">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/5">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-full bg-muted" />
            <span className="size-2.5 rounded-full bg-muted" />
            <span className="size-2.5 rounded-full bg-muted" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            <Sparkles className="size-3" /> Indexed
          </span>
        </div>
        <div className="px-6 py-6 text-left font-mono text-[13px] leading-relaxed sm:px-10 sm:py-8">
          <p className="text-lg font-semibold tracking-tight">The architecture of calm software</p>
          <p className="mt-3 text-muted-foreground">
            <span className="text-primary"># </span>Principles
          </p>
          <p className="mt-1 text-muted-foreground">
            - One <span className="text-foreground">primary action</span> per screen
          </p>
          <p className="text-muted-foreground">- Whitespace as a feature, not an afterthought</p>
          <p className="mt-3 border-l-2 border-primary pl-3 italic text-muted-foreground">
            The best interface disappears once you understand it.
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block size-2 animate-pulse rounded-full bg-primary" />
            Draft autosaved · just now
          </p>
        </div>
      </div>
    </div>
  )
}

const captureModes = [
  {
    icon: PenLine,
    title: "Write",
    body: "A keyboard-first editor with WYSIWYG and a focused Markdown mode that feels like iA Writer.",
  },
  {
    icon: Mic,
    title: "Speak",
    body: "Record voice clips inline. Multiple takes per note, transcribed when you save.",
  },
  {
    icon: ImageIcon,
    title: "Snap",
    body: "Attach lightweight image memories. Mnemo captions them so they're searchable too.",
  },
]

function Capture() {
  return (
    <section id="capture" className="mx-auto max-w-5xl px-5 py-20">
      <div className="max-w-xl">
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Three ways in. One quiet place.
        </h2>
        <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
          Thoughts rarely arrive as tidy text. Capture them however they come — Mnemo keeps the
          friction near zero.
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {captureModes.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function AiSection() {
  return (
    <section id="intelligence" className="border-y border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 py-20 md:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" /> Indexed on save
          </span>
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Your notes become a searchable memory.
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            When you save — or when you leave the page — Mnemo quietly processes your note. Text,
            transcripts, and image captions all become searchable, so you can find a half-remembered
            idea by describing it.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Automatic summaries and keywords",
              "Multi-modal search across text, voice, and images",
              "Autosave on exit, navigation, and tab close",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-primary">
                  <Sparkles className="size-3" />
                </span>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-background p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Search
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
            <Sparkles className="size-4 text-primary" />
            <span className="text-muted-foreground">that idea about warm color palettes…</span>
          </div>
          <div className="mt-4 space-y-2">
            {[
              { t: "Warm palettes for focus", s: "Image caption + text match" },
              { t: "The architecture of calm software", s: "Voice transcript match" },
            ].map((r) => (
              <div
                key={r.t}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{r.t}</p>
                  <p className="text-xs text-muted-foreground">{r.s}</p>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Cta() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-24 text-center">
      <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
        A quieter place to think.
      </h2>
      <p className="mx-auto mt-4 max-w-md text-pretty leading-relaxed text-muted-foreground">
        Install Mnemo to your home screen and capture ideas the moment they arrive.
      </p>
      <Link
        to="/new"
        className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-7 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
      >
        Write your first note
        <ArrowRight className="size-4" />
      </Link>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row">
        <Logo />
        <p>Mnemo — a private AI notebook. Mock preview.</p>
      </div>
    </footer>
  )
}
