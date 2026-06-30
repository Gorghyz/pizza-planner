import { NextResponse } from "next/server";
import {
  createOrder,
  getCustomerRequestByIdForConversion,
  getOccupancyForDate,
  getPizzasByIds,
  updateCustomerRequestStatus,
} from "@/lib/data";
import { getBusinessEventById } from "@/lib/events";
import { suggestSlots } from "@/lib/scheduler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      requestId?: unknown;
    };

    const requestId = Number(body.requestId);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return NextResponse.json(
        { error: "Identifiant de demande invalide." },
        { status: 400 },
      );
    }

    const customerRequest = await getCustomerRequestByIdForConversion(requestId);

    if (!customerRequest) {
      return NextResponse.json(
        { error: "Demande introuvable." },
        { status: 404 },
      );
    }

    const items = Array.isArray(customerRequest.itemsJson)
      ? customerRequest.itemsJson
      : [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "La demande ne contient aucun article exploitable." },
        { status: 400 },
      );
    }

    const pizzaIds = [...new Set(items.map((item) => item.pizzaId))];
    const pizzas = await getPizzasByIds(pizzaIds);

    if (pizzas.length !== pizzaIds.length) {
      return NextResponse.json(
        { error: "Une pizza de la demande n'existe plus." },
        { status: 409 },
      );
    }

    const pizzaMap = new Map(pizzas.map((pizza) => [pizza.id, pizza]));
    const event = customerRequest.eventId
      ? await getBusinessEventById(customerRequest.eventId)
      : null;

    const occupancy = await getOccupancyForDate(customerRequest.serviceDate);
    const slots = suggestSlots({
      desiredTime: customerRequest.desiredTime,
      totalMinutes: customerRequest.totalMinutes,
      orders: occupancy,
      serviceOpeningTime: event?.opensAt,
      serviceClosingTime: event?.closesAt,
    });

    if (!slots.includes(customerRequest.selectedSlot)) {
      return NextResponse.json(
        {
          error:
            "Le créneau demandé n'est plus disponible. Reprends la commande manuellement.",
        },
        { status: 409 },
      );
    }

    const orderId = await createOrder({
      serviceDate: customerRequest.serviceDate,
      eventId: customerRequest.eventId,
      customerName: customerRequest.customerName,
      desiredTime: customerRequest.desiredTime,
      promisedTime: customerRequest.selectedSlot,
      notes: customerRequest.notes ?? "",
      totalMinutes: customerRequest.totalMinutes,
      items: items.map((item) => {
        const pizza = pizzaMap.get(item.pizzaId);

        if (!pizza) {
          throw new Error(`Pizza introuvable : ${item.pizzaId}`);
        }

        return {
          pizzaId: item.pizzaId,
          quantity: item.quantity,
          unitMinutes: pizza.prepMinutes,
          comment: "",
        };
      }),
    });

    await updateCustomerRequestStatus(requestId, "resolved");

    return NextResponse.json({
      ok: true,
      orderId,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de convertir la demande en commande." },
      { status: 500 },
    );
  }
}
