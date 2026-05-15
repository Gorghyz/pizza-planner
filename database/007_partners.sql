CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'partenaire',
  description TEXT NOT NULL DEFAULT '',
  photo_path TEXT,
  contact_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  contact_address TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT partners_category_check CHECK (
    category IN ('producteur', 'distributeur', 'partenaire')
  )
);

CREATE INDEX IF NOT EXISTS partners_active_display_idx
  ON partners (is_active DESC, display_order, name);

CREATE INDEX IF NOT EXISTS partners_category_idx
  ON partners (category);