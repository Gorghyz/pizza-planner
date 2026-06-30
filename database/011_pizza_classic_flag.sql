ALTER TABLE pizzas
  ADD COLUMN IF NOT EXISTS is_classic BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE pizzas
SET is_classic = TRUE
WHERE is_classic = FALSE
  AND COALESCE(seasonality, '') NOT ILIKE '%saison%'
  AND COALESCE(seasonality, '') NOT ILIKE '%season%';
