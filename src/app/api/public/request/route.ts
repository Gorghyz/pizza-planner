import { NextResponse } from "next/server";

import {
  createCustomerRequest,
  getOccupancyForDate,
  getPizzasByIds,
  getTodayOccupancy,
  getTodayServiceSettings,
} from "@/lib/data";
import { getParisDateString } from "@/lib/dates";
import {
  getEventSlotPizzaCounts,
  getPublishedBusinessEventBySlug,
  isBusinessEventOrderingOpen,
} from "@/lib/events";
import { notifyCustomerRequestCreated } from "@/lib/notifications";
import { suggestSlots } from "@/lib/scheduler";
import type { CustomerRequestItem, DraftItem, Pizza } from "@/lib/types";

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

function getTotals(items: DraftItem[], pizzas: Pizza[]) {
  const pizzaMap = new Map(pizzas.map((pizza) => [pizza.id, pizza]));

  const totalMinutes = items.reduce((sum, item) => {
    const pizza = pizzaMap.get(item.pizzaId);

    if (!pizza) {
      throw new Error(`Pizza introuvable : ${item.pizzaId}`);
    }

    return sum + pizza.prepMinutes * item.quantity;
  }, 0);

  const totalPizzas = items.reduce((sum, item) => sum + item.quantity, 0);

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

  const totalPriceCents = requestItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );

  const itemSummary = requestItems
    .map((item) => `${item.quantity} x ${item.pizzaName}`)
    .join(", ");

  return {
    requestItems,
    itemSummary,
    totalMinutes,
    totalPizzas,
    totalPriceCents,
  };
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
      eventSlug?: unknown;
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
    const eventSlug =
      typeof body.eventSlug === "string" ? body.eventSlug.trim() : "";
    const items = normalizeItems(body.items);

    if (!customerName) {
      return NextResponse.json(
        { error: "Le nom ou prénom est obligatoire." },
        { status: 400 },
      );
    }

    if (!customerPhone || customerPhone.replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        {
          error: "Le téléphone est obligatoire pour confirmer la demande.",
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

    if (eventSlug) {
      const event = await getPublishedBusinessEventBySlug(eventSlug);

      if (!event) {
        return NextResponse.json(
          { error: "Événement introuvable." },
          { status: 404 },
        );
      }

      if (!isBusinessEventOrderingOpen(event)) {
        return NextResponse.json(
          { error: "Les précommandes ne sont pas ouvertes pour cet événement." },
          { status: 409 },
        );
      }

      const eventPizzaIds = new Set(event.pizzas.map((pizza) => pizza.id));
      const uniquePizzaIds = [...new Set(items.map((item) => item.pizzaId))];

      if (uniquePizzaIds.some((pizzaId) => !eventPizzaIds.has(pizzaId))) {
        return NextResponse.json(
          { error: "Une pizza demandée n'est pas disponible pour cet événement." },
          { status: 400 },
        );
      }

      const pizzas = event.pizzas.filter((pizza) => uniquePizzaIds.includes(pizza.id));
      const totals = getTotals(items, pizzas);
      const desiredTime =
        typeof body.desiredTime === "string" && body.desiredTime.trim() !== ""
          ? body.desiredTime
          : event.opensAt;

      if (
        event.capacityPizzas !== null &&
        (event.totalRequestedPizzas ?? 0) + totals.totalPizzas > event.capacityPizzas
      ) {
        return NextResponse.json(
          {
            error:
              "La limite de pizzas prévue pour cet événement est atteinte ou presque atteinte.",
          },
          { status: 409 },
        );
      }

      const orders = await getOccupancyForDate(event.serviceDate);
      let slots = suggestSlots({
        desiredTime,
        totalMinutes: totals.totalMinutes,
        orders,
        serviceOpeningTime: event.opensAt,
        serviceClosingTime: event.closesAt,
      });

      if (event.slotCapacityPizzas !== null) {
        const slotPizzaCounts = await getEventSlotPizzaCounts(event.id);

        slots = slots.filter(
          (slot) =>
            (slotPizzaCounts.get(slot) ?? 0) + totals.totalPizzas <=
            event.slotCapacityPizzas!,
        );
      }

      if (!slots.includes(selectedSlot)) {
        return NextResponse.json(
          {
            error: "Le créneau choisi n'est plus disponible. Recalcule les créneaux.",
          },
          { status: 409 },
        );
      }

      const customerRequest = await createCustomerRequest({
        serviceDate: event.serviceDate,
        eventId: event.id,
        customerName,
        customerPhone,
        desiredTime,
        selectedSlot,
        notes,
        itemSummary: totals.itemSummary,
        itemsJson: totals.requestItems,
        totalPizzas: totals.totalPizzas,
        totalPriceCents: totals.totalPriceCents,
        totalMinutes: totals.totalMinutes,
        source: "desktop",
      });

      await notifyCustomerRequestCreated({
        requestId: customerRequest.id,
        totalPizzas: totals.totalPizzas,
        totalPriceCents: totals.totalPriceCents,
        selectedSlot,
        serviceDate: event.serviceDateLabel,
        eventTitle: event.title,
      });

      return NextResponse.json({
        ok: true,
        customerRequest,
      });
    }

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

    const uniquePizzaIds = [...new Set(items.map((item) => item.pizzaId))];
    const pizzas = await getPizzasByIds(uniquePizzaIds);

    if (pizzas.length !== uniquePizzaIds.length) {
      return NextResponse.json(
        { error: "Une pizza demandée n'existe pas." },
        { status: 400 },
      );
    }

    const totals = getTotals(items, pizzas);
    const orders = await getTodayOccupancy();

    const slots = suggestSlots({
      desiredTime,
      totalMinutes: totals.totalMinutes,
      orders,
      serviceOpeningTime: todayService.opensAt,
      serviceClosingTime: todayService.closesAt,
    });

    if (!slots.includes(selectedSlot)) {
      return NextResponse.json(
        {
          error: "Le créneau choisi n'est plus disponible. Recalcule les créneaux.",
        },
        { status: 409 },
      );
    }

    const customerRequest = await createCustomerRequest({
      serviceDate: getParisDateString(),
      eventId: null,
      customerName,
      customerPhone,
      desiredTime,
      selectedSlot,
      notes,
      itemSummary: totals.itemSummary,
      itemsJson: totals.requestItems,
      totalPizzas: totals.totalPizzas,
      totalPriceCents: totals.totalPriceCents,
      totalMinutes: totals.totalMinutes,
      source: "desktop",
    });

    await notifyCustomerRequestCreated({
      requestId: customerRequest.id,
      totalPizzas: totals.totalPizzas,
      totalPriceCents: totals.totalPriceCents,
      selectedSlot,
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
