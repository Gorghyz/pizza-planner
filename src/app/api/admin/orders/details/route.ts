import { NextResponse } from "next/server";
import { updateOrderDetails } from "@/lib/data";

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderId = Number(body.orderId);
    const promisedTime = body.promisedTime;
    const notes = typeof body.notes === "string" ? body.notes : "";

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Commande invalide." },
        { status: 400 },
      );
    }

    if (!isValidTime(promisedTime)) {
      return NextResponse.json(
        { ok: false, error: "Créneau invalide. Format attendu : HH:MM." },
        { status: 400 },
      );
    }

    const updated = await updateOrderDetails(orderId, promisedTime, notes);

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Commande introuvable." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur modification commande cuisine", error);

    return NextResponse.json(
      { ok: false, error: "Erreur serveur pendant la modification de la commande." },
      { status: 500 },
    );
  }
}
