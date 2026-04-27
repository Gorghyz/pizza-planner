ALTER TABLE business_locations
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'business_locations_latitude_check'
  ) THEN
    ALTER TABLE business_locations
    ADD CONSTRAINT business_locations_latitude_check
    CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'business_locations_longitude_check'
  ) THEN
    ALTER TABLE business_locations
    ADD CONSTRAINT business_locations_longitude_check
    CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
  END IF;
END $$;