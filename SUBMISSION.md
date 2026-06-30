# Mnemo — Publishing Kit (Demo Script + Devpost + Social)

Everything you need to record the video and submit. Written to match what is
actually built. Be honest where noted.

---

## 1. Demo Video Script (target < 3 min)

Tips: record at 1280×720+, do one practice run, keep the cursor calm. If a note
has audio, give the AI panel ~10-20s to fill in — narrate the architecture while
it processes. Have one note pre-recorded as a backup in case live AI is slow.

### [0:00–0:20] Hook + problem

> "Creators and coders capture ideas all day — in notes, voice memos, half-typed
> thoughts. The problem isn't capturing. It's finding them later, when you don't
> remember the exact words. This is Mnemo: a private AI notebook that lets you
> capture by writing, voice, and images, and find anything by meaning."

Show: landing page. Scroll once.

### [0:20–0:35] Open the editor

> "I'll capture a new thought. Mnemo gives you a calm writing surface with both
> rich text and Markdown."

Show: click New note. Type a title and a few Markdown lines about an idea (e.g.
"AWS hackathon architecture for an AI notebook"). Toggle Rich ↔ Markdown once.

### [0:35–0:55] Voice + image, captured locally

> "I can record a voice note — it's captured locally in the browser and never
> streamed. And I can attach an image for visual context."

Show: record a short (~5–8s) clip saying something searchable like "remember to
use Aurora Postgres and S3 for storage." Attach one image.

### [0:55–1:10] Durability / autosave

> "Notice the sync status. Everything is written to local storage as I go, so if
> I close the tab mid-thought, nothing is lost — it recovers and syncs when I
> come back."

Show: the sync status indicator. (Optional: refresh once to show recovery.)

### [1:10–1:30] Save + AI processing

> "When I'm done, Mnemo saves the note to the backend and runs an AI pass: it
> transcribes the audio, writes a summary, and extracts tags, entities, and
> action items."

Show: click Done → open the note. Point at the AI insights panel filling in:
summary, keywords, the transcript under the voice memo, the image caption.

### [1:30–2:00] Search by meaning

> "Now the payoff. I don't search for exact words — I search for the idea."

Show: go to Search. Type a vague phrase that wasn't typed verbatim but is in the
transcript / summary / tags (e.g. "database for the notebook"). Show the result
card with match-reason chips ("Voice transcript", "AI summary", "Tag") and the
highlighted snippet. Click into the note.

### [2:00–2:35] Architecture credibility

> "Under the hood: the frontend is a Vite + React PWA built with v0 and deployed
> on Vercel. The browser only talks to same-origin Vercel Functions — no AWS
> credentials in the client. Notes, transcripts, tags, entities, and processing
> jobs live in Amazon Aurora PostgreSQL. Raw audio and image thumbnails live
> privately in Amazon S3. The AI layer uses OpenAI Whisper for transcription and
> GPT for summaries, tags, entities, and image descriptions."

Show: README architecture diagram, or a simple slide. Optionally the Aurora and
S3 consoles for proof.

### [2:35–2:55] Close

> "Mnemo turns scattered thoughts — written, spoken, visual — into a private,
> searchable memory. I don't have to remember where I wrote something. I search
> by meaning, and the idea comes back."

Show: dashboard with the note(s).

---

## 2. One-Liner

> A private AI notebook for creators and coders that turns written thoughts,
> voice clips, and images into a searchable personal memory — powered by Amazon
> Aurora PostgreSQL, S3, and OpenAI.

---

## 3. Devpost Description

**Inspiration**
Creators, coders, and founders capture a flood of ideas across notes, voice
memos, and screenshots — then lose them, because search depends on remembering
exact keywords and tidy folders. We wanted capture to be effortless and recall
to work by meaning.

**What it does**
Mnemo is a mobile-first PWA for capturing thoughts as Markdown/WYSIWYG notes,
local voice recordings, and images. After a note is saved, an AI pass transcribes
the audio, writes a summary, and extracts tags, entities, and action items, plus
descriptions for images. You can then search across everything — including voice
transcripts and image captions — and each result explains why it matched. Notes
autosave locally and survive an abrupt close, syncing when you return.

**How we built it**

- Frontend: Vite + React PWA (v0-assisted UI), React Query for server state,
  React Context for local UI, IndexedDB for durable drafts and media blobs.
  Deployed on Vercel.
- Backend: same-origin Vercel Functions under `/api`. The browser never holds
  AWS credentials.
- Database: Amazon Aurora PostgreSQL is the system of record — notes, audio clip
  metadata, transcripts, AI summaries, tags, entities, image descriptions, and
  processing jobs.
- Storage: Amazon S3 holds raw audio and image thumbnails privately, served back
  through an ownership-checked media proxy.
- AWS auth: Vercel OIDC assumes an IAM role (RDS IAM auth + temporary S3
  credentials) — no long-lived AWS keys anywhere.
- AI: OpenAI Whisper for transcription, GPT for structured note intelligence and
  image descriptions. The pipeline falls back to deterministic local logic if a
  call fails, so the experience never hard-breaks.

**Database usage (required statement)**

> We used Amazon Aurora PostgreSQL as the system of record for notes, audio clip
> metadata, transcripts, AI-generated summaries, tags, entities, image
> descriptions, processing jobs, and search metadata. Media files are stored
> privately in Amazon S3.

**Challenges**
Lossless capture across abrupt closes (IndexedDB-first drafts + recovery sync),
keeping AWS access keyless via OIDC, and making search feel smart using
AI-generated metadata rather than exact keywords.

**What we'd do next**
Per-user authentication (the MVP uses a single server-side owner), vector
embeddings for semantic ranking, and presigned direct-to-S3 uploads for larger
media.

**Honesty note for judges (say this plainly):** authentication is not yet
multi-user. The backend enforces ownership server-side (the browser can't inject
a user id) and scopes all data to one owner, but for the MVP that owner is a
seeded demo user — so the deployed demo is single-tenant. Real per-user auth is
the first follow-up.

---

## 4. Submission Checklist

- [ ] Published Vercel app link.
- [ ] Vercel Team ID.
- [ ] AWS database named: **Amazon Aurora PostgreSQL**.
- [ ] Screenshot proving Aurora usage (RDS/Aurora console + a query/rows).
- [ ] Screenshot of S3 bucket (private).
- [ ] Screenshot of Vercel project / AWS integration.
- [ ] Demo video < 3 min, shows full capture → AI → search loop.
- [ ] Description explains problem, user, and AWS database usage.
- [ ] `OPENAI_API_KEY` and `S3_MEDIA_BUCKET` set in Vercel project env (unquoted).
- [ ] Production smoke test: create note + audio → AI fills in → search finds it.
- [ ] (Bonus) Blog/LinkedIn post with #H0Hackathon.

---

## 5. Short Social / Blog Post (optional bonus)

> Built **Mnemo** for #H0Hackathon: a private AI notebook that captures your
> thoughts as writing, voice, and images — then lets you find them by meaning,
> not exact keywords.
>
> Capture is local-first and survives an abrupt close. On save, it transcribes
> voice with OpenAI Whisper and extracts a summary, tags, entities, and action
> items with GPT. Search spans your text, transcripts, and image captions and
> tells you why each result matched.
>
> Stack: Vite + React PWA on Vercel → same-origin Vercel Functions → Amazon
> Aurora PostgreSQL + Amazon S3, with keyless AWS access via Vercel OIDC.
>
> Built with @v0, @vercel, and AWS. #H0Hackathon

---

## 6. 30-Second Pitch (if asked live)

> Mnemo is a private AI notebook. You capture ideas by typing, talking, or
> snapping a picture. It saves instantly and even recovers if you close the tab.
> Then AI transcribes your voice, summarizes the note, and pulls out tags and
> entities — so later you search by meaning and the idea comes right back. It
> runs on Vercel with Amazon Aurora PostgreSQL and S3, and OpenAI for the AI.
