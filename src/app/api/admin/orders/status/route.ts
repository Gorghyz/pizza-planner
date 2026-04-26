import { NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/data";
import type { OrderStatus } from "@/lib/types";

export const runtime = "nodejs";

const allowedStatuses: OrderStatus[] = [
  "new",
  "in_progress",
  "ready",
  "completed",
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      orderId?: unknown;
      status?: unknown;
    };

    const orderId = Number(body.orderId);
    const status = body.status;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        { error: "Identifiant de commande invalide." },
        { status: 400 },
      );
    }

    if (typeof status !== "string" || !allowedStatuses.includes(status as OrderStatus)) {
      return NextResponse.json(
        { error: "Statut invalide." },
        { status: 400 },
      );
    }

    const updated = await updateOrderStatus(orderId, status as OrderStatus);

    if (!updated) {
      return NextResponse.json(
        { error: "Commande introuvable." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de mettre à jour le statut." },
      { status: 500 },
    );
  }
}