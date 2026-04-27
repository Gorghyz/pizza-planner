import { NextResponse } from "next/server";
import { saveOpeningHours } from "@/lib/data";

export const runtime = "nodejs";

type HourPayload = {
  isoWeekday?: unknown;
  isOpen?: unknown;
  opensAt?: unknown;
  closesAt?: unknown;
};

type Body = {
  locationId?: unknown;
  hours?: unknown;
};

function parseNullableTime(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Body;

    const locationId = Number(body.locationId);

    if (!Number.isInteger(locationId) || locationId <= 0) {
      return NextResponse.json(
        { error: "Identifiant de lieu invalide." },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.hours)) {
      return NextResponse.json(
        { error: "Liste d'horaires invalide." },
        { status: 400 },
      );
    }

    const hours = body.hours.map((entry) => {
      const hour = entry as HourPayload;

      return {
        isoWeekday: Number(hour.isoWeekday),
        isOpen: hour.isOpen === true,
        opensAt: parseNullableTime(hour.opensAt),
        closesAt: parseNullableTime(hour.closesAt),
      };
    });

    for (const hour of hours) {
      if (!Number.isInteger(hour.isoWeekday) || hour.isoWeekday < 1 || hour.isoWeekday > 7) {
        return NextResponse.json(
          { error: "Jour invalide dans les horaires." },
          { status: 400 },
        );
      }

      if (hour.isOpen && (!hour.opensAt || !hour.closesAt)) {
        return NextResponse.json(
          { error: "Les horaires d'ouverture et de fermeture sont obligatoires pour un jour ouvert." },
          { status: 400 },
        );
      }
    }

    const savedHours = await saveOpeningHours(locationId, hours);

    return NextResponse.json({
      ok: true,
      hours: savedHours,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible d'enregistrer les horaires." },
      { status: 500 },
    );
  }
}