import { NextResponse } from "next/server";
import { updateCustomerRequestStatus } from "@/lib/data";
import type { CustomerRequestStatus } from "@/lib/types";

export const runtime = "nodejs";

const allowedStatuses: CustomerRequestStatus[] = [
  "new",
  "contacted",
  "resolved",
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      requestId?: unknown;
      status?: unknown;
    };

    const requestId = Number(body.requestId);
    const status = body.status;

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return NextResponse.json(
        { error: "Identifiant de demande invalide." },
        { status: 400 },
      );
    }

    if (
      typeof status !== "string" ||
      !allowedStatuses.includes(status as CustomerRequestStatus)
    ) {
      return NextResponse.json(
        { error: "Statut invalide." },
        { status: 400 },
      );
    }

    const updated = await updateCustomerRequestStatus(
      requestId,
      status as CustomerRequestStatus,
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Demande introuvable." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de mettre à jour la demande." },
      { status: 500 },
    );
  }
}