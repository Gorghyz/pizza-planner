import {
  DEFAULT_SERVICE_CLOSING_TIME,
  DEFAULT_SERVICE_OPENING_TIME,
  DEFAULT_SLOT_STEP_MINUTES,
} from "@/lib/config";
import type { OccupancyOrder } from "@/lib/types";

type SuggestSlotsInput = {
  desiredTime: string;
  totalMinutes: number;
  orders: OccupancyOrder[];
  serviceOpeningTime?: string;
  serviceClosingTime?: string;
  slotStepMinutes?: number;
  maxSuggestions?: number;
};

function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutesToTime(value: number): string {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA;
}

export function suggestSlots({
  desiredTime,
  totalMinutes,
  orders,
  serviceOpeningTime = DEFAULT_SERVICE_OPENING_TIME,
  serviceClosingTime = DEFAULT_SERVICE_CLOSING_TIME,
  slotStepMinutes = DEFAULT_SLOT_STEP_MINUTES,
  maxSuggestions = 8,
}: SuggestSlotsInput): string[] {
  const openingMinutes = parseTimeToMinutes(serviceOpeningTime);
  const closingMinutes = parseTimeToMinutes(serviceClosingTime);
  const desiredMinutes = parseTimeToMinutes(desiredTime);

  if (totalMinutes <= 0 || openingMinutes >= closingMinutes) {
    return [];
  }

  const candidates: number[] = [];

  for (
    let promisedMinutes = openingMinutes;
    promisedMinutes <= closingMinutes;
    promisedMinutes += slotStepMinutes
  ) {
    const startMinutes = promisedMinutes - totalMinutes;

    if (startMinutes < openingMinutes) {
      continue;
    }

    if (promisedMinutes > closingMinutes) {
      continue;
    }

    const hasOverlap = orders.some((order) => {
      const orderPromised = parseTimeToMinutes(order.promisedTime);
      const orderStart = orderPromised - order.totalMinutes;

      return rangesOverlap(
        startMinutes,
        promisedMinutes,
        orderStart,
        orderPromised,
      );
    });

    if (!hasOverlap) {
      candidates.push(promisedMinutes);
    }
  }

  candidates.sort((a, b) => {
    const distanceA = Math.abs(a - desiredMinutes);
    const distanceB = Math.abs(b - desiredMinutes);

    if (distanceA !== distanceB) {
      return distanceA - distanceB;
    }

    return a - b;
  });

  return candidates.slice(0, maxSuggestions).map(formatMinutesToTime);
}