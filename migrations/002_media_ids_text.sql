ALTER TABLE audio_clips
  ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE image_assets
  ALTER COLUMN id TYPE TEXT USING id::text;
