CREATE TABLE IF NOT EXISTS business_locations (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS business_opening_hours (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES business_locations(id) ON DELETE CASCADE,
  iso_weekday INTEGER NOT NULL CHECK (iso_weekday BETWEEN 1 AND 7),
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  opens_at TIME,
  closes_at TIME,
  CONSTRAINT business_opening_hours_unique UNIQUE (location_id, iso_weekday),
  CONSTRAINT business_opening_hours_times_check CHECK (
    (is_open = FALSE)
    OR
    (opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at)
  )
);

CREATE INDEX IF NOT EXISTS business_locations_active_idx
  ON business_locations(is_active, is_default, display_order);

CREATE INDEX IF NOT EXISTS business_opening_hours_location_idx
  ON business_opening_hours(location_id, iso_weekday);

DO $$
DECLARE
  default_location_id INTEGER;
BEGIN
  SELECT id
  INTO default_location_id
  FROM business_locations
  WHERE is_default = TRUE
  ORDER BY id
  LIMIT 1;

  IF default_location_id IS NULL THEN
    INSERT INTO business_locations (
      name,
      address,
      city,
      notes,
      is_active,
      is_default,
      display_order
    )
    VALUES (
      'A Table Tonton',
      '',
      '',
      '',
      TRUE,
      TRUE,
      10
    )
    RETURNING id INTO default_location_id;
  END IF;

  INSERT INTO business_opening_hours (
    location_id,
    iso_weekday,
    is_open,
    opens_at,
    closes_at
  )
  SELECT
    default_location_id,
    day_number,
    TRUE,
    '18:30'::time,
    '21:30'::time
  FROM generate_series(1, 7) AS day_number
  ON CONFLICT (location_id, iso_weekday) DO NOTHING;
END $$;