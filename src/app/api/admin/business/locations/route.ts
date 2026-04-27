import { NextResponse } from "next/server";
import {
  createBusinessLocation,
  getOpeningHoursForLocation,
  updateBusinessLocation,
} from "@/lib/data";

export const runtime = "nodejs";

type Body = {
  locationId?: unknown;
  name?: unknown;
  address?: unknown;
  city?: unknown;
  notes?: unknown;
  isActive?: unknown;
  isDefault?: unknown;
};

function parseString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseBoolean(value: unknown): boolean {
  return value === true;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    const name = parseString(body.name);
    const address = parseString(body.address);
    const city = parseString(body.city);
    const notes = parseString(body.notes);
    const isActive = parseBoolean(body.isActive);
    const isDefault = parseBoolean(body.isDefault);

    if (!name) {
      return NextResponse.json(
        { error: "Le nom du lieu est obligatoire." },
        { status: 400 },
      );
    }

    const location = await createBusinessLocation({
      name,
      address,
      city,
      notes,
      isActive,
      isDefault,
    });

    const hours = await getOpeningHoursForLocation(location.id);

    return NextResponse.json({
      ok: true,
      location,
      hours,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de créer le lieu." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Body;

    const locationId = Number(body.locationId);
    const name = parseString(body.name);
    const address = parseString(body.address);
    const city = parseString(body.city);
    const notes = parseString(body.notes);
    const isActive = parseBoolean(body.isActive);
    const isDefault = parseBoolean(body.isDefault);

    if (!Number.isInteger(locationId) || locationId <= 0) {
      return NextResponse.json(
        { error: "Identifiant de lieu invalide." },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Le nom du lieu est obligatoire." },
        { status: 400 },
      );
    }

    const location = await updateBusinessLocation(locationId, {
      name,
      address,
      city,
      notes,
      isActive,
      isDefault,
    });

    if (!location) {
      return NextResponse.json(
        { error: "Lieu introuvable." },
        { status: 404 },
      );
    }

    const hours = await getOpeningHoursForLocation(location.id);

    return NextResponse.json({
      ok: true,
      location,
      hours,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de modifier le lieu." },
      { status: 500 },
    );
  }
}