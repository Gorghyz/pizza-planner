DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS pizzas;

CREATE TABLE pizzas (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  prep_minutes INTEGER NOT NULL CHECK (prep_minutes > 0)
);

CREATE TABLE orders (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name TEXT NOT NULL,
  desired_time TIME NOT NULL,
  promised_time TIME NOT NULL,
  total_minutes INTEGER NOT NULL CHECK (total_minutes > 0),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'ready', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  pizza_id INTEGER NOT NULL REFERENCES pizzas(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_minutes INTEGER NOT NULL CHECK (unit_minutes > 0),
  comment TEXT
);

CREATE INDEX orders_service_date_promised_idx
  ON orders(service_date, promised_time);

CREATE INDEX order_items_order_id_idx
  ON order_items(order_id);

INSERT INTO pizzas (name, display_order, prep_minutes) VALUES
  ('Margherita', 10, 4),
  ('Reine', 20, 5),
  ('4 Fromages', 30, 5),
  ('Végétarienne', 40, 6),
  ('Calzone', 50, 7);