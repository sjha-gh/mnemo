-- Milestone 6: single-user hackathon ownership guard.
--
-- The browser never supplies a user id. The backend resolves the owner of every
-- request server-side. For the hackathon MVP that owner is a single, stable
-- demo user. This migration seeds that user and backfills any existing
-- ownerless rows so all content is scoped to one owner.

INSERT INTO users (id, email, name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo@mnemo.app',
  'Mnemo Demo User'
)
ON CONFLICT (id) DO NOTHING;

-- Backfill content created before ownership existed.
UPDATE notes
  SET user_id = '00000000-0000-0000-0000-000000000001'
  WHERE user_id IS NULL;

UPDATE audio_clips
  SET user_id = '00000000-0000-0000-0000-000000000001'
  WHERE user_id IS NULL;

UPDATE image_assets
  SET user_id = '00000000-0000-0000-0000-000000000001'
  WHERE user_id IS NULL;

UPDATE note_entities
  SET user_id = '00000000-0000-0000-0000-000000000001'
  WHERE user_id IS NULL;

UPDATE processing_jobs
  SET user_id = '00000000-0000-0000-0000-000000000001'
  WHERE user_id IS NULL;
