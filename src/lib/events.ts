import { pool, query } from "@/lib/db";
import { getPizzasByIds } from "@/lib/data";
import {
  formatDateLong,
  getParisDateString,
  getParisDateTimeLocalString,
} from "@/lib/dates";
import type {
  BusinessEvent,
  BusinessEventImage,
  BusinessEventWriteInput,
  Pizza,
} from "@/lib/types";

const PARIS_TIME_ZONE_SQL = "Europe/Paris";
const PARIS_NOW_SQL = `(NOW() AT TIME ZONE '${PARIS_TIME_ZONE_SQL}')`;
const PARIS_CURRENT_DATE_SQL = `${PARIS_NOW_SQL}::date`;

const eventSelectFields = `
  id,
  title,
  slug,
  status,
  TO_CHAR(service_date, 'YYYY-MM-DD') AS "serviceDate",
  TO_CHAR(opens_at, 'HH24:MI') AS "opensAt",
  TO_CHAR(closes_at, 'HH24:MI') AS "closesAt",
  TO_CHAR(visible_from, 'YYYY-MM-DD"T"HH24:MI') AS "visibleFrom",
  TO_CHAR(order_opens_at, 'YYYY-MM-DD"T"HH24:MI') AS "orderOpensAt",
  TO_CHAR(order_closes_at, 'YYYY-MM-DD"T"HH24:MI') AS "orderClosesAt",
  location_id AS "locationId",
  location_name AS "locationName",
  address,
  city,
  latitude,
  longitude,
  description,
  public_note AS "publicNote",
  capacity_pizzas AS "capacityPizzas",
  slot_capacity_pizzas AS "slotCapacityPizzas",
  (status = 'published' AND service_date >= ${PARIS_CURRENT_DATE_SQL} AND (visible_from IS NULL OR visible_from <= ${PARIS_NOW_SQL})) AS "isVisibleNow",
  (status = 'published' AND service_date >= ${PARIS_CURRENT_DATE_SQL} AND (order_opens_at IS NULL OR order_opens_at <= ${PARIS_NOW_SQL}) AND (order_closes_at IS NULL OR order_closes_at >= ${PARIS_NOW_SQL})) AS "isOrderingOpenNow"
`;

const eventImageSelectFields = `
  id,
  event_id AS "eventId",
  image_path AS "imagePath",
  alt_text AS "altText",
  display_order AS "displayOrder"
`;

type EventRow = Omit<BusinessEvent, "images" | "pizzas" | "serviceDateLabel"> & {
  serviceDate: string;
};

type EventPizzaRow = {
  eventId: number;
  pizzaId: number;
  displayOrder: number;
};

type EventPizzaTotalsRow = {
  eventId: number;
  totalRequestedPizzas: number;
};

function withDateLabel(event: EventRow): BusinessEvent {
  return {
    ...event,
    serviceDateLabel: formatDateLong(event.serviceDate),
    images: [],
    pizzas: [],
    totalRequestedPizzas: 0,
  };
}

function sortImages(images: BusinessEventImage[]): BusinessEventImage[] {
  return [...images].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }

    return a.id - b.id;
  });
}

function normalizeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function normalizeCoordinate(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeEventInput(input: BusinessEventWriteInput): BusinessEventWriteInput {
  return {
    ...input,
    title: input.title.trim(),
    slug: normalizeSlug(input.slug || input.title),
    locationName: input.locationName.trim(),
    address: input.address.trim(),
    city: input.city.trim(),
    latitude: normalizeCoordinate(input.latitude),
    longitude: normalizeCoordinate(input.longitude),
    description: input.description.trim(),
    publicNote: input.publicNote.trim(),
    visibleFrom: input.visibleFrom?.trim() || null,
    orderOpensAt: input.orderOpensAt?.trim() || null,
    orderClosesAt: input.orderClosesAt?.trim() || null,
    pizzaIds: [...new Set(input.pizzaIds)].filter((id) => Number.isInteger(id) && id > 0),
    images: input.images
      .filter((image) => image.imagePath.startsWith("/uploads/"))
      .map((image, index) => ({
        imagePath: image.imagePath,
        altText: image.altText.trim() || input.title.trim(),
        displayOrder: index * 10,
      })),
  };
}

function assertValidEventInput(input: BusinessEventWriteInput): void {
  if (!input.title) {
    throw new Error("Le nom de l'événement est obligatoire.");
  }

  if (!input.slug) {
    throw new Error("Le slug de l'événement est obligatoire.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.serviceDate)) {
    throw new Error("La date de service est invalide.");
  }

  if (!/^\d{2}:\d{2}$/.test(input.opensAt) || !/^\d{2}:\d{2}$/.test(input.closesAt)) {
    throw new Error("Les horaires de l'événement sont invalides.");
  }

  if (input.pizzaIds.length === 0) {
    throw new Error("Choisis au moins une pizza pour la carte de l'événement.");
  }
}

async function attachEventDetails(events: BusinessEvent[]): Promise<BusinessEvent[]> {
  if (events.length === 0) {
    return events;
  }

  const eventIds = events.map((event) => event.id);

  const [imagesResult, eventPizzasResult, totalsResult] = await Promise.all([
    query(`
      SELECT ${eventImageSelectFields}
      FROM business_event_images
      WHERE event_id = ANY($1::int[])
      ORDER BY event_id, display_order, id;
    `, [eventIds]),
    query<EventPizzaRow>(`
      SELECT
        event_id AS "eventId",
        pizza_id AS "pizzaId",
        display_order AS "displayOrder"
      FROM business_event_pizzas
      WHERE event_id = ANY($1::int[])
      ORDER BY event_id, display_order, pizza_id;
    `, [eventIds]),
    query<EventPizzaTotalsRow>(`
      SELECT
        source.event_id AS "eventId",
        COALESCE(SUM(source.total_pizzas), 0)::int AS "totalRequestedPizzas"
      FROM (
        SELECT event_id, total_pizzas
        FROM customer_requests
        WHERE event_id = ANY($1::int[])
          AND status <> 'resolved'
        UNION ALL
        SELECT event_id, SUM(oi.quantity)::int AS total_pizzas
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.event_id = ANY($1::int[])
        GROUP BY o.event_id
      ) source
      GROUP BY source.event_id;
    `, [eventIds]),
  ]);

  const imagesByEventId = new Map<number, BusinessEventImage[]>();

  for (const image of imagesResult.rows as BusinessEventImage[]) {
    const current = imagesByEventId.get(image.eventId) ?? [];

    current.push(image);
    imagesByEventId.set(image.eventId, current);
  }

  const pizzasByEventId = new Map<number, EventPizzaRow[]>();
  const allPizzaIds = new Set<number>();

  for (const eventPizza of eventPizzasResult.rows) {
    const current = pizzasByEventId.get(eventPizza.eventId) ?? [];

    current.push(eventPizza);
    pizzasByEventId.set(eventPizza.eventId, current);
    allPizzaIds.add(eventPizza.pizzaId);
  }

  const pizzas = await getPizzasByIds([...allPizzaIds]);
  const pizzaMap = new Map<number, Pizza>(pizzas.map((pizza) => [pizza.id, pizza]));
  const totalsByEventId = new Map<number, number>();

  for (const total of totalsResult.rows) {
    totalsByEventId.set(total.eventId, Number(total.totalRequestedPizzas));
  }

  return events.map((event) => {
    const eventPizzas = pizzasByEventId.get(event.id) ?? [];

    return {
      ...event,
      images: sortImages(imagesByEventId.get(event.id) ?? []),
      pizzas: eventPizzas
        .map((eventPizza) => pizzaMap.get(eventPizza.pizzaId))
        .filter((pizza): pizza is Pizza => pizza !== undefined),
      totalRequestedPizzas: totalsByEventId.get(event.id) ?? 0,
    };
  });
}

export function isBusinessEventOrderingOpen(event: BusinessEvent): boolean {
  if (event.status !== "published") {
    return false;
  }

  if (event.serviceDate < getParisDateString()) {
    return false;
  }

  const now = getParisDateTimeLocalString();

  if (event.orderOpensAt && event.orderOpensAt > now) {
    return false;
  }

  if (event.orderClosesAt && event.orderClosesAt < now) {
    return false;
  }

  return true;
}

export async function getBusinessEventsForAdmin(): Promise<BusinessEvent[]> {
  const result = await query<EventRow>(`
    SELECT ${eventSelectFields}
    FROM business_events
    ORDER BY service_date DESC, opens_at DESC, id DESC;
  `);

  return attachEventDetails(result.rows.map(withDateLabel));
}

export async function getVisiblePublishedEvents(): Promise<BusinessEvent[]> {
  const result = await query<EventRow>(`
    SELECT ${eventSelectFields}
    FROM business_events
    WHERE status = 'published'
      AND service_date >= ${PARIS_CURRENT_DATE_SQL}
      AND (visible_from IS NULL OR visible_from <= ${PARIS_NOW_SQL})
    ORDER BY service_date, opens_at, id;
  `);

  return attachEventDetails(result.rows.map(withDateLabel));
}

export async function getPublishedBusinessEventBySlug(
  slug: string,
): Promise<BusinessEvent | null> {
  const result = await query<EventRow>(`
    SELECT ${eventSelectFields}
    FROM business_events
    WHERE slug = $1
      AND status = 'published'
    LIMIT 1;
  `, [slug]);

  const events = await attachEventDetails(result.rows.map(withDateLabel));

  return events[0] ?? null;
}

export async function getBusinessEventById(
  eventId: number,
): Promise<BusinessEvent | null> {
  const result = await query<EventRow>(`
    SELECT ${eventSelectFields}
    FROM business_events
    WHERE id = $1
    LIMIT 1;
  `, [eventId]);

  const events = await attachEventDetails(result.rows.map(withDateLabel));

  return events[0] ?? null;
}

export async function saveBusinessEvent(
  rawInput: BusinessEventWriteInput,
): Promise<BusinessEvent> {
  const input = normalizeEventInput(rawInput);

  assertValidEventInput(input);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = input.id
      ? await client.query<EventRow>(`
          UPDATE business_events
          SET
            title = $2,
            slug = $3,
            status = $4,
            service_date = $5::date,
            opens_at = $6::time,
            closes_at = $7::time,
            visible_from = NULLIF($8, '')::timestamp,
            order_opens_at = NULLIF($9, '')::timestamp,
            order_closes_at = NULLIF($10, '')::timestamp,
            location_id = $11,
            location_name = $12,
            address = $13,
            city = $14,
            latitude = $15,
            longitude = $16,
            description = $17,
            public_note = $18,
            capacity_pizzas = $19,
            slot_capacity_pizzas = $20,
            updated_at = NOW()
          WHERE id = $1
          RETURNING ${eventSelectFields};
        `, [
          input.id,
          input.title,
          input.slug,
          input.status,
          input.serviceDate,
          input.opensAt,
          input.closesAt,
          input.visibleFrom ?? "",
          input.orderOpensAt ?? "",
          input.orderClosesAt ?? "",
          input.locationId,
          input.locationName,
          input.address,
          input.city,
          input.latitude,
          input.longitude,
          input.description,
          input.publicNote,
          input.capacityPizzas,
          input.slotCapacityPizzas,
        ])
      : await client.query<EventRow>(`
          INSERT INTO business_events (
            title,
            slug,
            status,
            service_date,
            opens_at,
            closes_at,
            visible_from,
            order_opens_at,
            order_closes_at,
            location_id,
            location_name,
            address,
            city,
            latitude,
            longitude,
            description,
            public_note,
            capacity_pizzas,
            slot_capacity_pizzas
          )
          VALUES (
            $1,
            $2,
            $3,
            $4::date,
            $5::time,
            $6::time,
            NULLIF($7, '')::timestamp,
            NULLIF($8, '')::timestamp,
            NULLIF($9, '')::timestamp,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,
            $17,
            $18,
            $19
          )
          RETURNING ${eventSelectFields};
        `, [
          input.title,
          input.slug,
          input.status,
          input.serviceDate,
          input.opensAt,
          input.closesAt,
          input.visibleFrom ?? "",
          input.orderOpensAt ?? "",
          input.orderClosesAt ?? "",
          input.locationId,
          input.locationName,
          input.address,
          input.city,
          input.latitude,
          input.longitude,
          input.description,
          input.publicNote,
          input.capacityPizzas,
          input.slotCapacityPizzas,
        ]);

    const event = result.rows[0];

    if (!event) {
      throw new Error("Événement introuvable.");
    }

    await client.query(
      `DELETE FROM business_event_pizzas WHERE event_id = $1;`,
      [event.id],
    );

    for (const [index, pizzaId] of input.pizzaIds.entries()) {
      await client.query(
        `
          INSERT INTO business_event_pizzas (event_id, pizza_id, display_order)
          VALUES ($1, $2, $3);
        `,
        [event.id, pizzaId, index * 10],
      );
    }

    await client.query(
      `DELETE FROM business_event_images WHERE event_id = $1;`,
      [event.id],
    );

    for (const [index, image] of input.images.entries()) {
      await client.query(
        `
          INSERT INTO business_event_images (
            event_id,
            image_path,
            alt_text,
            display_order
          )
          VALUES ($1, $2, $3, $4);
        `,
        [event.id, image.imagePath, image.altText || event.title, index * 10],
      );
    }

    await client.query("COMMIT");

    const saved = await getBusinessEventById(event.id);

    if (!saved) {
      throw new Error("Événement introuvable après enregistrement.");
    }

    return saved;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getEventSlotPizzaCounts(
  eventId: number,
): Promise<Map<string, number>> {
  const result = await query<{ slot: string; totalPizzas: number }>(
    `
      SELECT
        source.slot,
        COALESCE(SUM(source.total_pizzas), 0)::int AS "totalPizzas"
      FROM (
        SELECT TO_CHAR(selected_slot, 'HH24:MI') AS slot, total_pizzas
        FROM customer_requests
        WHERE event_id = $1
          AND status <> 'resolved'
        UNION ALL
        SELECT TO_CHAR(o.promised_time, 'HH24:MI') AS slot, SUM(oi.quantity)::int AS total_pizzas
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.event_id = $1
        GROUP BY o.promised_time
      ) source
      GROUP BY source.slot;
    `,
    [eventId],
  );

  return new Map(
    result.rows.map((row) => [row.slot, Number(row.totalPizzas)]),
  );
}
