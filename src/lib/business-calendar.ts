import { query } from "@/lib/db";
import { formatDateLong, getParisDateString, isDateString } from "@/lib/dates";
import {
  buildServiceSettingsForDate,
  getIsoWeekdayFromDateString,
  getWeekdayLabel,
} from "@/lib/business-settings";
import {
  DEFAULT_SERVICE_CLOSING_TIME,
  DEFAULT_SERVICE_OPENING_TIME,
} from "@/lib/config";
import type {
  BusinessCalendarDay,
  BusinessCalendarException,
  BusinessCalendarExceptionStatus,
  BusinessCalendarExceptionWriteInput,
  BusinessEvent,
  BusinessLocation,
  LocationWithHours,
  TodayServiceSettings,
} from "@/lib/types";

const exceptionSelectFields = `
  id,
  TO_CHAR(service_date, 'YYYY-MM-DD') AS "serviceDate",
  status,
  title,
  note,
  location_id AS "locationId",
  location_name AS "locationName",
  address,
  city,
  TO_CHAR(opens_at, 'HH24:MI') AS "opensAt",
  TO_CHAR(closes_at, 'HH24:MI') AS "closesAt"
`;

function withDateLabel(row: Omit<BusinessCalendarException, "serviceDateLabel">): BusinessCalendarException {
  return {
    ...row,
    serviceDateLabel: formatDateLong(row.serviceDate),
  };
}

function parseMonth(month: string | undefined): { year: number; monthIndex: number; monthValue: string } {
  const fallback = getParisDateString().slice(0, 7);
  const candidate = typeof month === "string" && /^\d{4}-\d{2}$/.test(month) ? month : fallback;
  const [year, monthNumber] = candidate.split("-").map(Number);

  if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
    const [fallbackYear, fallbackMonth] = fallback.split("-").map(Number);

    return {
      year: fallbackYear,
      monthIndex: fallbackMonth - 1,
      monthValue: fallback,
    };
  }

  return {
    year,
    monthIndex: monthNumber - 1,
    monthValue: candidate,
  };
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function buildPseudoLocation(
  baseLocation: BusinessLocation | null,
  exception: BusinessCalendarException,
): BusinessLocation | null {
  if (!exception.locationName && !exception.address && !exception.city) {
    return baseLocation;
  }

  return {
    id: exception.locationId ?? baseLocation?.id ?? -1,
    name: exception.locationName || baseLocation?.name || "Lieu exceptionnel",
    address: exception.address || baseLocation?.address || "",
    city: exception.city || baseLocation?.city || "",
    notes: baseLocation?.notes ?? "",
    latitude: baseLocation?.latitude ?? null,
    longitude: baseLocation?.longitude ?? null,
    isActive: true,
    isDefault: baseLocation?.isDefault ?? false,
    displayOrder: baseLocation?.displayOrder ?? 0,
  };
}

function normalizeStatus(raw: string): BusinessCalendarExceptionStatus {
  if (raw === "closed" || raw === "note") {
    return raw;
  }

  return "open";
}

function normalizeTime(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";

  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : null;
}

function assertValidException(input: BusinessCalendarExceptionWriteInput): void {
  if (!isDateString(input.serviceDate)) {
    throw new Error("La date du calendrier est invalide.");
  }

  if (input.status === "open") {
    if (!input.opensAt || !input.closesAt) {
      throw new Error("Une ouverture exceptionnelle doit avoir une heure d'ouverture et une heure de fermeture.");
    }

    if (input.opensAt >= input.closesAt) {
      throw new Error("L'heure d'ouverture doit être avant l'heure de fermeture.");
    }
  }
}

export function applyCalendarExceptionToServiceSettings(
  service: TodayServiceSettings,
  exception: BusinessCalendarException | null,
): TodayServiceSettings {
  if (!exception) {
    return service;
  }

  if (exception.status === "closed") {
    return {
      ...service,
      isOpen: false,
    };
  }

  if (exception.status === "note") {
    return service;
  }

  return {
    ...service,
    isOpen: true,
    opensAt: exception.opensAt ?? service.opensAt ?? DEFAULT_SERVICE_OPENING_TIME,
    closesAt: exception.closesAt ?? service.closesAt ?? DEFAULT_SERVICE_CLOSING_TIME,
    location: buildPseudoLocation(service.location, exception),
  };
}

export async function getCalendarExceptionForDate(
  serviceDate: string,
): Promise<BusinessCalendarException | null> {
  if (!isDateString(serviceDate)) {
    return null;
  }

  const result = await query<Omit<BusinessCalendarException, "serviceDateLabel">>(
    `
      SELECT ${exceptionSelectFields}
      FROM business_calendar_exceptions
      WHERE service_date = $1::date
      LIMIT 1;
    `,
    [serviceDate],
  );

  const row = result.rows[0];

  return row ? withDateLabel(row) : null;
}

export async function getCalendarExceptionsForRange(
  startDate: string,
  endDate: string,
): Promise<BusinessCalendarException[]> {
  const result = await query<Omit<BusinessCalendarException, "serviceDateLabel">>(
    `
      SELECT ${exceptionSelectFields}
      FROM business_calendar_exceptions
      WHERE service_date >= $1::date
        AND service_date <= $2::date
      ORDER BY service_date;
    `,
    [startDate, endDate],
  );

  return result.rows.map(withDateLabel);
}

export async function saveCalendarException(
  rawInput: BusinessCalendarExceptionWriteInput,
): Promise<BusinessCalendarException> {
  const input: BusinessCalendarExceptionWriteInput = {
    serviceDate: rawInput.serviceDate.trim(),
    status: normalizeStatus(rawInput.status),
    title: rawInput.title.trim(),
    note: rawInput.note.trim(),
    locationId: rawInput.locationId,
    locationName: rawInput.locationName.trim(),
    address: rawInput.address.trim(),
    city: rawInput.city.trim(),
    opensAt: normalizeTime(rawInput.opensAt),
    closesAt: normalizeTime(rawInput.closesAt),
  };

  assertValidException(input);

  const result = await query<Omit<BusinessCalendarException, "serviceDateLabel">>(
    `
      INSERT INTO business_calendar_exceptions (
        service_date,
        status,
        title,
        note,
        location_id,
        location_name,
        address,
        city,
        opens_at,
        closes_at
      )
      VALUES (
        $1::date,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        CASE WHEN $2 = 'open' THEN $9::time ELSE NULL END,
        CASE WHEN $2 = 'open' THEN $10::time ELSE NULL END
      )
      ON CONFLICT (service_date)
      DO UPDATE SET
        status = EXCLUDED.status,
        title = EXCLUDED.title,
        note = EXCLUDED.note,
        location_id = EXCLUDED.location_id,
        location_name = EXCLUDED.location_name,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        opens_at = EXCLUDED.opens_at,
        closes_at = EXCLUDED.closes_at,
        updated_at = NOW()
      RETURNING ${exceptionSelectFields};
    `,
    [
      input.serviceDate,
      input.status,
      input.title,
      input.note,
      input.locationId,
      input.locationName,
      input.address,
      input.city,
      input.opensAt,
      input.closesAt,
    ],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Impossible d'enregistrer cette exception de calendrier.");
  }

  return withDateLabel(row);
}

export async function saveCalendarExceptions(
  inputs: BusinessCalendarExceptionWriteInput[],
): Promise<BusinessCalendarException[]> {
  const saved: BusinessCalendarException[] = [];

  for (const input of inputs) {
    saved.push(await saveCalendarException(input));
  }

  return saved;
}

export async function deleteCalendarExceptions(serviceDates: string[]): Promise<void> {
  const dates = [...new Set(serviceDates.map((date) => date.trim()))].filter(isDateString);

  if (dates.length === 0) {
    throw new Error("Aucune date valide à modifier.");
  }

  await query(
    `
      DELETE FROM business_calendar_exceptions
      WHERE service_date = ANY($1::date[]);
    `,
    [dates],
  );
}

export async function deleteCalendarException(serviceDate: string): Promise<void> {
  if (!isDateString(serviceDate)) {
    throw new Error("La date du calendrier est invalide.");
  }

  await query(
    `
      DELETE FROM business_calendar_exceptions
      WHERE service_date = $1::date;
    `,
    [serviceDate],
  );
}

export function getMonthNavigation(month: string | undefined) {
  const { year, monthIndex, monthValue } = parseMonth(month);
  const current = new Date(Date.UTC(year, monthIndex, 1, 12, 0, 0));
  const previous = new Date(Date.UTC(year, monthIndex - 1, 1, 12, 0, 0));
  const next = new Date(Date.UTC(year, monthIndex + 1, 1, 12, 0, 0));

  return {
    monthValue,
    monthLabel: new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(current),
    previousMonth: toDateString(previous).slice(0, 7),
    nextMonth: toDateString(next).slice(0, 7),
  };
}

export function getCalendarGridRange(month: string | undefined) {
  const { year, monthIndex, monthValue } = parseMonth(month);
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1, 12, 0, 0));
  const firstIsoWeekday = getIsoWeekdayFromDateString(toDateString(firstOfMonth));
  const gridStart = addDays(firstOfMonth, -(firstIsoWeekday - 1));
  const lastOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0));
  const lastIsoWeekday = getIsoWeekdayFromDateString(toDateString(lastOfMonth));
  const gridEnd = addDays(lastOfMonth, 7 - lastIsoWeekday);

  return {
    monthValue,
    startDate: toDateString(gridStart),
    endDate: toDateString(gridEnd),
  };
}

export function buildBusinessCalendarDays({
  month,
  locations,
  exceptions,
  events,
}: {
  month: string | undefined;
  locations: LocationWithHours[];
  exceptions: BusinessCalendarException[];
  events: BusinessEvent[];
}): BusinessCalendarDay[] {
  const { monthValue, startDate, endDate } = getCalendarGridRange(month);
  const exceptionMap = new Map(exceptions.map((exception) => [exception.serviceDate, exception]));
  const eventsByDate = new Map<string, BusinessEvent[]>();

  for (const event of events) {
    if (event.status === "archived") {
      continue;
    }

    const current = eventsByDate.get(event.serviceDate) ?? [];
    current.push(event);
    eventsByDate.set(event.serviceDate, current);
  }

  const days: BusinessCalendarDay[] = [];
  let cursor = new Date(Date.UTC(Number(startDate.slice(0, 4)), Number(startDate.slice(5, 7)) - 1, Number(startDate.slice(8, 10)), 12, 0, 0));
  const end = new Date(Date.UTC(Number(endDate.slice(0, 4)), Number(endDate.slice(5, 7)) - 1, Number(endDate.slice(8, 10)), 12, 0, 0));

  while (cursor <= end) {
    const date = toDateString(cursor);
    const exception = exceptionMap.get(date) ?? null;
    const baseService = buildServiceSettingsForDate(locations, date);
    const service = applyCalendarExceptionToServiceSettings(baseService, exception);
    const isoWeekday = getIsoWeekdayFromDateString(date);

    days.push({
      date,
      dateLabel: formatDateLong(date),
      dayNumber: Number(date.slice(8, 10)),
      isoWeekday,
      weekdayLabel: getWeekdayLabel(isoWeekday),
      isCurrentMonth: date.slice(0, 7) === monthValue,
      baseIsOpen: baseService.isOpen,
      isOpen: service.isOpen,
      opensAt: service.opensAt,
      closesAt: service.closesAt,
      locationName: service.location?.name ?? "",
      exception,
      events: (eventsByDate.get(date) ?? []).sort((a, b) => a.opensAt.localeCompare(b.opensAt)),
    });

    cursor = addDays(cursor, 1);
  }

  return days;
}
