CREATE TABLE IF NOT EXISTS business_events (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  service_date DATE NOT NULL,
  opens_at TIME NOT NULL DEFAULT '18:30',
  closes_at TIME NOT NULL DEFAULT '21:30',
  visible_from TIMESTAMP,
  order_opens_at TIMESTAMP,
  order_closes_at TIMESTAMP,
  location_id INTEGER REFERENCES business_locations(id) ON DELETE SET NULL,
  location_name TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  public_note TEXT NOT NULL DEFAULT '',
  capacity_pizzas INTEGER CHECK (capacity_pizzas IS NULL OR capacity_pizzas > 0),
  slot_capacity_pizzas INTEGER CHECK (slot_capacity_pizzas IS NULL OR slot_capacity_pizzas > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_events_status_service_date_idx
  ON business_events(status, service_date);

CREATE INDEX IF NOT EXISTS business_events_visible_from_idx
  ON business_events(visible_from);

CREATE TABLE IF NOT EXISTS business_event_pizzas (
  event_id INTEGER NOT NULL REFERENCES business_events(id) ON DELETE CASCADE,
  pizza_id INTEGER NOT NULL REFERENCES pizzas(id) ON DELETE RESTRICT,
  display_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (event_id, pizza_id)
);

CREATE INDEX IF NOT EXISTS business_event_pizzas_event_order_idx
  ON business_event_pizzas(event_id, display_order, pizza_id);

CREATE TABLE IF NOT EXISTS business_event_images (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES business_events(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_event_images_event_order_idx
  ON business_event_images(event_id, display_order, id);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES business_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_event_id_idx
  ON orders(event_id);

ALTER TABLE customer_requests
  ADD COLUMN IF NOT EXISTS service_date DATE NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE customer_requests
  ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES business_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS customer_requests_service_date_status_idx
  ON customer_requests(service_date, status, selected_slot);

CREATE INDEX IF NOT EXISTS customer_requests_event_id_idx
  ON customer_requests(event_id);
