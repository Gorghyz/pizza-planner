import { NextResponse } from "next/server";
import { createOrder, getPizzasByIds, getTodayOccupancy } from "@/lib/data";
import { SERVICE_OPENING_TIME } from "@/lib/config";
import { suggestSlots } from "@/lib/scheduler";
import type { DraftItem } from "@/lib/types";

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
      customerName?: unknown;
      desiredTime?: unknown;
      promisedTime?: unknown;
      notes?: unknown;
      items?: unknown;
    };

    const customerName =
      typeof body.customerName === "string" ? body.customerName.trim() : "";
    const desiredTime =
      typeof body.desiredTime === "string" && body.desiredTime.trim() !== ""
        ? body.desiredTime
        : SERVICE_OPENING_TIME;
    const promisedTime =
      typeof body.promisedTime === "string" ? body.promisedTime.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const items = normalizeItems(body.items);

    if (!customerName) {
      return NextResponse.json(
        { error: "Le nom ou prénom est obligatoire." },
        { status: 400 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Choisis au moins une pizza." },
        { status: 400 },
      );
    }

    if (!promisedTime) {
      return NextResponse.json(
        { error: "Choisis un créneau proposé." },
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

    if (!slots.includes(promisedTime)) {
      return NextResponse.json(
        {
          error:
            "Le créneau choisi n'est plus disponible. Recalcule les créneaux.",
        },
        { status: 409 },
      );
    }

    const orderId = await createOrder({
      customerName,
      desiredTime,
      promisedTime,
      notes,
      totalMinutes,
      items: items.map((item) => {
        const pizza = pizzaMap.get(item.pizzaId);

        if (!pizza) {
          throw new Error(`Pizza introuvable : ${item.pizzaId}`);
        }

        return {
          ...item,
          unitMinutes: pizza.prepMinutes,
        };
      }),
    });

    return NextResponse.json({
      ok: true,
      orderId,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible d'enregistrer la commande." },
      { status: 500 },
    );
  }
}