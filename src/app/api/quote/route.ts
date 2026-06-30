import { NextResponse } from "next/server";

import {
  getOccupancyForDate,
  getPizzasByIds,
  getServiceSettingsForDate,
  getTodayOccupancy,
  getTodayServiceSettings,
} from "@/lib/data";
import { formatDateLong, getParisDateString, isDateString } from "@/lib/dates";
import {
  getEventSlotPizzaCounts,
  getPublishedBusinessEventBySlug,
  isBusinessEventOrderingOpen,
} from "@/lib/events";
import { suggestSlots } from "@/lib/scheduler";
import type { DraftItem, Pizza, QuoteResponse } from "@/lib/types";

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

function getTotalMinutes(items: DraftItem[], pizzas: Pizza[]): number {
  const pizzaMap = new Map(pizzas.map((pizza) => [pizza.id, pizza]));

  return items.reduce((sum, item) => {
    const pizza = pizzaMap.get(item.pizzaId);

    if (!pizza) {
      throw new Error(`Pizza introuvable : ${item.pizzaId}`);
    }

    return sum + pizza.prepMinutes * item.quantity;
  }, 0);
}

function getTotalPizzas(items: DraftItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      desiredTime?: unknown;
      items?: unknown;
      eventSlug?: unknown;
      serviceDate?: unknown;
    };

    const items = normalizeItems(body.items);
    const eventSlug =
      typeof body.eventSlug === "string" ? body.eventSlug.trim() : "";

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
      const requestedPizzaIds = [...new Set(items.map((item) => item.pizzaId))];

      if (requestedPizzaIds.some((pizzaId) => !eventPizzaIds.has(pizzaId))) {
        return NextResponse.json(
          { error: "Une pizza demandée n'est pas disponible pour cet événement." },
          { status: 400 },
        );
      }

      const pizzas = event.pizzas.filter((pizza) => requestedPizzaIds.includes(pizza.id));
      const totalMinutes = getTotalMinutes(items, pizzas);
      const totalPizzas = getTotalPizzas(items);

      if (
        event.capacityPizzas !== null &&
        (event.totalRequestedPizzas ?? 0) + totalPizzas > event.capacityPizzas
      ) {
        return NextResponse.json(
          {
            error:
              "La limite de pizzas prévue pour cet événement est atteinte ou presque atteinte.",
          },
          { status: 409 },
        );
      }

      const desiredTime =
        typeof body.desiredTime === "string" && body.desiredTime.trim() !== ""
          ? body.desiredTime
          : event.opensAt;

      const orders = await getOccupancyForDate(event.serviceDate);
      let slots = suggestSlots({
        desiredTime,
        totalMinutes,
        orders,
        serviceOpeningTime: event.opensAt,
        serviceClosingTime: event.closesAt,
      });

      if (event.slotCapacityPizzas !== null) {
        const slotPizzaCounts = await getEventSlotPizzaCounts(event.id);

        slots = slots.filter(
          (slot) =>
            (slotPizzaCounts.get(slot) ?? 0) + totalPizzas <=
            event.slotCapacityPizzas!,
        );
      }

      const response: QuoteResponse = {
        totalMinutes,
        slots,
        serviceDate: event.serviceDate,
        serviceDateLabel: event.serviceDateLabel,
        serviceOpeningTime: event.opensAt,
        serviceClosingTime: event.closesAt,
        locationName: event.locationName || event.city || undefined,
        eventTitle: event.title,
      };

      return NextResponse.json(response);
    }

    const todayDate = getParisDateString();
    const requestedServiceDate =
      typeof body.serviceDate === "string" && isDateString(body.serviceDate.trim())
        ? body.serviceDate.trim()
        : todayDate;
    const isToday = requestedServiceDate === todayDate;
    const service = isToday
      ? await getTodayServiceSettings()
      : await getServiceSettingsForDate(requestedServiceDate);

    if (!service.isOpen) {
      return NextResponse.json(
        {
          error: `Le service est fermé le ${formatDateLong(requestedServiceDate)} (${service.weekdayLabel}).`,
        },
        { status: 409 },
      );
    }

    const desiredTime =
      typeof body.desiredTime === "string" && body.desiredTime.trim() !== ""
        ? body.desiredTime
        : service.opensAt;

    const pizzaIds = [...new Set(items.map((item) => item.pizzaId))];
    const pizzas = await getPizzasByIds(pizzaIds);

    if (pizzas.length !== pizzaIds.length) {
      return NextResponse.json(
        { error: "Une pizza demandée n'existe pas." },
        { status: 400 },
      );
    }

    const totalMinutes = getTotalMinutes(items, pizzas);
    const orders = isToday ? await getTodayOccupancy() : await getOccupancyForDate(requestedServiceDate);

    const slots = suggestSlots({
      desiredTime,
      totalMinutes,
      orders,
      serviceOpeningTime: service.opensAt,
      serviceClosingTime: service.closesAt,
    });

    const response: QuoteResponse = {
      totalMinutes,
      slots,
      serviceOpeningTime: service.opensAt,
      serviceClosingTime: service.closesAt,
      serviceDate: requestedServiceDate,
      serviceDateLabel: formatDateLong(requestedServiceDate),
      weekdayLabel: service.weekdayLabel,
      locationName: service.location?.name ?? undefined,
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
