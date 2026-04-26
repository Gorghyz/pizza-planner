import { NextResponse } from "next/server";
import { togglePizzaActive } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      pizzaId?: unknown;
    };

    const pizzaId = Number(body.pizzaId);

    if (!Number.isInteger(pizzaId) || pizzaId <= 0) {
      return NextResponse.json(
        { error: "Identifiant de pizza invalide." },
        { status: 400 },
      );
    }

    const pizza = await togglePizzaActive(pizzaId);

    if (!pizza) {
      return NextResponse.json(
        { error: "Pizza introuvable." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      pizza,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de changer l'état actif/inactif." },
      { status: 500 },
    );
  }
}