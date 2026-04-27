import { NextResponse } from "next/server";
import {
  createCustomerRequest,
  getPizzasByIds,
  getTodayOccupancy,
  getTodayServiceSettings,
} from "@/lib/data";
import { suggestSlots } from "@/lib/scheduler";
import type { CustomerRequestItem, DraftItem } from "@/lib/types";

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

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "").trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      customerName?: unknown;
      customerPhone?: unknown;
      desiredTime?: unknown;
      selectedSlot?: unknown;
      notes?: unknown;
      items?: unknown;
    };

    const customerName =
      typeof body.customerName === "string" ? body.customerName.trim() : "";
    const customerPhone =
      typeof body.customerPhone === "string"
        ? normalizePhone(body.customerPhone)
        : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const selectedSlot =
      typeof body.selectedSlot === "string" ? body.selectedSlot.trim() : "";
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

    const desiredTime =
      typeof body.desiredTime === "string" && body.desiredTime.trim() !== ""
        ? body.desiredTime
        : todayService.opensAt;

    if (!customerName) {
      return NextResponse.json(
        { error: "Le nom ou prénom est obligatoire." },
        { status: 400 },
      );
    }

    if (!customerPhone || customerPhone.replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        {
          error: "Le téléphone est obligatoire pour une demande depuis ordinateur.",
        },
        { status: 400 },
      );
    }

    if (!selectedSlot) {
      return NextResponse.json(
        { error: "Choisis un créneau proposé." },
        { status: 400 },
      );
    }

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
      serviceOpeningTime: todayService.opensAt,
      serviceClosingTime: todayService.closesAt,
    });

    if (!slots.includes(selectedSlot)) {
      return NextResponse.json(
        {
          error:
            "Le créneau choisi n'est plus disponible. Recalcule les créneaux.",
        },
        { status: 409 },
      );
    }

    const requestItems: CustomerRequestItem[] = items.map((item) => {
      const pizza = pizzaMap.get(item.pizzaId);

      if (!pizza) {
        throw new Error(`Pizza introuvable : ${item.pizzaId}`);
      }

      return {
        pizzaId: pizza.id,
        pizzaName: pizza.name,
        quantity: item.quantity,
        unitPriceCents: pizza.priceCents,
      };
    });

    const itemSummary = requestItems
      .map((item) => `${item.quantity} x ${item.pizzaName}`)
      .join(", ");

    const totalPizzas = requestItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    const totalPriceCents = requestItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceCents,
      0,
    );

    const customerRequest = await createCustomerRequest({
      customerName,
      customerPhone,
      desiredTime,
      selectedSlot,
      notes,
      itemSummary,
      itemsJson: requestItems,
      totalPizzas,
      totalPriceCents,
      totalMinutes,
      source: "desktop",
    });

    return NextResponse.json({
      ok: true,
      customerRequest,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible d'enregistrer la demande." },
      { status: 500 },
    );
  }
}