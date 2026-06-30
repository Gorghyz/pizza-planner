import { NextResponse } from "next/server";
import {
  getCustomerRequestByIdForConversion,
  getOccupancyForDate,
  getServiceSettingsForDate,
} from "@/lib/data";
import { getBusinessEventById, getEventSlotPizzaCounts } from "@/lib/events";
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

    if (customerRequest.status === "resolved") {
      return NextResponse.json(
        { error: "Cette demande est déjà traitée." },
        { status: 409 },
      );
    }

    const occupancy = await getOccupancyForDate(customerRequest.serviceDate);
    const event = customerRequest.eventId
      ? await getBusinessEventById(customerRequest.eventId)
      : null;

    let serviceOpeningTime: string;
    let serviceClosingTime: string;

    if (event) {
      serviceOpeningTime = event.opensAt;
      serviceClosingTime = event.closesAt;
    } else {
      const service = await getServiceSettingsForDate(customerRequest.serviceDate);

      if (!service.isOpen) {
        return NextResponse.json(
          { error: "Le service est fermé pour cette date." },
          { status: 409 },
        );
      }

      serviceOpeningTime = service.opensAt;
      serviceClosingTime = service.closesAt;
    }

    let slots = suggestSlots({
      desiredTime: customerRequest.selectedSlot,
      totalMinutes: customerRequest.totalMinutes,
      orders: occupancy,
      serviceOpeningTime,
      serviceClosingTime,
      maxSuggestions: 12,
    });

    if (event?.slotCapacityPizzas !== null && event?.slotCapacityPizzas !== undefined) {
      const slotPizzaCounts = await getEventSlotPizzaCounts(event.id);
      const currentSlotCount = slotPizzaCounts.get(customerRequest.selectedSlot) ?? 0;

      slotPizzaCounts.set(
        customerRequest.selectedSlot,
        Math.max(0, currentSlotCount - customerRequest.totalPizzas),
      );

      slots = slots.filter(
        (slot) =>
          (slotPizzaCounts.get(slot) ?? 0) + customerRequest.totalPizzas <=
          event.slotCapacityPizzas!,
      );
    }

    return NextResponse.json({
      ok: true,
      slots,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de charger les créneaux disponibles." },
      { status: 500 },
    );
  }
}
