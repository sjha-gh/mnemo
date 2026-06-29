CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL DEFAULT 'Untitled note',
  markdown_content TEXT NOT NULL DEFAULT '',
  rich_content_json JSONB,
  plain_text TEXT NOT NULL DEFAULT '',
  ai_summary TEXT,
  suggested_title TEXT,
  processing_status TEXT NOT NULL DEFAULT 'draft',
  sync_status TEXT NOT NULL DEFAULT 'synced',
  save_trigger TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_local_autosaved_at TIMESTAMPTZ,
  last_remote_synced_at TIMESTAMPTZ,
  memory_date DATE
);

CREATE TABLE IF NOT EXISTS audio_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  s3_key TEXT,
  name TEXT,
  duration_seconds INTEGER,
  mime_type TEXT,
  file_size_bytes INTEGER,
  transcript TEXT,
  transcript_status TEXT NOT NULL DEFAULT 'pending',
  raw_audio_deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS image_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  thumbnail_s3_key TEXT,
  original_s3_key TEXT,
  original_retained BOOLEAN NOT NULL DEFAULT false,
  ai_description TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE TABLE IF NOT EXISTS note_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  entity_type TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'queued',
  job_type TEXT NOT NULL,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_updated
  ON notes(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_processing_status
  ON notes(processing_status);

CREATE INDEX IF NOT EXISTS idx_audio_clips_note
  ON audio_clips(note_id);

CREATE INDEX IF NOT EXISTS idx_image_assets_note
  ON image_assets(note_id);

CREATE INDEX IF NOT EXISTS idx_note_entities_note
  ON note_entities(note_id);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_note
  ON processing_jobs(note_id);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_status
  ON processing_jobs(status);

CREATE INDEX IF NOT EXISTS idx_tags_user_name
  ON tags(user_id, name);
