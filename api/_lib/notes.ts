import type pg from "pg";
import type {
  AudioClip,
  ImageMemory,
  Note,
  NoteStatus,
} from "../../src/lib/types";
import { query, withTransaction } from "./db.js";
import { getObjectBuffer, getObjectDataUrl, uploadDataUrl } from "./s3.js";
import {
  analyzeNote,
  describeImage,
  isAiEnabled,
  transcribeAudio,
} from "./ai.js";

type NoteRow = {
  id: string;
  title: string;
  markdown_content: string;
  plain_text: string;
  ai_summary: string | null;
  processing_status: string;
  created_at: string;
  updated_at: string;
  tags: string[] | null;
  audio_clips: AudioClip[] | null;
  images: ImageMemory[] | null;
  ai_keywords: string[] | null;
};

export type SaveNoteInput = {
  id?: string;
  title: string;
  content: string;
  tags: string[];
  audioClips: AudioClip[];
  images: ImageMemory[];
};

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/[#>*_`~\-[\]()!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(markdown: string) {
  return stripMarkdown(markdown).slice(0, 160) || "No content yet.";
}

function statusFromDb(status: string): NoteStatus {
  if (
    status === "processing" ||
    status === "indexed" ||
    status === "queued" ||
    status === "draft"
  ) {
    return status;
  }
  return "draft";
}

export function mapNote(row: NoteRow): Note {
  const content = row.markdown_content ?? "";
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
    aiKeywords: row.ai_keywords ?? undefined,
  };
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
    ) AS images,
    COALESCE(
      (
        SELECT json_agg(ne.value ORDER BY ne.created_at)
        FROM (
          SELECT DISTINCT ON (lower(value)) value, created_at
          FROM note_entities
          WHERE note_id = n.id AND entity_type <> 'action_item'
          ORDER BY lower(value), created_at
        ) ne
      ),
      '[]'::json
    ) AS ai_keywords
  FROM notes n
`;

export async function listNotes(userId: string) {
  const result = await query<NoteRow>(
    `${noteSelect} WHERE n.user_id = $1 ORDER BY n.updated_at DESC`,
    [userId],
  );
  return result.rows.map(mapNote);
}

export async function getNote(id: string, userId: string) {
  const result = await query<NoteRow>(
    `${noteSelect} WHERE n.id = $1 AND n.user_id = $2`,
    [id, userId],
  );
  return result.rows[0] ? mapNote(result.rows[0]) : null;
}

/** Lightweight ownership check used to gate access to private media objects. */
export async function noteBelongsToUser(noteId: string, userId: string) {
  const result = await query<{ id: string }>(
    "SELECT id FROM notes WHERE id = $1 AND user_id = $2 LIMIT 1",
    [noteId, userId],
  );
  return result.rowCount ? result.rowCount > 0 : false;
}

export async function searchNotes(q: string, userId: string) {
  const search = `%${q.trim()}%`;
  const result = await query<NoteRow>(
    `
      ${noteSelect}
      WHERE
        n.user_id = $2
        AND (
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
          OR EXISTS (
            SELECT 1
            FROM note_entities ne
            WHERE ne.note_id = n.id AND ne.value ILIKE $1
          )
        )
      ORDER BY n.updated_at DESC
    `,
    [search, userId],
  );
  return result.rows.map(mapNote);
}

async function replaceTags(
  client: pg.PoolClient,
  noteId: string,
  tags: string[],
) {
  await client.query("DELETE FROM note_tags WHERE note_id = $1", [noteId]);

  for (const rawTag of tags) {
    const name = rawTag.trim().replace(/^#/, "");
    if (!name) continue;

    let tagId: string;
    const existing = await client.query<{ id: string }>(
      "SELECT id FROM tags WHERE user_id IS NULL AND lower(name) = lower($1) LIMIT 1",
      [name],
    );

    if (existing.rows[0]) {
      tagId = existing.rows[0].id;
    } else {
      const created = await client.query<{ id: string }>(
        "INSERT INTO tags (name) VALUES ($1) RETURNING id",
        [name],
      );
      tagId = created.rows[0].id;
    }

    await client.query(
      "INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [noteId, tagId],
    );
  }
}

async function replaceAudioClips(
  client: pg.PoolClient,
  noteId: string,
  userId: string,
  clips: AudioClip[],
) {
  await client.query("DELETE FROM audio_clips WHERE note_id = $1", [noteId]);

  for (const clip of clips) {
    const s3Key = clip.dataUrl
      ? await uploadDataUrl({
          dataUrl: clip.dataUrl,
          key: `audio/${noteId}/${clip.id}-${clip.name.replace(/[^a-z0-9.-]+/gi, "-").toLowerCase()}.webm`,
        })
      : clip.s3Key;

    await client.query(
      `
        INSERT INTO audio_clips (
          id,
          note_id,
          user_id,
          s3_key,
          name,
          duration_seconds,
          mime_type,
          file_size_bytes,
          transcript,
          transcript_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        clip.id,
        noteId,
        userId,
        s3Key,
        clip.name,
        Math.round(clip.durationSec ?? 0),
        clip.mimeType ?? "audio/webm",
        clip.fileSizeBytes ?? null,
        clip.transcript ?? null,
        clip.transcript ? "complete" : "pending",
      ],
    );
  }
}

async function replaceImages(
  client: pg.PoolClient,
  noteId: string,
  userId: string,
  images: ImageMemory[],
) {
  await client.query("DELETE FROM image_assets WHERE note_id = $1", [noteId]);

  for (const image of images) {
    const originalS3Key = image.url?.startsWith("data:")
      ? await uploadDataUrl({
          dataUrl: image.url,
          key: `images/${noteId}/${image.id}`,
        })
      : image.originalS3Key;

    await client.query(
      `
        INSERT INTO image_assets (
          id,
          note_id,
          user_id,
          thumbnail_s3_key,
          original_s3_key,
          original_retained,
          ai_description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        image.id,
        noteId,
        userId,
        image.thumbnailS3Key ?? originalS3Key,
        originalS3Key,
        image.originalRetained ?? false,
        image.caption ?? image.alt ?? null,
      ],
    );
  }
}

export async function saveNote(input: SaveNoteInput, userId: string) {
  const noteId = await withTransaction(async (client) => {
    const title = input.title.trim() || "Untitled note";
    const plainText = stripMarkdown(input.content);
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
            WHERE id = $1 AND user_id = $5
            RETURNING id
          `,
          [input.id, title, input.content, plainText, userId],
        )
      : await client.query<{ id: string }>(
          `
            INSERT INTO notes (
              user_id,
              title,
              markdown_content,
              plain_text,
              processing_status,
              sync_status,
              save_trigger,
              last_remote_synced_at
            )
            VALUES ($1, $2, $3, $4, 'queued', 'synced', 'manual', now())
            RETURNING id
          `,
          [userId, title, input.content, plainText],
        );

    const savedNoteId = noteResult.rows[0]?.id;
    if (!savedNoteId) throw new Error("Could not save note");

    await replaceTags(client, savedNoteId, input.tags ?? []);
    await replaceAudioClips(
      client,
      savedNoteId,
      userId,
      input.audioClips ?? [],
    );
    await replaceImages(client, savedNoteId, userId, input.images ?? []);

    return savedNoteId;
  });

  return getNote(noteId, userId);
}

export async function autosaveNote(
  id: string,
  input: Partial<SaveNoteInput>,
  userId: string,
) {
  const title = input.title?.trim() || "Untitled note";
  const content = input.content ?? "";
  const plainText = stripMarkdown(content);

  const result = await query(
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
      WHERE id = $1 AND user_id = $5
    `,
    [id, title, content, plainText, userId],
  );

  if (!result.rowCount) return null;

  return getNote(id, userId);
}

function mockKeywords(note: Note) {
  const words = note.content
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4);
  return [...new Set([...words.slice(0, 5), ...note.tags])].slice(0, 8);
}

function mockSummary(note: Note) {
  return note.excerpt.length > 12
    ? `AI summary · ${note.excerpt.slice(0, 120)}${note.excerpt.length > 120 ? "…" : ""}`
    : "AI summary will appear once this note has more content.";
}

/** Transcribe any audio clips that have an S3 object but no transcript yet. */
async function transcribeNoteAudio(
  note: Note,
  userId: string,
): Promise<string[]> {
  const transcripts: string[] = [];
  for (const clip of note.audioClips) {
    if (clip.transcript) {
      transcripts.push(clip.transcript);
      continue;
    }
    if (!clip.s3Key) continue;

    const media = await getObjectBuffer(clip.s3Key);
    if (!media) continue;

    const text = await transcribeAudio(
      media.buffer,
      `${clip.name || clip.id}.webm`,
      clip.mimeType ?? media.contentType,
    );
    if (!text) continue;

    transcripts.push(text);
    await query(
      "UPDATE audio_clips SET transcript = $2, transcript_status = 'complete' WHERE id = $1 AND user_id = $3",
      [clip.id, text, userId],
    );
  }
  return transcripts;
}

/** Generate descriptions for any images that don't have one yet. */
async function describeNoteImages(
  note: Note,
  userId: string,
): Promise<string[]> {
  const descriptions: string[] = [];
  for (const image of note.images) {
    if (image.caption) {
      descriptions.push(image.caption);
      continue;
    }
    const key = image.originalS3Key ?? image.thumbnailS3Key;
    if (!key) continue;

    const dataUrl = await getObjectDataUrl(key);
    if (!dataUrl) continue;

    const description = await describeImage(dataUrl);
    if (!description) continue;

    descriptions.push(description);
    await query(
      "UPDATE image_assets SET ai_description = $2 WHERE id = $1 AND user_id = $3",
      [image.id, description, userId],
    );
  }
  return descriptions;
}

export async function processNote(id: string, userId: string) {
  const note = await getNote(id, userId);
  if (!note) return null;

  await query(
    "UPDATE notes SET processing_status = 'processing', updated_at = now() WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  const job = await query<{ id: string }>(
    `
      INSERT INTO processing_jobs (note_id, user_id, status, job_type, started_at)
      VALUES ($1, $2, 'processing', $3, now())
      RETURNING id
    `,
    [id, userId, isAiEnabled() ? "openai_index" : "mock_ai_index"],
  );
  const jobId = job.rows[0]?.id;

  let summary = mockSummary(note);
  let tags = note.tags;
  let entities: { type: string; value: string }[] = mockKeywords(note).map(
    (value) => ({
      type: "keyword",
      value,
    }),
  );
  let actionItems: string[] = [];
  let usedAi = false;
  let jobError: string | null = null;

  if (isAiEnabled()) {
    try {
      // External AI work happens outside any DB transaction (slow + networked).
      const transcripts = await transcribeNoteAudio(note, userId);
      const descriptions = await describeNoteImages(note, userId);

      const combined = [
        note.title,
        note.content,
        ...transcripts,
        ...descriptions,
      ]
        .filter(Boolean)
        .join("\n\n");

      const analysis = await analyzeNote(combined);
      if (analysis && analysis.summary) {
        usedAi = true;
        summary = analysis.summary;
        tags = [...new Set([...note.tags, ...analysis.tags])];
        entities = analysis.entities.length
          ? analysis.entities
          : analysis.tags.map((value) => ({ type: "content_topic", value }));
        actionItems = analysis.actionItems;
      } else {
        jobError = "AI analysis returned no result; used fallback.";
      }
    } catch (error) {
      jobError =
        error instanceof Error
          ? error.message
          : "AI processing failed; used fallback.";
    }
  }

  await withTransaction(async (client) => {
    await replaceTags(client, id, tags);

    await client.query("DELETE FROM note_entities WHERE note_id = $1", [id]);
    for (const entity of entities) {
      await client.query(
        `
          INSERT INTO note_entities (note_id, user_id, entity_type, value, confidence)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [id, userId, entity.type, entity.value, usedAi ? 0.9 : 0.6],
      );
    }
    for (const item of actionItems) {
      await client.query(
        `
          INSERT INTO note_entities (note_id, user_id, entity_type, value, confidence)
          VALUES ($1, $2, 'action_item', $3, 0.9)
        `,
        [id, userId, item],
      );
    }

    await client.query(
      "UPDATE notes SET processing_status = 'indexed', ai_summary = $2, updated_at = now() WHERE id = $1 AND user_id = $3",
      [id, summary, userId],
    );

    if (jobId) {
      await client.query(
        `
          UPDATE processing_jobs
          SET status = $2, error_message = $3, completed_at = now()
          WHERE id = $1
        `,
        [jobId, jobError ? "completed_with_fallback" : "completed", jobError],
      );
    }
  });

  return getNote(id, userId);
}
