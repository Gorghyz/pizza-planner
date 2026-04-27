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
  latitude?: unknown;
  longitude?: unknown;
  isActive?: unknown;
  isDefault?: unknown;
};

function parseString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseBoolean(value: unknown): boolean {
  return value === true;
}

function parseNullableCoordinate(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const normalized = trimmed.replace(",", ".");
    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function validateCoordinates(
  latitude: number | null,
  longitude: number | null,
): string | null {
  if ((latitude === null) !== (longitude === null)) {
    return "Renseigne soit les deux coordonnées GPS, soit aucune.";
  }

  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    return "La latitude doit être comprise entre -90 et 90.";
  }

  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    return "La longitude doit être comprise entre -180 et 180.";
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    const name = parseString(body.name);
    const address = parseString(body.address);
    const city = parseString(body.city);
    const notes = parseString(body.notes);
    const latitude = parseNullableCoordinate(body.latitude);
    const longitude = parseNullableCoordinate(body.longitude);
    const isActive = parseBoolean(body.isActive);
    const isDefault = parseBoolean(body.isDefault);

    if (!name) {
      return NextResponse.json(
        { error: "Le nom du lieu est obligatoire." },
        { status: 400 },
      );
    }

    const coordinatesError = validateCoordinates(latitude, longitude);

    if (coordinatesError) {
      return NextResponse.json(
        { error: coordinatesError },
        { status: 400 },
      );
    }

    const location = await createBusinessLocation({
      name,
      address,
      city,
      notes,
      latitude,
      longitude,
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
    const latitude = parseNullableCoordinate(body.latitude);
    const longitude = parseNullableCoordinate(body.longitude);
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

    const coordinatesError = validateCoordinates(latitude, longitude);

    if (coordinatesError) {
      return NextResponse.json(
        { error: coordinatesError },
        { status: 400 },
      );
    }

    const location = await updateBusinessLocation(locationId, {
      name,
      address,
      city,
      notes,
      latitude,
      longitude,
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