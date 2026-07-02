import { pool, query } from "@/lib/db";
import { applyCalendarExceptionToServiceSettings, getCalendarExceptionForDate } from "@/lib/business-calendar";
import { formatDateLong, getParisDateString } from "@/lib/dates";
import {
  buildServiceSettingsForDate,
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
  PizzaPhoto,
  TodayOrder,
  TodayServiceSettings,
} from "@/lib/types";

const PARIS_TIME_ZONE_SQL = "Europe/Paris";
const PARIS_CURRENT_DATE_SQL = `(NOW() AT TIME ZONE '${PARIS_TIME_ZONE_SQL}')::date`;

const pizzaSelectFields = `
  id,
  name,
  active,
  is_classic AS "isClassic",
  display_order AS "displayOrder",
  prep_minutes AS "prepMinutes",
  ingredients,
  description,
  allergens,
  photo_path AS "photoPath",
  price_cents AS "priceCents",
  seasonality
`;

const pizzaPhotoSelectFields = `
  id,
  pizza_id AS "pizzaId",
  image_path AS "imagePath",
  alt_text AS "altText",
  display_order AS "displayOrder"
`;

const customerRequestSelectFields = `
  cr.id,
  TO_CHAR(cr.service_date, 'YYYY-MM-DD') AS "serviceDate",
  cr.event_id AS "eventId",
  be.title AS "eventTitle",
  cr.customer_name AS "customerName",
  cr.customer_phone AS "customerPhone",
  TO_CHAR(cr.desired_time, 'HH24:MI') AS "desiredTime",
  TO_CHAR(cr.selected_slot, 'HH24:MI') AS "selectedSlot",
  cr.notes,
  cr.item_summary AS "itemSummary",
  cr.total_pizzas AS "totalPizzas",
  cr.total_price_cents AS "totalPriceCents",
  cr.total_minutes AS "totalMinutes",
  cr.source,
  cr.status,
  TO_CHAR(cr.created_at AT TIME ZONE '${PARIS_TIME_ZONE_SQL}', 'YYYY-MM-DD') AS "createdDate",
  TO_CHAR(cr.created_at AT TIME ZONE '${PARIS_TIME_ZONE_SQL}', 'DD/MM/YYYY HH24:MI') AS "createdAt"
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
  serviceDate: string;
  eventId: number | null;
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
  serviceDate?: string;
  eventId?: number | null;
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
  isClassic: boolean;
  photoPath: string | null;
  priceCents: number;
  seasonality: string;
};

type PizzaPhotoWriteInput = {
  id?: number;
  imagePath: string;
  altText: string;
  displayOrder: number;
};

type CreateCustomerRequestInput = {
  serviceDate: string;
  eventId?: number | null;
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


function sortPizzaPhotos(photos: PizzaPhoto[]): PizzaPhoto[] {
  return [...photos].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }

    return a.id - b.id;
  });
}

function getFallbackPhoto(pizza: Pizza): PizzaPhoto | null {
  if (!pizza.photoPath) {
    return null;
  }

  return {
    id: 0,
    pizzaId: pizza.id,
    imagePath: pizza.photoPath,
    altText: pizza.name,
    displayOrder: 0,
  };
}

async function attachPhotosToPizzas(pizzas: Pizza[]): Promise<Pizza[]> {
  if (pizzas.length === 0) {
    return pizzas;
  }

  const pizzaIds = pizzas.map((pizza) => pizza.id);
  const result = await query(
    `
      SELECT ${pizzaPhotoSelectFields}
      FROM pizza_photos
      WHERE pizza_id = ANY($1::int[])
      ORDER BY pizza_id, display_order, id;
    `,
    [pizzaIds],
  );

  const photosByPizzaId = new Map<number, PizzaPhoto[]>();

  for (const photo of result.rows as PizzaPhoto[]) {
    const current = photosByPizzaId.get(photo.pizzaId) ?? [];

    current.push(photo);
    photosByPizzaId.set(photo.pizzaId, current);
  }

  return pizzas.map((pizza) => {
    const photos = sortPizzaPhotos(photosByPizzaId.get(pizza.id) ?? []);
    const fallbackPhoto = photos.length === 0 ? getFallbackPhoto(pizza) : null;

    return {
      ...pizza,
      photos: fallbackPhoto ? [fallbackPhoto] : photos,
    };
  });
}

function addCustomerRequestDateLabels(rows: CustomerRequest[]): CustomerRequest[] {
  return rows.map((request) => ({
    ...request,
    serviceDateLabel: formatDateLong(request.serviceDate),
  }));
}

function addOrderDateLabels(rows: TodayOrder[]): TodayOrder[] {
  return rows.map((order) => ({
    ...order,
    serviceDateLabel: formatDateLong(order.serviceDate),
  }));
}

async function getPizzaById(pizzaId: number): Promise<Pizza | null> {
  const result = await query(
    `
      SELECT ${pizzaSelectFields}
      FROM pizzas
      WHERE id = $1;
    `,
    [pizzaId],
  );

  const pizzas = await attachPhotosToPizzas(result.rows as Pizza[]);

  return pizzas[0] ?? null;
}

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
  const result = await query(`
    SELECT ${pizzaSelectFields}
    FROM pizzas
    WHERE active = TRUE
    ORDER BY display_order, name;
  `);

  return attachPhotosToPizzas(result.rows as Pizza[]);
}

export async function getAllPizzasForAdmin(): Promise<Pizza[]> {
  const result = await query(`
    SELECT ${pizzaSelectFields}
    FROM pizzas
    ORDER BY active DESC, display_order, name;
  `);

  return attachPhotosToPizzas(result.rows as Pizza[]);
}

export async function getPizzasByIds(ids: number[]): Promise<Pizza[]> {
  if (ids.length === 0) {
    return [];
  }

  const result = await query(
    `
      SELECT ${pizzaSelectFields}
      FROM pizzas
      WHERE id = ANY($1::int[])
      ORDER BY display_order, name;
    `,
    [ids],
  );

  return attachPhotosToPizzas(result.rows as Pizza[]);
}

export async function getOccupancyForDate(
  serviceDate: string,
): Promise<OccupancyOrder[]> {
  const result = await query(
    `
      SELECT
        id,
        TO_CHAR(promised_time, 'HH24:MI') AS "promisedTime",
        total_minutes AS "totalMinutes"
      FROM orders
      WHERE service_date = $1::date
      ORDER BY promised_time, id;
    `,
    [serviceDate],
  );

  return result.rows;
}

export async function getTodayOccupancy(): Promise<OccupancyOrder[]> {
  const result = await query(`
    SELECT
      id,
      TO_CHAR(promised_time, 'HH24:MI') AS "promisedTime",
      total_minutes AS "totalMinutes"
    FROM orders
    WHERE service_date = ${PARIS_CURRENT_DATE_SQL}
    ORDER BY promised_time, id;
  `);

  return result.rows;
}

export async function getOrdersForDate(
  serviceDate: string,
): Promise<TodayOrder[]> {
  const result = await query(
    `
      SELECT
        o.id,
        TO_CHAR(o.service_date, 'YYYY-MM-DD') AS "serviceDate",
        be.title AS "eventTitle",
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
          ', '
          ORDER BY p.display_order, p.name
        ) AS "itemSummary"
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN pizzas p ON p.id = oi.pizza_id
      LEFT JOIN business_events be ON be.id = o.event_id
      WHERE o.service_date = $1::date
      GROUP BY
        o.id,
        o.service_date,
        be.title,
        o.customer_name,
        o.desired_time,
        o.promised_time,
        o.total_minutes,
        o.notes,
        o.status
      ORDER BY o.promised_time, o.id;
    `,
    [serviceDate],
  );

  return addOrderDateLabels(result.rows as TodayOrder[]);
}

export async function getTodayOrders(): Promise<TodayOrder[]> {
  const result = await query(`
    SELECT
      o.id,
      TO_CHAR(o.service_date, 'YYYY-MM-DD') AS "serviceDate",
      be.title AS "eventTitle",
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
        ', '
        ORDER BY p.display_order, p.name
      ) AS "itemSummary"
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN pizzas p ON p.id = oi.pizza_id
    LEFT JOIN business_events be ON be.id = o.event_id
    WHERE o.service_date = ${PARIS_CURRENT_DATE_SQL}
    GROUP BY
      o.id,
      o.service_date,
      be.title,
      o.customer_name,
      o.desired_time,
      o.promised_time,
      o.total_minutes,
      o.notes,
      o.status
    ORDER BY o.promised_time, o.id;
  `);

  return addOrderDateLabels(result.rows as TodayOrder[]);
}

export async function getCustomerRequests(): Promise<CustomerRequest[]> {
  const result = await query(`
    SELECT ${customerRequestSelectFields}
    FROM customer_requests cr
    LEFT JOIN business_events be ON be.id = cr.event_id
    WHERE (
        cr.event_id IS NULL
        AND cr.service_date = ${PARIS_CURRENT_DATE_SQL}
        AND (cr.created_at AT TIME ZONE '${PARIS_TIME_ZONE_SQL}')::date = ${PARIS_CURRENT_DATE_SQL}
      )
      OR (
        cr.event_id IS NOT NULL
        AND cr.service_date >= ${PARIS_CURRENT_DATE_SQL}
        AND cr.status <> 'resolved'
      )
    ORDER BY
      cr.service_date,
      COALESCE(be.title, ''),
      CASE cr.status
        WHEN 'new' THEN 0
        WHEN 'contacted' THEN 1
        ELSE 2
      END,
      cr.selected_slot,
      cr.created_at DESC;
  `);

  return addCustomerRequestDateLabels(result.rows as CustomerRequest[]);
}

export async function getCustomerRequestById(
  requestId: number,
): Promise<CustomerRequest | null> {
  const result = await query(
    `
      SELECT ${customerRequestSelectFields}
      FROM customer_requests cr
      LEFT JOIN business_events be ON be.id = cr.event_id
      WHERE cr.id = $1;
    `,
    [requestId],
  );

  return addCustomerRequestDateLabels(result.rows as CustomerRequest[])[0] ?? null;
}

export async function getCustomerRequestByIdForConversion(
  requestId: number,
): Promise<CustomerRequestForConversion | null> {
  const result = await query(
    `
      SELECT
        id,
        TO_CHAR(service_date, 'YYYY-MM-DD') AS "serviceDate",
        event_id AS "eventId",
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
  const result = await query(`
    SELECT ${businessLocationSelectFields}
    FROM business_locations
    ORDER BY is_default DESC, is_active DESC, display_order, name;
  `);

  return result.rows;
}

export async function getOpeningHoursForLocation(
  locationId: number,
): Promise<OpeningHour[]> {
  const result = await query(
    `
      SELECT ${openingHourSelectFields}
      FROM business_opening_hours
      WHERE location_id = $1
      ORDER BY iso_weekday;
    `,
    [locationId],
  );

  return sortOpeningHours(result.rows);
}

export async function getBusinessLocationsWithHours(): Promise<
  LocationWithHours[]
> {
  const [locations, hours] = await Promise.all([
    getBusinessLocations(),
    query(`
      SELECT ${openingHourSelectFields}
      FROM business_opening_hours
      ORDER BY location_id, iso_weekday;
    `),
  ]);

  return attachHoursToLocations(locations, hours.rows);
}

export async function getPublicLocationsWithHours(): Promise<
  LocationWithHours[]
> {
  const [locations, hours] = await Promise.all([
    query(`
      SELECT ${businessLocationSelectFields}
      FROM business_locations
      WHERE is_active = TRUE
      ORDER BY is_default DESC, display_order, name;
    `),
    query(`
      SELECT ${openingHourSelectFields}
      FROM business_opening_hours
      ORDER BY location_id, iso_weekday;
    `),
  ]);

  return attachHoursToLocations(locations.rows, hours.rows);
}

export async function getTodayServiceSettings(): Promise<TodayServiceSettings> {
  const serviceDate = getParisDateString();
  const [locations, exception] = await Promise.all([
    getBusinessLocationsWithHours(),
    getCalendarExceptionForDate(serviceDate),
  ]);

  return applyCalendarExceptionToServiceSettings(
    buildTodayServiceSettings(locations),
    exception,
  );
}

export async function getServiceSettingsForDate(
  serviceDate: string,
): Promise<TodayServiceSettings> {
  const [locations, exception] = await Promise.all([
    getBusinessLocationsWithHours(),
    getCalendarExceptionForDate(serviceDate),
  ]);

  return applyCalendarExceptionToServiceSettings(
    buildServiceSettingsForDate(locations, serviceDate),
    exception,
  );
}

export async function createPizza(input: PizzaWriteInput): Promise<Pizza> {
  const result = await query(
    `
      WITH next_order AS (
        SELECT COALESCE(MAX(display_order), 0) + 10 AS value
        FROM pizzas
      )
      INSERT INTO pizzas (
        name,
        active,
        is_classic,
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
        $3,
        next_order.value,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10
      FROM next_order
      RETURNING ${pizzaSelectFields};
    `,
    [
      input.name,
      input.active,
      input.isClassic,
      input.prepMinutes,
      input.ingredients,
      input.description,
      input.allergens,
      input.photoPath,
      input.priceCents,
      input.seasonality,
    ],
  );

  return (await getPizzaById(result.rows[0].id)) ?? result.rows[0];
}

export async function updatePizza(
  pizzaId: number,
  input: PizzaWriteInput,
): Promise<Pizza | null> {
  const result = await query(
    `
      UPDATE pizzas
      SET
        name = $2,
        active = $3,
        is_classic = $4,
        prep_minutes = $5,
        ingredients = $6,
        description = $7,
        allergens = $8,
        photo_path = $9,
        price_cents = $10,
        seasonality = $11
      WHERE id = $1
      RETURNING ${pizzaSelectFields};
    `,
    [
      pizzaId,
      input.name,
      input.active,
      input.isClassic,
      input.prepMinutes,
      input.ingredients,
      input.description,
      input.allergens,
      input.photoPath,
      input.priceCents,
      input.seasonality,
    ],
  );

  const updatedPizza = result.rows[0];

  if (!updatedPizza) {
    return null;
  }

  return getPizzaById(updatedPizza.id);
}

export async function togglePizzaActive(
  pizzaId: number,
): Promise<Pizza | null> {
  const result = await query(
    `
      UPDATE pizzas
      SET active = NOT active
      WHERE id = $1
      RETURNING ${pizzaSelectFields};
    `,
    [pizzaId],
  );

  const updatedPizza = result.rows[0];

  if (!updatedPizza) {
    return null;
  }

  return getPizzaById(updatedPizza.id);
}

export async function replacePizzaPhotos(
  pizzaId: number,
  photos: PizzaPhotoWriteInput[],
): Promise<Pizza | null> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        DELETE FROM pizza_photos
        WHERE pizza_id = $1;
      `,
      [pizzaId],
    );

    for (const [index, photo] of photos.entries()) {
      await client.query(
        `
          INSERT INTO pizza_photos (
            pizza_id,
            image_path,
            alt_text,
            display_order
          )
          VALUES ($1, $2, $3, $4);
        `,
        [
          pizzaId,
          photo.imagePath,
          photo.altText,
          Number.isInteger(photo.displayOrder) ? photo.displayOrder : index * 10,
        ],
      );
    }

    const firstPhotoPath = photos[0]?.imagePath ?? null;

    await client.query(
      `
        UPDATE pizzas
        SET photo_path = $2
        WHERE id = $1;
      `,
      [pizzaId, firstPhotoPath],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getPizzaById(pizzaId);
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
        RETURNING ${businessLocationSelectFields};
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
        RETURNING ${businessLocationSelectFields};
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
  const result = await query<{ id: number }>(
    `
      INSERT INTO customer_requests (
        service_date,
        event_id,
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
        $1::date,
        $2,
        $3,
        $4,
        $5::time,
        $6::time,
        $7,
        $8,
        $9::jsonb,
        $10,
        $11,
        $12,
        $13
      )
      RETURNING id;
    `,
    [
      input.serviceDate,
      input.eventId ?? null,
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

  const customerRequest = await getCustomerRequestById(result.rows[0].id);

  if (!customerRequest) {
    throw new Error("Demande introuvable après enregistrement.");
  }

  return customerRequest;
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

export async function updateCustomerRequestSlot(
  requestId: number,
  selectedSlot: string,
): Promise<boolean> {
  const result = await query(
    `
      UPDATE customer_requests
      SET
        desired_time = $2::time,
        selected_slot = $2::time
      WHERE id = $1
        AND status <> 'resolved';
    `,
    [requestId, selectedSlot],
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

export async function updateOrderDetails(
  orderId: number,
  promisedTime: string,
  notes: string,
): Promise<boolean> {
  const result = await query(
    `
      UPDATE orders
      SET
        desired_time = $2::time,
        promised_time = $2::time,
        notes = NULLIF(BTRIM($3), '')
      WHERE id = $1;
    `,
    [orderId, promisedTime, notes],
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
          event_id,
          customer_name,
          desired_time,
          promised_time,
          total_minutes,
          notes
        )
        VALUES (
          COALESCE($1::date, ${PARIS_CURRENT_DATE_SQL}),
          $2,
          $3,
          $4::time,
          $5::time,
          $6,
          $7
        )
        RETURNING id;
      `,
      [
        input.serviceDate ?? null,
        input.eventId ?? null,
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