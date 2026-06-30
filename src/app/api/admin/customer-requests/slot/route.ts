import { NextResponse } from "next/server";
import { updateCustomerRequestSlot } from "@/lib/data";

export const runtime = "nodejs";

function isValidTime(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return false;
  }

  const [, minutes] = value.split(":").map(Number);
  return minutes % 5 === 0;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      requestId?: unknown;
      selectedSlot?: unknown;
    };

    const requestId = Number(body.requestId);
    const selectedSlot = body.selectedSlot;

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return NextResponse.json(
        { error: "Identifiant de demande invalide." },
        { status: 400 },
      );
    }

    if (!isValidTime(selectedSlot)) {
      return NextResponse.json(
        { error: "Créneau invalide. Utilise un horaire au format HH:MM, par pas de 5 minutes." },
        { status: 400 },
      );
    }

    const updated = await updateCustomerRequestSlot(requestId, selectedSlot);

    if (!updated) {
      return NextResponse.json(
        { error: "Demande introuvable ou déjà traitée." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de modifier le créneau." },
      { status: 500 },
    );
  }
}
