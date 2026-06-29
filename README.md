# Mnemo

A private, AI-powered notebook for creators and coders. Capture thoughts as
Markdown/WYSIWYG notes, record audio locally in the browser, attach images, and
rediscover everything later through search. Built as a mobile-first PWA for the
H0 hackathon.

> Positioning: a personal thought-retrieval system. You don't have to remember
> where you wrote something or the exact words you used — you find it by meaning.

---

## 1. Tech Stack

| Layer            | Choice                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| Frontend         | Vite + React 19, React Router, mobile-first PWA                                                  |
| Server state     | TanStack React Query                                                                             |
| Local UI state   | React Context (theme, UI)                                                                        |
| Local durability | IndexedDB (drafts + media blobs)                                                                 |
| Hosting          | Vercel (static frontend + Vercel Functions under `/api`)                                         |
| Database         | Amazon Aurora PostgreSQL                                                                         |
| Object storage   | Amazon S3 (audio clips, image thumbnails/originals)                                              |
| AWS auth         | Vercel OIDC → AWS IAM role (no long-lived AWS keys)                                              |
| AI (planned)     | OpenAI — Whisper for transcription, GPT for summary/tags/entities, vision for image descriptions |

**Why this stack:** the frontend stays a pure React app (no Next.js coupling),
the browser only ever talks to same-origin `/api/*` functions, and those
functions hold all the privileged AWS/AI access. This keeps secrets server-side
and leaves a clean path to a future Expo React Native app that can share types,
the API client, and validation.

---

## 2. Architecture

```text
Browser (Vite + React PWA)
  - writes Markdown/WYSIWYG notes
  - records audio locally (MediaRecorder, never streamed)
  - attaches images
  - stores drafts + media blobs in IndexedDB first
        |
        | React Query → same-origin fetch
        v
Vercel Functions (/api/*)
  - authenticate() resolves the owner server-side
  - validate ownership, read env secrets
        |
        +--> Aurora PostgreSQL  (notes, media metadata, tags, entities, jobs)
        +--> Amazon S3          (raw audio, image thumbnails/originals)
        +--> AI provider        (transcribe / summarize / tag — see Milestone 7)
```

**Capture → persist → retrieve loop**

1. You type/record/attach. Every meaningful change is written to a local
   IndexedDB draft (so an abrupt close never loses work).
2. On Save (or recovery sync), the draft becomes a `POST /api/notes` payload.
   Media is sent as data URLs in the JSON body for MVP simplicity.
3. The function uploads media to S3, inserts the note + metadata into Aurora,
   and creates a processing job.
4. Reads (`/api/notes`, `/api/notes/:id`, `/api/search`) come back from Aurora;
   private media is streamed through `/api/media?key=...`.

---

## 3. What's Been Built (Milestone Status)

The build follows the milestones in `../HACKATHON_BUILD_PLAN.md`.

| #   | Milestone                                          | Status         |
| --- | -------------------------------------------------- | -------------- |
| 1   | Stabilize frontend (SPA routing, build)            | ✅ Done        |
| 2   | Durable local drafts (IndexedDB)                   | ✅ Done        |
| 3   | Backend API boundary (`api-client.ts` + functions) | ✅ Done        |
| 4   | Provision AWS + Vercel env                         | ✅ Done        |
| 5   | Replace mock persistence with Aurora + S3          | ✅ Done        |
| 6   | Auth / single-user ownership guard                 | ✅ Done        |
| 7   | Real AI processing (OpenAI)                        | ✅ Done        |
| 8   | Smarter search (match reasons, entity matching)    | ✅ Done        |
| 9   | Final hackathon polish                             | 🚧 In progress |

### Done in detail

**Durable local drafts (`src/lib/draft.ts`)** — an `active` draft is stored in
IndexedDB with title, content, tags, image data, audio clip metadata, a local
revision id, and a sync status. Audio/image blobs survive refresh and abrupt
close. Falls back to an in-memory draft if IndexedDB is unavailable.

**Draft recovery (`src/lib/pending-draft-sync.ts`, `src/pages/dashboard.tsx`)** —
on app open, a recoverable draft is detected and offered for resume / sync.
The local draft only clears after a successful backend save.

**Backend persistence (`api/_lib/notes.ts`, `api/_lib/db.ts`, `api/_lib/s3.ts`)**
— notes, audio clip metadata, image assets, tags, entities, and processing jobs
live in Aurora. Media bytes live in S3 and are served back through a private
`/api/media` proxy (never public URLs).

**Single-user ownership guard (Milestone 6 — see section 6).**

**Mock-mode safety indicator** — if any read silently falls back to in-memory
mock data (backend misconfigured, 401, AWS issue), the app shows an amber
"Running in mock mode" banner and logs a one-time console warning, so a
misconfiguration can't hide during a live demo.

### Not done yet

- **Real AI (Milestone 7):** `processNote()` is still mock — it derives a
  summary from the excerpt and naive keyword "entities". OpenAI (Whisper + GPT +
  vision) is the chosen provider; env wiring is in place (section 5).
- **Semantic search / embeddings:** search is Aurora keyword (`ILIKE`) matching
  across title, content, summary, tags, transcripts, and image descriptions.
- **Match-reason chips and final polish.**

---

## 4. Project Structure

```text
mnemo/
├─ api/                         # Vercel Functions (server-only, hold secrets)
│  ├─ _lib/
│  │  ├─ auth.ts                # resolves request owner (Milestone 6)
│  │  ├─ db.ts                  # Aurora pool via OIDC + RDS IAM auth
│  │  ├─ http.ts                # JSON/error helpers
│  │  ├─ notes.ts               # all note/media SQL, scoped by user_id
│  │  └─ s3.ts                  # private S3 upload/read
│  ├─ notes/
│  │  ├─ index.ts               # GET list / POST save
│  │  ├─ [id].ts                # GET note / PATCH autosave
│  │  └─ [id]/
│  │     ├─ process.ts          # POST trigger AI processing (mock for now)
│  │     └─ sync-media.ts       # POST queued-media sync boundary
│  ├─ media.ts                  # GET private media by S3 key (ownership-checked)
│  └─ search.ts                 # GET keyword search
├─ migrations/                  # SQL migrations (run with pnpm migrate)
├─ scripts/
│  ├─ migrate.mjs               # idempotent migration runner
│  └─ restore-env.mjs           # re-applies local-only secrets after vercel pull
├─ src/
│  ├─ components/               # layout, note card, status/ mock-mode banner, editor
│  ├─ context/                  # theme + UI providers
│  ├─ hooks/                    # use-notes (React Query), use-autosave, use-audio-recorder
│  ├─ lib/
│  │  ├─ api-client.ts          # frontend → /api boundary + mock fallback + mode flag
│  │  ├─ draft.ts               # IndexedDB local draft store
│  │  ├─ pending-draft-sync.ts  # draft → save payload
│  │  ├─ store.ts / mock-data.ts# in-memory mock backend (fallback/demo)
│  │  └─ types.ts               # shared types
│  └─ pages/                    # landing, dashboard, editor, search, note-detail
├─ vercel.json                  # SPA rewrite so deep links don't 404
└─ .env.local / .env.local2     # see section 5
```

---

## 5. Configuration & Environment

### Environment variables

Secrets live **only** in Vercel project env and the local `.env.local`. Never
prefix secrets with `VITE_` (that would expose them to the browser). The React
app only calls same-origin `/api/*`.

| Variable                                   | Used by                     | Source                                     |
| ------------------------------------------ | --------------------------- | ------------------------------------------ |
| `AWS_REGION`                               | db, s3                      | Vercel/AWS integration (`vercel env pull`) |
| `AWS_ROLE_ARN`                             | db, s3                      | Vercel/AWS integration                     |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE` | Aurora                      | Vercel/AWS integration                     |
| `PGSSLMODE` / `PGSSL_MODE`                 | Aurora SSL                  | env                                        |
| `S3_MEDIA_BUCKET`                          | media upload/read           | **manual** (see `.env.local2`)             |
| `OPENAI_API_KEY`                           | AI processing (Milestone 7) | **manual** (see `.env.local2`)             |
| `MNEMO_ACCESS_TOKEN`                       | optional API gate           | optional (see section 6)                   |
| `DEMO_USER_ID` / `DEMO_USER_EMAIL`         | owner identity              | optional override                          |

### The `.env.local2` pattern (important)

`vercel env pull .env.local` **overwrites** `.env.local` and drops any manually
added values like `S3_MEDIA_BUCKET` and `OPENAI_API_KEY`. To stop losing them:

1. Keep those keys in `.env.local2` (gitignored).
2. After any `vercel env pull`, run `pnpm restore-env` to merge them back into
   `.env.local`.

`restore-env` updates matching keys in place and appends missing ones, leaving
the Vercel-pulled values untouched.

> Reminder: `.env.local2` only fixes your **local** file. `S3_MEDIA_BUCKET` and
> `OPENAI_API_KEY` must also be set in the **Vercel project env** for the
> deployed functions.

### AWS connectivity (no static keys)

`db.ts` and `s3.ts` use the Vercel OIDC token to assume `AWS_ROLE_ARN`, then sign
an RDS IAM auth token for Postgres and use temporary credentials for S3. For
local runs, the OIDC token from `vercel env pull` must be allowed by the role's
trust policy (`migrate.mjs` prints help if the assume-role fails).

### SPA routing

`vercel.json` rewrites all paths to `/index.html` so deep links like `/app`,
`/search`, and `/note/:id` work on refresh.

---

## 6. Auth & Privacy Model (Milestone 6)

**Current model: single-user server-side ownership guard.**

- The **browser never sends a user id.** Every `/api/*` request runs
  `authenticate(req)` in `api/_lib/auth.ts`, which resolves the owner
  server-side.
- For the hackathon the owner is one seeded **demo user**
  (`00000000-0000-0000-0000-000000000001`, `demo@mnemo.app`), created by
  migration `003_demo_user_ownership.sql` and backfilled onto pre-existing rows.
- Every query in `notes.ts` is scoped by `user_id` (list, get, search, save,
  autosave, process). Media access via `/api/media` verifies the requested S3
  key belongs to a note the owner owns.

**What this means honestly (good to state in the presentation):**

- There is **no login yet**. Everyone who opens the deployed URL shares the same
  demo notebook. "Private" here means the backend is not publicly exposed and
  the browser can't inject arbitrary ids — not per-person isolation.
- **Upgrade path:** real per-user auth (Clerk / Auth.js) plugs into
  `authenticate()` without touching the route handlers. The whole API can also
  be locked behind a shared secret immediately by setting `MNEMO_ACCESS_TOKEN`
  (sent as `Authorization: Bearer …`, `x-mnemo-access` header, or `mnemo_access`
  cookie). If you set that token without wiring it into the client, reads will
  silently fall back to mock data and saves will fail — so leave it unset until
  the client sends it.

---

## 7. Data Model (Aurora PostgreSQL)

Created by `migrations/001_initial_schema.sql`, `002_media_ids_text.sql`,
`003_demo_user_ownership.sql`.

- `users` — workspace owner.
- `notes` — title, `markdown_content`, `plain_text`, `ai_summary`,
  `processing_status`, `sync_status`, `save_trigger`, timestamps, `user_id`.
- `audio_clips` — per-note audio metadata: `s3_key`, duration, mime, size,
  `transcript`, `transcript_status`.
- `image_assets` — `thumbnail_s3_key`, `original_s3_key`, `original_retained`,
  `ai_description`.
- `tags` + `note_tags` — normalized tags and the note↔tag join.
- `note_entities` — extracted people/tools/projects/etc. (currently mock keywords).
- `processing_jobs` — tracks AI work status per note.

---

## 8. API Endpoints

All endpoints authenticate and scope to the resolved owner.

| Method | Path                        | Purpose                                     |
| ------ | --------------------------- | ------------------------------------------- |
| GET    | `/api/notes`                | List the owner's notes                      |
| POST   | `/api/notes`                | Save a note (+ media as data URLs)          |
| GET    | `/api/notes/:id`            | Get one note with media/tags/summary        |
| PATCH  | `/api/notes/:id`            | Autosave note text                          |
| POST   | `/api/notes/:id/process`    | Run AI processing (mock today)              |
| POST   | `/api/notes/:id/sync-media` | Queued-media sync boundary                  |
| GET    | `/api/search?q=…`           | Keyword search across note fields           |
| GET    | `/api/media?key=…`          | Stream private S3 media (ownership-checked) |

---

## 9. Local Development

Prereqs: Node 20+, `pnpm`, and access to the project's Vercel/AWS env.

```bash
pnpm install                      # install dependencies

pnpm dlx vercel env pull .env.local   # pull AWS/Postgres/OIDC env from Vercel
pnpm restore-env                      # re-apply S3_MEDIA_BUCKET + OPENAI_API_KEY

pnpm migrate                          # apply DB migrations (idempotent)

pnpm dev                              # Vite dev server (frontend only)
pnpm dlx vercel dev                   # frontend + /api functions together
```

Build & verify:

```bash
pnpm build                            # production frontend build
pnpm dlx vercel build --yes           # also compiles the api/ functions
```

> Note: `pnpm dev` serves the React app only. To exercise the real `/api`
> functions (Aurora/S3), use `vercel dev` or the deployed environment. Without
> a reachable backend the app falls back to mock data and shows the mock-mode
> banner.

---

## 10. Deployment

The project deploys on Vercel from GitHub. After pushing:

1. Ensure Vercel project env has `S3_MEDIA_BUCKET` and `OPENAI_API_KEY` (plus the
   AWS/Postgres integration vars).
2. Ensure migrations are applied to the production database (`pnpm migrate` runs
   against the `PGHOST` in `.env.local`; there is a single prod database).
3. Vercel builds the frontend and the `/api` functions automatically.

---

## 11. Known Limitations / Next Steps

- **AI is mock (Milestone 7 next):** wire OpenAI Whisper (transcription) and GPT
  (summary/tags/entities/action items) + vision (image descriptions). Keep the
  mock as a demo-safe fallback.
- **Media transport:** media is sent as data URLs inside JSON for MVP. Move to
  presigned direct-to-S3 uploads for larger files.
- **Search:** keyword only; add match-reason chips and optional pgvector
  embeddings for semantic retrieval.
- **Auth:** single shared demo user; add real per-user auth for true privacy.
- **Bundle size:** Vite warns the main chunk is >500 kB (not blocking for the
  hackathon).

---

## 12. Presentation Cheat-Sheet

- **Problem:** creators/coders lose ideas because search depends on exact
  keywords and tidy folders.
- **Product:** capture by writing, voice, and images; find later by meaning.
- **Frontend:** v0-assisted Vite + React PWA on Vercel; React Query + IndexedDB
  for offline-safe, refresh-safe, abrupt-close-safe drafts.
- **Backend:** same-origin Vercel Functions → Amazon Aurora PostgreSQL (system
  of record) + Amazon S3 (private media), with AWS access via Vercel OIDC (no
  static keys).
- **Privacy:** the browser never decides ownership; the server does. Single demo
  owner for the MVP, with a clean path to real auth.
- **Reliability:** if the backend is misconfigured, the app degrades to mock
  data and visibly says so — nothing silently breaks on stage.
