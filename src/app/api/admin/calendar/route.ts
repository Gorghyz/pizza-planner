import { NextResponse } from "next/server";

import {
  deleteCalendarException,
  deleteCalendarExceptions,
  saveCalendarException,
  saveCalendarExceptions,
} from "@/lib/business-calendar";
import type { BusinessCalendarExceptionStatus } from "@/lib/types";

export const runtime = "nodejs";

type CalendarBody = {
  serviceDate?: unknown;
  serviceDates?: unknown;
  status?: unknown;
  title?: unknown;
  note?: unknown;
  locationId?: unknown;
  locationName?: unknown;
  address?: unknown;
  city?: unknown;
  opensAt?: unknown;
  closesAt?: unknown;
};

function parseString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(parseString).filter(Boolean);
}

function parseNullableInteger(value: unknown): number | null {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseStatus(value: unknown): BusinessCalendarExceptionStatus {
  if (value === "closed" || value === "note") {
    return value;
  }

  return "open";
}

function parseNullableTime(value: unknown): string | null {
  const parsed = parseString(value);

  return parsed ? parsed : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CalendarBody;
    const serviceDates = parseStringArray(body.serviceDates);
    const status = parseStatus(body.status);
    const baseInput = {
      status,
      title: parseString(body.title),
      note: parseString(body.note),
      locationId: parseNullableInteger(body.locationId),
      locationName: parseString(body.locationName),
      address: parseString(body.address),
      city: parseString(body.city),
      opensAt: status === "open" ? parseNullableTime(body.opensAt) : null,
      closesAt: status === "open" ? parseNullableTime(body.closesAt) : null,
    };

    if (serviceDates.length > 0) {
      const exceptions = await saveCalendarExceptions(
        serviceDates.map((serviceDate) => ({
          ...baseInput,
          serviceDate,
        })),
      );

      return NextResponse.json({ ok: true, exceptions });
    }

    const exception = await saveCalendarException({
      ...baseInput,
      serviceDate: parseString(body.serviceDate),
    });

    return NextResponse.json({ ok: true, exception });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer cette exception de calendrier.",
      },
      { status: 500 },
    );
  }
}

export const PUT = POST;

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawDates = searchParams.get("dates");

    if (rawDates) {
      await deleteCalendarExceptions(
        rawDates
          .split(",")
          .map((date) => date.trim())
          .filter(Boolean),
      );

      return NextResponse.json({ ok: true });
    }

    const serviceDate = searchParams.get("date") ?? "";

    await deleteCalendarException(serviceDate);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de supprimer cette exception de calendrier.",
      },
      { status: 500 },
    );
  }
}
