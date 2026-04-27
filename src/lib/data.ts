import { pool, query } from "@/lib/db";
import {
  buildTodayServiceSettings,
  createDefaultWeekHours,
  sortOpeningHours,
  WEEKDAYS,
} from "@/lib/business-settings";
import {
  DEFAULT_SERVICE_CLOSING_TIME,
  DEFAULT_SERVICE_OPENING_TIME,
} from "@/lib/config";
import type {
  BusinessLocation,
  CustomerRequest,
  CustomerRequestItem,
  CustomerRequestStatus,
  DraftItem,
  LocationWithHours,
  OccupancyOrder,
  OpeningHour,
  OrderStatus,
  Pizza,
  TodayOrder,
  TodayServiceSettings,
} from "@/lib/types";

const pizzaSelectFields = `
  id,
  name,
  active,
  display_order AS "displayOrder",
  prep_minutes AS "prepMinutes",
  ingredients,
  description,
  allergens,
  photo_path AS "photoPath",
  price_cents AS "priceCents",
  seasonality
`;

const customerRequestSelectFields = `
  id,
  customer_name AS "customerName",
  customer_phone AS "customerPhone",
  TO_CHAR(desired_time, 'HH24:MI') AS "desiredTime",
  TO_CHAR(selected_slot, 'HH24:MI') AS "selectedSlot",
  notes,
  item_summary AS "itemSummary",
  total_pizzas AS "totalPizzas",
  total_price_cents AS "totalPriceCents",
  total_minutes AS "totalMinutes",
  source,
  status,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS "createdAt"
`;

const businessLocationSelectFields = `
  id,
  name,
  address,
  city,
  notes,
  latitude,
  longitude,
  is_active AS "isActive",
  is_default AS "isDefault",
  display_order AS "displayOrder"
`;

const openingHourSelectFields = `
  id,
  location_id AS "locationId",
  iso_weekday AS "isoWeekday",
  is_open AS "isOpen",
  TO_CHAR(opens_at, 'HH24:MI') AS "opensAt",
  TO_CHAR(closes_at, 'HH24:MI') AS "closesAt"
`;

export type CustomerRequestForConversion = {
  id: number;
  customerName: string;
  customerPhone: string;
  desiredTime: string;
  selectedSlot: string;
  notes: string | null;
  itemSummary: string;
  totalPizzas: number;
  totalPriceCents: number;
  totalMinutes: number;
  source: "desktop" | "mobile";
  status: CustomerRequestStatus;
  itemsJson: CustomerRequestItem[];
};

type CreateOrderInput = {
  customerName: string;
  desiredTime: string;
  promisedTime: string;
  notes: string;
  totalMinutes: number;
  items: DraftItemWithMinutes[];
};

type DraftItemWithMinutes = DraftItem & {
  unitMinutes: number;
};

type PizzaWriteInput = {
  name: string;
  prepMinutes: number;
  ingredients: string;
  description: string;
  allergens: string;
  active: boolean;
  photoPath: string | null;
  priceCents: number;
  seasonality: string;
};

type CreateCustomerRequestInput = {
  customerName: string;
  customerPhone: string;
  desiredTime: string;
  selectedSlot: string;
  notes: string;
  itemSummary: string;
  itemsJson: CustomerRequestItem[];
  totalPizzas: number;
  totalPriceCents: number;
  totalMinutes: number;
  source: "desktop" | "mobile";
};

type BusinessLocationWriteInput = {
  name: string;
  address: string;
  city: string;
  notes: string;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  isDefault: boolean;
};

type OpeningHourWriteInput = {
  isoWeekday: number;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

function sortLocations(locations: LocationWithHours[]): LocationWithHours[] {
  return [...locations].sort((a, b) => {
    if (a.isDefault !== b.isDefault) {
      return a.isDefault ? -1 : 1;
    }

    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }

    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }

    return a.name.localeCompare(b.name, "fr");
  });
}

function attachHoursToLocations(
  locations: BusinessLocation[],
  hours: OpeningHour[],
): LocationWithHours[] {
  const hoursByLocationId = new Map<number, OpeningHour[]>();

  for (const hour of hours) {
    const current = hoursByLocationId.get(hour.locationId) ?? [];
    current.push(hour);
    hoursByLocationId.set(hour.locationId, current);
  }

  return sortLocations(
    locations.map((location) => ({
      ...location,
      hours: sortOpeningHours(
        hoursByLocationId.get(location.id) ?? createDefaultWeekHours(location.id),
      ),
    })),
  );
}

export async function getActivePizzas(): Promise<Pizza[]> {
  const result = await query<Pizza>(`
    SELECT
      ${pizzaSelectFields}
    FROM pizzas
    WHERE active = TRUE
    ORDER BY display_order, name;
  `);

  return result.rows;
}

export async function getAllPizzasForAdmin(): Promise<Pizza[]> {
  const result = await query<Pizza>(`
    SELECT
      ${pizzaSelectFields}
    FROM pizzas
    ORDER BY active DESC, display_order, name;
  `);

  return result.rows;
}

export async function getPizzasByIds(ids: number[]): Promise<Pizza[]> {
  if (ids.length === 0) {
    return [];
  }

  const result = await query<Pizza>(
    `
      SELECT
        ${pizzaSelectFields}
      FROM pizzas
      WHERE id = ANY($1::int[])
      ORDER BY display_order, name;
    `,
    [ids],
  );

  return result.rows;
}

export async function getTodayOccupancy(): Promise<OccupancyOrder[]> {
  const result = await query<OccupancyOrder>(`
    SELECT
      id,
      TO_CHAR(promised_time, 'HH24:MI') AS "promisedTime",
      total_minutes AS "totalMinutes"
    FROM orders
    WHERE service_date = CURRENT_DATE
    ORDER BY promised_time, id;
  `);

  return result.rows;
}

export async function getTodayOrders(): Promise<TodayOrder[]> {
  const result = await query<TodayOrder>(`
    SELECT
      o.id,
      o.customer_name AS "customerName",
      TO_CHAR(o.desired_time, 'HH24:MI') AS "desiredTime",
      TO_CHAR(o.promised_time, 'HH24:MI') AS "promisedTime",
      o.total_minutes AS "totalMinutes",
      o.notes,
      o.status,
      STRING_AGG(
        CASE
          WHEN COALESCE(oi.comment, '') <> ''
            THEN oi.quantity || ' x ' || p.name || ' (' || oi.comment || ')'
          ELSE oi.quantity || ' x ' || p.name
        END,
        ', ' ORDER BY p.display_order, p.name
      ) AS "itemSummary"
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN pizzas p ON p.id = oi.pizza_id
    WHERE o.service_date = CURRENT_DATE
    GROUP BY
      o.id,
      o.customer_name,
      o.desired_time,
      o.promised_time,
      o.total_minutes,
      o.notes,
      o.status
    ORDER BY o.promised_time, o.id;
  `);

  return result.rows;
}

export async function getCustomerRequests(): Promise<CustomerRequest[]> {
  const result = await query<CustomerRequest>(`
    SELECT
      ${customerRequestSelectFields}
    FROM customer_requests
    ORDER BY
      CASE status
        WHEN 'new' THEN 0
        WHEN 'contacted' THEN 1
        ELSE 2
      END,
      created_at DESC;
  `);

  return result.rows;
}

export async function getCustomerRequestByIdForConversion(
  requestId: number,
): Promise<CustomerRequestForConversion | null> {
  const result = await query<CustomerRequestForConversion>(
    `
      SELECT
        id,
        customer_name AS "customerName",
        customer_phone AS "customerPhone",
        TO_CHAR(desired_time, 'HH24:MI') AS "desiredTime",
        TO_CHAR(selected_slot, 'HH24:MI') AS "selectedSlot",
        notes,
        item_summary AS "itemSummary",
        total_pizzas AS "totalPizzas",
        total_price_cents AS "totalPriceCents",
        total_minutes AS "totalMinutes",
        source,
        status,
        items_json AS "itemsJson"
      FROM customer_requests
      WHERE id = $1;
    `,
    [requestId],
  );

  return result.rows[0] ?? null;
}

export async function getBusinessLocations(): Promise<BusinessLocation[]> {
  const result = await query<BusinessLocation>(`
    SELECT
      ${businessLocationSelectFields}
    FROM business_locations
    ORDER BY is_default DESC, is_active DESC, display_order, name;
  `);

  return result.rows;
}

export async function getOpeningHoursForLocation(
  locationId: number,
): Promise<OpeningHour[]> {
  const result = await query<OpeningHour>(
    `
      SELECT
        ${openingHourSelectFields}
      FROM business_opening_hours
      WHERE location_id = $1
      ORDER BY iso_weekday;
    `,
    [locationId],
  );

  return sortOpeningHours(result.rows);
}

export async function getBusinessLocationsWithHours(): Promise<LocationWithHours[]> {
  const [locations, hours] = await Promise.all([
    getBusinessLocations(),
    query<OpeningHour>(`
      SELECT
        ${openingHourSelectFields}
      FROM business_opening_hours
      ORDER BY location_id, iso_weekday;
    `),
  ]);

  return attachHoursToLocations(locations, hours.rows);
}

export async function getPublicLocationsWithHours(): Promise<LocationWithHours[]> {
  const [locations, hours] = await Promise.all([
    query<BusinessLocation>(`
      SELECT
        ${businessLocationSelectFields}
      FROM business_locations
      WHERE is_active = TRUE
      ORDER BY is_default DESC, display_order, name;
    `),
    query<OpeningHour>(`
      SELECT
        ${openingHourSelectFields}
      FROM business_opening_hours
      ORDER BY location_id, iso_weekday;
    `),
  ]);

  return attachHoursToLocations(locations.rows, hours.rows);
}

export async function getTodayServiceSettings(): Promise<TodayServiceSettings> {
  const locations = await getBusinessLocationsWithHours();

  return buildTodayServiceSettings(locations);
}

export async function createPizza(input: PizzaWriteInput): Promise<Pizza> {
  const result = await query<Pizza>(
    `
      WITH next_order AS (
        SELECT COALESCE(MAX(display_order), 0) + 10 AS value
        FROM pizzas
      )
      INSERT INTO pizzas (
        name,
        active,
        display_order,
        prep_minutes,
        ingredients,
        description,
        allergens,
        photo_path,
        price_cents,
        seasonality
      )
      SELECT
        $1,
        $2,
        next_order.value,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9
      FROM next_order
      RETURNING
        ${pizzaSelectFields};
    `,
    [
      input.name,
      input.active,
      input.prepMinutes,
      input.ingredients,
      input.description,
      input.allergens,
      input.photoPath,
      input.priceCents,
      input.seasonality,
    ],
  );

  return result.rows[0];
}

export async function updatePizza(
  pizzaId: number,
  input: PizzaWriteInput,
): Promise<Pizza | null> {
  const result = await query<Pizza>(
    `
      UPDATE pizzas
      SET
        name = $2,
        active = $3,
        prep_minutes = $4,
        ingredients = $5,
        description = $6,
        allergens = $7,
        photo_path = $8,
        price_cents = $9,
        seasonality = $10
      WHERE id = $1
      RETURNING
        ${pizzaSelectFields};
    `,
    [
      pizzaId,
      input.name,
      input.active,
      input.prepMinutes,
      input.ingredients,
      input.description,
      input.allergens,
      input.photoPath,
      input.priceCents,
      input.seasonality,
    ],
  );

  return result.rows[0] ?? null;
}

export async function togglePizzaActive(pizzaId: number): Promise<Pizza | null> {
  const result = await query<Pizza>(
    `
      UPDATE pizzas
      SET active = NOT active
      WHERE id = $1
      RETURNING
        ${pizzaSelectFields};
    `,
    [pizzaId],
  );

  return result.rows[0] ?? null;
}

export async function createBusinessLocation(
  input: BusinessLocationWriteInput,
): Promise<BusinessLocation> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<BusinessLocation>(
      `
        WITH next_order AS (
          SELECT COALESCE(MAX(display_order), 0) + 10 AS value
          FROM business_locations
        )
        INSERT INTO business_locations (
          name,
          address,
          city,
          notes,
          latitude,
          longitude,
          is_active,
          is_default,
          display_order
        )
        SELECT
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          next_order.value
        FROM next_order
        RETURNING
          ${businessLocationSelectFields};
      `,
      [
        input.name,
        input.address,
        input.city,
        input.notes,
        input.latitude,
        input.longitude,
        input.isActive,
        input.isDefault,
      ],
    );

    const location = result.rows[0];

    if (input.isDefault) {
      await client.query(
        `
          UPDATE business_locations
          SET is_default = FALSE
          WHERE id <> $1;
        `,
        [location.id],
      );
    }

    for (const day of WEEKDAYS) {
      await client.query(
        `
          INSERT INTO business_opening_hours (
            location_id,
            iso_weekday,
            is_open,
            opens_at,
            closes_at
          )
          VALUES ($1, $2, TRUE, $3::time, $4::time)
          ON CONFLICT (location_id, iso_weekday) DO NOTHING;
        `,
        [
          location.id,
          day.value,
          DEFAULT_SERVICE_OPENING_TIME,
          DEFAULT_SERVICE_CLOSING_TIME,
        ],
      );
    }

    await client.query("COMMIT");

    return {
      ...location,
      isDefault: input.isDefault,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateBusinessLocation(
  locationId: number,
  input: BusinessLocationWriteInput,
): Promise<BusinessLocation | null> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (input.isDefault) {
      await client.query(
        `
          UPDATE business_locations
          SET is_default = FALSE
          WHERE id <> $1;
        `,
        [locationId],
      );
    }

    const result = await client.query<BusinessLocation>(
      `
        UPDATE business_locations
        SET
          name = $2,
          address = $3,
          city = $4,
          notes = $5,
          latitude = $6,
          longitude = $7,
          is_active = $8,
          is_default = $9
        WHERE id = $1
        RETURNING
          ${businessLocationSelectFields};
      `,
      [
        locationId,
        input.name,
        input.address,
        input.city,
        input.notes,
        input.latitude,
        input.longitude,
        input.isActive,
        input.isDefault,
      ],
    );

    await client.query("COMMIT");

    return result.rows[0] ?? null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function saveOpeningHours(
  locationId: number,
  hours: OpeningHourWriteInput[],
): Promise<OpeningHour[]> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const hour of hours) {
      await client.query(
        `
          INSERT INTO business_opening_hours (
            location_id,
            iso_weekday,
            is_open,
            opens_at,
            closes_at
          )
          VALUES (
            $1,
            $2,
            $3,
            CASE WHEN $3 THEN $4::time ELSE NULL END,
            CASE WHEN $3 THEN $5::time ELSE NULL END
          )
          ON CONFLICT (location_id, iso_weekday)
          DO UPDATE SET
            is_open = EXCLUDED.is_open,
            opens_at = EXCLUDED.opens_at,
            closes_at = EXCLUDED.closes_at;
        `,
        [
          locationId,
          hour.isoWeekday,
          hour.isOpen,
          hour.opensAt,
          hour.closesAt,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getOpeningHoursForLocation(locationId);
}

export async function createCustomerRequest(
  input: CreateCustomerRequestInput,
): Promise<CustomerRequest> {
  const result = await query<CustomerRequest>(
    `
      INSERT INTO customer_requests (
        customer_name,
        customer_phone,
        desired_time,
        selected_slot,
        notes,
        item_summary,
        items_json,
        total_pizzas,
        total_price_cents,
        total_minutes,
        source
      )
      VALUES (
        $1,
        $2,
        $3::time,
        $4::time,
        $5,
        $6,
        $7::jsonb,
        $8,
        $9,
        $10,
        $11
      )
      RETURNING
        ${customerRequestSelectFields};
    `,
    [
      input.customerName,
      input.customerPhone,
      input.desiredTime,
      input.selectedSlot,
      input.notes || null,
      input.itemSummary,
      JSON.stringify(input.itemsJson),
      input.totalPizzas,
      input.totalPriceCents,
      input.totalMinutes,
      input.source,
    ],
  );

  return result.rows[0];
}

export async function updateCustomerRequestStatus(
  requestId: number,
  status: CustomerRequestStatus,
): Promise<boolean> {
  const result = await query(
    `
      UPDATE customer_requests
      SET status = $2
      WHERE id = $1;
    `,
    [requestId, status],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function updateOrderStatus(
  orderId: number,
  status: OrderStatus,
): Promise<boolean> {
  const result = await query(
    `
      UPDATE orders
      SET status = $2
      WHERE id = $1;
    `,
    [orderId, status],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function createOrder(input: CreateOrderInput): Promise<number> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderResult = await client.query<{ id: number }>(
      `
        INSERT INTO orders (
          service_date,
          customer_name,
          desired_time,
          promised_time,
          total_minutes,
          notes
        )
        VALUES (
          CURRENT_DATE,
          $1,
          $2::time,
          $3::time,
          $4,
          $5
        )
        RETURNING id;
      `,
      [
        input.customerName,
        input.desiredTime,
        input.promisedTime,
        input.totalMinutes,
        input.notes || null,
      ],
    );

    const orderId = orderResult.rows[0].id;

    for (const item of input.items) {
      await client.query(
        `
          INSERT INTO order_items (
            order_id,
            pizza_id,
            quantity,
            unit_minutes,
            comment
          )
          VALUES ($1, $2, $3, $4, $5);
        `,
        [
          orderId,
          item.pizzaId,
          item.quantity,
          item.unitMinutes,
          item.comment?.trim() || null,
        ],
      );
    }

    await client.query("COMMIT");

    return orderId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}