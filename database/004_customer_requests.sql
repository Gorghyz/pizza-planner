CREATE TABLE IF NOT EXISTS customer_requests (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  desired_time TIME NOT NULL,
  selected_slot TIME NOT NULL,
  notes TEXT,
  item_summary TEXT NOT NULL,
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_pizzas INTEGER NOT NULL CHECK (total_pizzas > 0),
  total_price_cents INTEGER NOT NULL CHECK (total_price_cents >= 0),
  total_minutes INTEGER NOT NULL CHECK (total_minutes > 0),
  source TEXT NOT NULL DEFAULT 'desktop'
    CHECK (source IN ('desktop', 'mobile')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_requests_status_created_idx
  ON customer_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS customer_requests_selected_slot_idx
  ON customer_requests(selected_slot);