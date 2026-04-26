import { NextResponse } from "next/server";
import { getPizzasByIds, getTodayOccupancy } from "@/lib/data";
import { SERVICE_OPENING_TIME } from "@/lib/config";
import { suggestSlots } from "@/lib/scheduler";
import type { DraftItem, QuoteResponse } from "@/lib/types";

export const runtime = "nodejs";

function normalizeItems(raw: unknown): DraftItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const normalized: DraftItem[] = [];

  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }

    const candidate = entry as Record<string, unknown>;

    const pizzaId = Number(candidate.pizzaId);
    const quantity = Number(candidate.quantity);
    const comment =
      typeof candidate.comment === "string" ? candidate.comment.trim() : "";

    if (
      !Number.isInteger(pizzaId) ||
      !Number.isInteger(quantity) ||
      pizzaId <= 0 ||
      quantity <= 0
    ) {
      continue;
    }

    normalized.push({
      pizzaId,
      quantity,
      comment,
    });
  }

  return normalized;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      desiredTime?: unknown;
      items?: unknown;
    };

    const desiredTime =
      typeof body.desiredTime === "string" && body.desiredTime.trim() !== ""
        ? body.desiredTime
        : SERVICE_OPENING_TIME;

    const items = normalizeItems(body.items);

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Choisis au moins une pizza." },
        { status: 400 },
      );
    }

    const uniquePizzaIds = [...new Set(items.map((item) => item.pizzaId))];
    const pizzas = await getPizzasByIds(uniquePizzaIds);

    if (pizzas.length !== uniquePizzaIds.length) {
      return NextResponse.json(
        { error: "Une pizza demandée n'existe pas." },
        { status: 400 },
      );
    }

    const pizzaMap = new Map(pizzas.map((pizza) => [pizza.id, pizza]));

    const totalMinutes = items.reduce((sum, item) => {
      const pizza = pizzaMap.get(item.pizzaId);

      if (!pizza) {
        throw new Error(`Pizza introuvable : ${item.pizzaId}`);
      }

      return sum + pizza.prepMinutes * item.quantity;
    }, 0);

    const orders = await getTodayOccupancy();
    const slots = suggestSlots({
      desiredTime,
      totalMinutes,
      orders,
    });

    const response: QuoteResponse = {
      totalMinutes,
      slots,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de calculer les créneaux." },
      { status: 500 },
    );
  }
}