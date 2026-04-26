import {
  SERVICE_CLOSING_TIME,
  SERVICE_OPENING_TIME,
  SLOT_STEP_MINUTES,
  SLOT_SUGGESTION_COUNT,
} from "@/lib/config";
import type { OccupancyOrder } from "@/lib/types";

export function timeToMinutes(time: string): number {
  const parts = time.split(":");

  if (parts.length !== 2) {
    throw new Error(`Heure invalide : ${time}`);
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Heure invalide : ${time}`);
  }

  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}`;
}

export function isValidTimeString(value: string): boolean {
  try {
    timeToMinutes(value);
    return true;
  } catch {
    return false;
  }
}

function roundUp(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

export function suggestSlots(params: {
  desiredTime: string;
  totalMinutes: number;
  orders: OccupancyOrder[];
}): string[] {
  const { desiredTime, totalMinutes, orders } = params;

  if (totalMinutes <= 0) {
    return [];
  }

  const opening = timeToMinutes(SERVICE_OPENING_TIME);
  const closing = timeToMinutes(SERVICE_CLOSING_TIME);
  const desired = isValidTimeString(desiredTime)
    ? timeToMinutes(desiredTime)
    : opening;

  const occupied = orders
    .map((order) => {
      const end = timeToMinutes(order.promisedTime);
      const start = end - order.totalMinutes;

      return {
        start,
        end,
      };
    })
    .sort((a, b) => a.start - b.start);

  const firstCandidate = roundUp(
    Math.max(desired, opening + totalMinutes),
    SLOT_STEP_MINUTES,
  );

  const slots: string[] = [];

  for (
    let candidateEnd = firstCandidate;
    candidateEnd <= closing;
    candidateEnd += SLOT_STEP_MINUTES
  ) {
    const candidateStart = candidateEnd - totalMinutes;

    if (candidateStart < opening) {
      continue;
    }

    const overlaps = occupied.some((interval) => {
      return candidateStart < interval.end && candidateEnd > interval.start;
    });

    if (!overlaps) {
      slots.push(minutesToTime(candidateEnd));
    }

    if (slots.length >= SLOT_SUGGESTION_COUNT) {
      break;
    }
  }

  return slots;
}