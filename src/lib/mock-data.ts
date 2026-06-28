import type { Note } from "./types"

const now = Date.now()
const hour = 1000 * 60 * 60
const day = hour * 24

function iso(offset: number) {
  return new Date(now - offset).toISOString()
}

export const initialNotes: Note[] = [
  {
    id: "n_arc",
    title: "The architecture of calm software",
    content: `# The architecture of calm software

Calm software respects attention. It does not demand it.

## Principles

- **One primary action** per screen
- Generous whitespace as a feature, not an afterthought
- Motion that *explains*, never decorates

> The best interface is the one that disappears once you understand it.

I keep returning to iA Writer for this — the cursor, the typography, the focus mode. Everything else gets out of the way.

\`\`\`ts
const focus = (mode: "compose" | "read") =>
  mode === "compose" ? hideChrome() : showProse()
\`\`\`

Next: sketch how Mnemo's editor can feel this quiet.`,
    excerpt:
      "Calm software respects attention. It does not demand it. One primary action per screen, generous whitespace, motion that explains.",
    tags: ["design", "writing", "product"],
    status: "indexed",
    createdAt: iso(day * 2),
    updatedAt: iso(hour * 5),
    pinned: true,
    audioClips: [
      {
        id: "a1",
        name: "Voice memo · morning walk",
        durationSec: 74,
        createdAt: iso(day * 2),
        transcript:
          "Thinking about how the editor should feel weightless... maybe the toolbar fades when you start typing.",
      },
    ],
    images: [
      {
        id: "img1",
        url: "/images/calm-desk.png",
        alt: "A tidy writing desk at golden hour with a laptop showing a text editor",
        caption:
          "A calm writing desk at golden hour — laptop with a focused text editor, coffee, and a paper notebook.",
      },
    ],
    aiSummary:
      "A reflection on designing calm, attention-respecting software, anchored in iA Writer's focus philosophy and a plan to apply it to Mnemo's editor.",
    aiKeywords: ["calm technology", "focus mode", "typography", "whitespace", "editor UX"],
  },
  {
    id: "n_rag",
    title: "Notes → searchable memory (RAG sketch)",
    content: `# Notes → searchable memory

Rough plan for turning saved notes into an AI-indexed memory layer.

1. On save, chunk the markdown by heading
2. Embed each chunk + transcript + image caption
3. Store vectors with note metadata
4. Search = embed query, rank chunks, group by note

The magic is **multi-modal**: a voice memo and a photo can answer the same question as text.`,
    excerpt:
      "Rough plan for turning saved notes into an AI-indexed memory layer: chunk, embed, store, rank. The magic is multi-modal.",
    tags: ["ai", "engineering", "search"],
    status: "indexed",
    createdAt: iso(day * 3),
    updatedAt: iso(day * 1),
    audioClips: [],
    images: [],
    aiSummary:
      "An engineering sketch for a retrieval-augmented memory system that embeds text, transcripts, and image captions for multi-modal search.",
    aiKeywords: ["RAG", "embeddings", "vector search", "multi-modal", "chunking"],
  },
  {
    id: "n_ship",
    title: "Shipping ritual",
    content: `# Shipping ritual

Small list I read before every release.

- Does it work offline?
- Is the empty state delightful?
- Can I undo the scariest action?
- Would I show this to someone I admire?`,
    excerpt: "Small list I read before every release. Offline? Delightful empty state? Undo? Proud?",
    tags: ["product", "process"],
    status: "processing",
    createdAt: iso(hour * 8),
    updatedAt: iso(hour * 2),
    audioClips: [
      { id: "a2", name: "Voice memo · idea", durationSec: 31, createdAt: iso(hour * 8) },
    ],
    images: [],
  },
  {
    id: "n_color",
    title: "Warm palettes for focus",
    content: `# Warm palettes for focus

Cool greys feel clinical at night. A warm paper tone + a single amber accent reads softer for long writing sessions.

Testing oklch values to keep contrast accessible in both themes.`,
    excerpt:
      "Cool greys feel clinical at night. A warm paper tone plus a single amber accent reads softer for long writing sessions.",
    tags: ["design", "color"],
    status: "indexed",
    createdAt: iso(day * 5),
    updatedAt: iso(day * 4),
    audioClips: [],
    images: [],
    aiSummary: "Argues for warm paper backgrounds with a single amber accent over clinical cool greys for long-form focus.",
    aiKeywords: ["color theory", "oklch", "accessibility", "dark mode"],
  },
  {
    id: "n_draft",
    title: "Untitled — keyboard-first capture",
    content: `Half-formed: what if pressing Space twice in the title drops you straight into the body? Keyboard-first all the way down.`,
    excerpt: "Half-formed: keyboard-first capture. Space twice in the title drops you into the body.",
    tags: ["ideas"],
    status: "draft",
    createdAt: iso(hour * 1),
    updatedAt: iso(hour * 1),
    audioClips: [],
    images: [],
  },
  {
    id: "n_read",
    title: "Reading list — interfaces that age well",
    content: `# Interfaces that age well

- Things 3 — the gold standard for restraint
- Linear — speed as a design value
- Raycast — command-driven everything
- iA Writer — typography as product`,
    excerpt: "Things 3, Linear, Raycast, iA Writer — interfaces that age well through restraint and speed.",
    tags: ["inspiration", "reading"],
    status: "indexed",
    createdAt: iso(day * 7),
    updatedAt: iso(day * 6),
    audioClips: [],
    images: [],
    aiSummary: "A curated reading list of products admired for restraint, speed, and typography.",
    aiKeywords: ["inspiration", "Linear", "Raycast", "iA Writer", "restraint"],
  },
]
