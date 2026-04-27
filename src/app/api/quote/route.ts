import { NextResponse } from "next/server";
import { getPizzasByIds, getTodayOccupancy, getTodayServiceSettings } from "@/lib/data";
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

    const items = normalizeItems(body.items);
    const todayService = await getTodayServiceSettings();

    if (!todayService.isOpen) {
      return NextResponse.json(
        {
          error: `Le service est fermé aujourd'hui (${todayService.weekdayLabel}).`,
        },
        { status: 409 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Choisis au moins une pizza." },
        { status: 400 },
      );
    }

    const desiredTime =
      typeof body.desiredTime === "string" && body.desiredTime.trim() !== ""
        ? body.desiredTime
        : todayService.opensAt;

    const pizzaIds = [...new Set(items.map((item) => item.pizzaId))];
    const pizzas = await getPizzasByIds(pizzaIds);

    if (pizzas.length !== pizzaIds.length) {
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
      serviceOpeningTime: todayService.opensAt,
      serviceClosingTime: todayService.closesAt,
    });

    const response: QuoteResponse = {
      totalMinutes,
      slots,
      serviceOpeningTime: todayService.opensAt,
      serviceClosingTime: todayService.closesAt,
      weekdayLabel: todayService.weekdayLabel,
      locationName: todayService.location?.name ?? undefined,
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