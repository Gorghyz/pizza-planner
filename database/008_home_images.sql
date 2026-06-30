CREATE TABLE IF NOT EXISTS home_images (
  id SERIAL PRIMARY KEY,
  image_path TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  alt_text TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS home_images_single_active_idx
ON home_images (is_active)
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS home_images_created_at_idx
ON home_images (created_at DESC);