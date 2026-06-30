export type ParsedGpsCoordinates = {
  latitude: number;
  longitude: number;
  latitudeText: string;
  longitudeText: string;
};

type DmsPart = {
  value: number;
  direction: string;
};

function parseNumber(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  return Number(value.replace(",", "."));
}

function normalizeDirection(direction: string | undefined): string {
  return (direction ?? "").trim().toUpperCase();
}

function formatCoordinate(value: number): string {
  const rounded = Math.abs(value) < 0.0000005 ? 0 : value;
  return rounded.toFixed(6);
}

function buildResult(latitude: number, longitude: number): ParsedGpsCoordinates | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }

  return {
    latitude,
    longitude,
    latitudeText: formatCoordinate(latitude),
    longitudeText: formatCoordinate(longitude),
  };
}

function directionSign(direction: string): number {
  return direction === "S" || direction === "W" || direction === "O" ? -1 : 1;
}

function directionType(direction: string): "latitude" | "longitude" | "unknown" {
  if (direction === "N" || direction === "S") {
    return "latitude";
  }

  if (direction === "E" || direction === "W" || direction === "O") {
    return "longitude";
  }

  return "unknown";
}

function parseDmsCoordinates(input: string): ParsedGpsCoordinates | null {
  const pattern = /([NSEWO])?\s*([+-]?\d{1,3}(?:[.,]\d+)?)\s*(?:°|º|deg|d)\s*(?:(\d{1,2}(?:[.,]\d+)?)\s*(?:'|’|′|min|m))?\s*(?:(\d{1,2}(?:[.,]\d+)?)\s*(?:"|”|″|sec|s))?\s*([NSEWO])?/gi;
  const parts: DmsPart[] = [];

  for (const match of input.matchAll(pattern)) {
    const direction = normalizeDirection(match[1] || match[5]);
    const degrees = parseNumber(match[2]);
    const minutes = parseNumber(match[3]);
    const seconds = parseNumber(match[4]);

    if (!Number.isFinite(degrees) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      continue;
    }

    const sign = degrees < 0 ? -1 : directionSign(direction);
    const value = sign * (Math.abs(degrees) + minutes / 60 + seconds / 3600);

    parts.push({ value, direction });
  }

  if (parts.length < 2) {
    return null;
  }

  const latitudePart = parts.find((part) => directionType(part.direction) === "latitude");
  const longitudePart = parts.find((part) => directionType(part.direction) === "longitude");

  if (latitudePart && longitudePart) {
    return buildResult(latitudePart.value, longitudePart.value);
  }

  return buildResult(parts[0].value, parts[1].value);
}

function extractDecimalPair(input: string): ParsedGpsCoordinates | null {
  const normalized = decodeURIComponent(input).replace(/\u2212/g, "-");

  const urlPatterns = [
    /@\s*(-?\d+(?:[.,]\d+)?)\s*,\s*(-?\d+(?:[.,]\d+)?)/,
    /[?&](?:q|query|ll)=\s*(-?\d+(?:[.,]\d+)?)\s*,\s*(-?\d+(?:[.,]\d+)?)/,
  ];

  for (const pattern of urlPatterns) {
    const match = normalized.match(pattern);

    if (match) {
      return buildResult(parseNumber(match[1]), parseNumber(match[2]));
    }
  }

  const pairPatterns = [
    /(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)/,
    /(-?\d+(?:,\d+)?)\s*;\s*(-?\d+(?:,\d+)?)/,
    /(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)/,
  ];

  for (const pattern of pairPatterns) {
    const match = normalized.match(pattern);

    if (match) {
      return buildResult(parseNumber(match[1]), parseNumber(match[2]));
    }
  }

  const numbers = normalized.match(/-?\d+(?:[.,]\d+)?/g) ?? [];

  if (numbers.length === 2) {
    return buildResult(parseNumber(numbers[0]), parseNumber(numbers[1]));
  }

  return null;
}

export function parseGpsCoordinates(input: string): ParsedGpsCoordinates | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  return parseDmsCoordinates(trimmed) ?? extractDecimalPair(trimmed);
}
