import type pg from "pg"
import type { AudioClip, ImageMemory, Note, NoteStatus } from "../../src/lib/types"
import { query, withTransaction } from "./db"
import { uploadDataUrl } from "./s3"

type NoteRow = {
  id: string
  title: string
  markdown_content: string
  plain_text: string
  ai_summary: string | null
  processing_status: string
  created_at: string
  updated_at: string
  tags: string[] | null
  audio_clips: AudioClip[] | null
  images: ImageMemory[] | null
}

export type SaveNoteInput = {
  id?: string
  title: string
  content: string
  tags: string[]
  audioClips: AudioClip[]
  images: ImageMemory[]
}

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/[#>*_`~\-[\]()!]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function excerpt(markdown: string) {
  return stripMarkdown(markdown).slice(0, 160) || "No content yet."
}

function statusFromDb(status: string): NoteStatus {
  if (status === "processing" || status === "indexed" || status === "queued" || status === "draft") {
    return status
  }
  return "draft"
}

export function mapNote(row: NoteRow): Note {
  const content = row.markdown_content ?? ""
  return {
    id: row.id,
    title: row.title,
    content,
    excerpt: row.plain_text?.slice(0, 160) || excerpt(content),
    tags: row.tags ?? [],
    status: statusFromDb(row.processing_status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    audioClips: row.audio_clips ?? [],
    images: row.images ?? [],
    aiSummary: row.ai_summary ?? undefined,
  }
}

const noteSelect = `
  SELECT
    n.id,
    n.title,
    n.markdown_content,
    n.plain_text,
    n.ai_summary,
    n.processing_status,
    n.created_at,
    n.updated_at,
    COALESCE(
      (
        SELECT json_agg(t.name ORDER BY t.name)
        FROM note_tags nt
        JOIN tags t ON t.id = nt.tag_id
        WHERE nt.note_id = n.id
      ),
      '[]'::json
    ) AS tags,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', ac.id,
            'name', ac.name,
            'durationSec', ac.duration_seconds,
            'createdAt', ac.created_at,
            'mimeType', ac.mime_type,
            'fileSizeBytes', ac.file_size_bytes,
            's3Key', ac.s3_key,
            'url', CASE WHEN ac.s3_key IS NULL THEN NULL ELSE '/api/media?key=' || ac.s3_key END,
            'transcript', ac.transcript
          )
          ORDER BY ac.created_at
        )
        FROM audio_clips ac
        WHERE ac.note_id = n.id
      ),
      '[]'::json
    ) AS audio_clips,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', ia.id,
            'url', CASE
              WHEN COALESCE(ia.thumbnail_s3_key, ia.original_s3_key) IS NULL THEN ''
              ELSE '/api/media?key=' || COALESCE(ia.thumbnail_s3_key, ia.original_s3_key)
            END,
            'alt', COALESCE(ia.ai_description, 'Image memory'),
            'caption', ia.ai_description,
            'thumbnailS3Key', ia.thumbnail_s3_key,
            'originalS3Key', ia.original_s3_key,
            'originalRetained', ia.original_retained
          )
          ORDER BY ia.created_at
        )
        FROM image_assets ia
        WHERE ia.note_id = n.id
      ),
      '[]'::json
    ) AS images
  FROM notes n
`

export async function listNotes() {
  const result = await query<NoteRow>(`${noteSelect} ORDER BY n.updated_at DESC`)
  return result.rows.map(mapNote)
}

export async function getNote(id: string) {
  const result = await query<NoteRow>(`${noteSelect} WHERE n.id = $1`, [id])
  return result.rows[0] ? mapNote(result.rows[0]) : null
}

export async function searchNotes(q: string) {
  const search = `%${q.trim()}%`
  const result = await query<NoteRow>(
    `
      ${noteSelect}
      WHERE
        n.title ILIKE $1
        OR n.markdown_content ILIKE $1
        OR n.plain_text ILIKE $1
        OR COALESCE(n.ai_summary, '') ILIKE $1
        OR EXISTS (
          SELECT 1
          FROM note_tags nt
          JOIN tags t ON t.id = nt.tag_id
          WHERE nt.note_id = n.id AND t.name ILIKE $1
        )
        OR EXISTS (
          SELECT 1
          FROM audio_clips ac
          WHERE ac.note_id = n.id AND COALESCE(ac.transcript, '') ILIKE $1
        )
        OR EXISTS (
          SELECT 1
          FROM image_assets ia
          WHERE ia.note_id = n.id AND COALESCE(ia.ai_description, '') ILIKE $1
        )
      ORDER BY n.updated_at DESC
    `,
    [search],
  )
  return result.rows.map(mapNote)
}

async function replaceTags(client: pg.PoolClient, noteId: string, tags: string[]) {
  await client.query("DELETE FROM note_tags WHERE note_id = $1", [noteId])

  for (const rawTag of tags) {
    const name = rawTag.trim().replace(/^#/, "")
    if (!name) continue

    let tagId: string
    const existing = await client.query<{ id: string }>(
      "SELECT id FROM tags WHERE user_id IS NULL AND lower(name) = lower($1) LIMIT 1",
      [name],
    )

    if (existing.rows[0]) {
      tagId = existing.rows[0].id
    } else {
      const created = await client.query<{ id: string }>(
        "INSERT INTO tags (name) VALUES ($1) RETURNING id",
        [name],
      )
      tagId = created.rows[0].id
    }

    await client.query(
      "INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [noteId, tagId],
    )
  }
}

async function replaceAudioClips(client: pg.PoolClient, noteId: string, clips: AudioClip[]) {
  await client.query("DELETE FROM audio_clips WHERE note_id = $1", [noteId])

  for (const clip of clips) {
    const s3Key =
      clip.dataUrl
        ? await uploadDataUrl({
            dataUrl: clip.dataUrl,
            key: `audio/${noteId}/${clip.id}-${clip.name.replace(/[^a-z0-9.-]+/gi, "-").toLowerCase()}.webm`,
          })
        : clip.s3Key

    await client.query(
      `
        INSERT INTO audio_clips (
          id,
          note_id,
          s3_key,
          name,
          duration_seconds,
          mime_type,
          file_size_bytes,
          transcript,
          transcript_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        clip.id,
        noteId,
        s3Key,
        clip.name,
        Math.round(clip.durationSec ?? 0),
        clip.mimeType ?? "audio/webm",
        clip.fileSizeBytes ?? null,
        clip.transcript ?? null,
        clip.transcript ? "complete" : "pending",
      ],
    )
  }
}

async function replaceImages(client: pg.PoolClient, noteId: string, images: ImageMemory[]) {
  await client.query("DELETE FROM image_assets WHERE note_id = $1", [noteId])

  for (const image of images) {
    const originalS3Key =
      image.url?.startsWith("data:")
        ? await uploadDataUrl({
            dataUrl: image.url,
            key: `images/${noteId}/${image.id}`,
          })
        : image.originalS3Key

    await client.query(
      `
        INSERT INTO image_assets (
          id,
          note_id,
          thumbnail_s3_key,
          original_s3_key,
          original_retained,
          ai_description
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        image.id,
        noteId,
        image.thumbnailS3Key ?? originalS3Key,
        originalS3Key,
        image.originalRetained ?? false,
        image.caption ?? image.alt ?? null,
      ],
    )
  }
}

export async function saveNote(input: SaveNoteInput) {
  const noteId = await withTransaction(async (client) => {
    const title = input.title.trim() || "Untitled note"
    const plainText = stripMarkdown(input.content)
    const noteResult = input.id
      ? await client.query<{ id: string }>(
          `
            UPDATE notes
            SET
              title = $2,
              markdown_content = $3,
              plain_text = $4,
              processing_status = 'queued',
              sync_status = 'synced',
              save_trigger = 'manual',
              updated_at = now(),
              last_remote_synced_at = now()
            WHERE id = $1
            RETURNING id
          `,
          [input.id, title, input.content, plainText],
        )
      : await client.query<{ id: string }>(
          `
            INSERT INTO notes (
              title,
              markdown_content,
              plain_text,
              processing_status,
              sync_status,
              save_trigger,
              last_remote_synced_at
            )
            VALUES ($1, $2, $3, 'queued', 'synced', 'manual', now())
            RETURNING id
          `,
          [title, input.content, plainText],
        )

    const savedNoteId = noteResult.rows[0]?.id
    if (!savedNoteId) throw new Error("Could not save note")

    await replaceTags(client, savedNoteId, input.tags ?? [])
    await replaceAudioClips(client, savedNoteId, input.audioClips ?? [])
    await replaceImages(client, savedNoteId, input.images ?? [])

    return savedNoteId
  })

  return getNote(noteId)
}

export async function autosaveNote(id: string, input: Partial<SaveNoteInput>) {
  const title = input.title?.trim() || "Untitled note"
  const content = input.content ?? ""
  const plainText = stripMarkdown(content)

  await query(
    `
      UPDATE notes
      SET
        title = $2,
        markdown_content = $3,
        plain_text = $4,
        sync_status = 'synced',
        save_trigger = 'exit_autosave',
        updated_at = now(),
        last_remote_synced_at = now()
      WHERE id = $1
    `,
    [id, title, content, plainText],
  )

  return getNote(id)
}

export async function processNote(id: string) {
  const note = await getNote(id)
  if (!note) return null

  const words = note.content
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4)
  const keywords = [...new Set([...words.slice(0, 5), ...note.tags])].slice(0, 8)
  const summary =
    note.excerpt.length > 12
      ? `AI summary · ${note.excerpt.slice(0, 120)}${note.excerpt.length > 120 ? "…" : ""}`
      : "AI summary will appear once this note has more content."

  await withTransaction(async (client) => {
    await client.query("UPDATE notes SET processing_status = 'processing', updated_at = now() WHERE id = $1", [id])
    await client.query(
      `
        INSERT INTO processing_jobs (note_id, status, job_type, started_at)
        VALUES ($1, 'processing', 'mock_ai_index', now())
      `,
      [id],
    )
    await client.query(
      "UPDATE notes SET processing_status = 'indexed', ai_summary = $2, updated_at = now() WHERE id = $1",
      [id, summary],
    )
    for (const keyword of keywords) {
      await client.query(
        `
          INSERT INTO note_entities (note_id, entity_type, value, confidence)
          VALUES ($1, 'keyword', $2, 0.6)
        `,
        [id, keyword],
      )
    }
  })

  return getNote(id)
}
