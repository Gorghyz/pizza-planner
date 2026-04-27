import {
  APP_TIME_ZONE,
  DEFAULT_SERVICE_CLOSING_TIME,
  DEFAULT_SERVICE_OPENING_TIME,
} from "@/lib/config";
import type {
  LocationWithHours,
  OpeningHour,
  TodayServiceSettings,
} from "@/lib/types";

export const WEEKDAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 7, label: "Dimanche" },
] as const;

const weekdayNameToIsoWeekday: Record<string, number> = {
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
  dimanche: 7,
};

export function getParisIsoWeekday(date = new Date()): number {
  const weekdayName = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    timeZone: APP_TIME_ZONE,
  })
    .format(date)
    .toLowerCase();

  return weekdayNameToIsoWeekday[weekdayName] ?? 1;
}

export function getWeekdayLabel(isoWeekday: number): string {
  return WEEKDAYS.find((day) => day.value === isoWeekday)?.label ?? "Jour inconnu";
}

export function sortOpeningHours(hours: OpeningHour[]): OpeningHour[] {
  return [...hours].sort((a, b) => a.isoWeekday - b.isoWeekday);
}

export function createDefaultWeekHours(locationId: number): OpeningHour[] {
  return WEEKDAYS.map((day, index) => ({
    id: -(index + 1),
    locationId,
    isoWeekday: day.value,
    isOpen: true,
    opensAt: DEFAULT_SERVICE_OPENING_TIME,
    closesAt: DEFAULT_SERVICE_CLOSING_TIME,
  }));
}

export function buildTodayServiceSettings(
  locations: LocationWithHours[],
): TodayServiceSettings {
  const isoWeekday = getParisIsoWeekday();
  const weekdayLabel = getWeekdayLabel(isoWeekday);

  const activeLocations = locations.filter((location) => location.isActive);

  const defaultLocation =
    activeLocations.find((location) => location.isDefault) ??
    activeLocations[0] ??
    null;

  const openingRule =
    defaultLocation?.hours.find((hour) => hour.isoWeekday === isoWeekday) ?? null;

  if (!defaultLocation || !openingRule) {
    return {
      location: defaultLocation,
      isoWeekday,
      weekdayLabel,
      isOpen: true,
      opensAt: DEFAULT_SERVICE_OPENING_TIME,
      closesAt: DEFAULT_SERVICE_CLOSING_TIME,
      openingRule: null,
    };
  }

  if (!openingRule.isOpen || !openingRule.opensAt || !openingRule.closesAt) {
    return {
      location: defaultLocation,
      isoWeekday,
      weekdayLabel,
      isOpen: false,
      opensAt: DEFAULT_SERVICE_OPENING_TIME,
      closesAt: DEFAULT_SERVICE_CLOSING_TIME,
      openingRule,
    };
  }

  return {
    location: defaultLocation,
    isoWeekday,
    weekdayLabel,
    isOpen: true,
    opensAt: openingRule.opensAt,
    closesAt: openingRule.closesAt,
    openingRule,
  };
}