CREATE TABLE IF NOT EXISTS business_calendar_exceptions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_date DATE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),
  title TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  location_id INTEGER REFERENCES business_locations(id) ON DELETE SET NULL,
  location_name TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  opens_at TIME,
  closes_at TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_calendar_exceptions_times_check CHECK (
    status = 'closed'
    OR
    (opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at)
  )
);

CREATE INDEX IF NOT EXISTS business_calendar_exceptions_service_date_idx
  ON business_calendar_exceptions(service_date);
