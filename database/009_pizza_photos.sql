CREATE TABLE IF NOT EXISTS pizza_photos (
  id SERIAL PRIMARY KEY,
  pizza_id INTEGER NOT NULL REFERENCES pizzas(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pizza_photos_pizza_id_display_order_idx
ON pizza_photos (pizza_id, display_order, id);

INSERT INTO pizza_photos (
  pizza_id,
  image_path,
  alt_text,
  display_order
)
SELECT
  p.id,
  p.photo_path,
  p.name,
  0
FROM pizzas p
WHERE p.photo_path IS NOT NULL
  AND p.photo_path <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM pizza_photos pp
    WHERE pp.pizza_id = p.id
      AND pp.image_path = p.photo_path
  );
