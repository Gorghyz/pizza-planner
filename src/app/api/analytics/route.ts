import { NextResponse } from "next/server";

import { query } from "@/lib/db";

const MAX_METADATA_LENGTH = 4000;

function getParisDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeEventName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const eventName = value.trim();

  if (!/^[a-z0-9_:-]{1,80}$/i.test(eventName)) {
    return null;
  }

  return eventName;
}

function sanitizePagePath(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const pagePath = value.trim();

  if (!pagePath.startsWith("/") || pagePath.length > 220) {
    return null;
  }

  if (
    pagePath.startsWith("/api") ||
    pagePath.startsWith("/business") ||
    pagePath.startsWith("/admin")
  ) {
    return null;
  }

  return pagePath;
}

function sanitizeMetadata(value: unknown): Record<string, unknown> {
  if (!isPlainObject(value)) {
    return {};
  }

  const safeMetadata: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(value)) {
    if (!/^[a-z0-9_:-]{1,60}$/i.test(key)) {
      continue;
    }

    if (
      typeof rawValue === "string" ||
      typeof rawValue === "number" ||
      typeof rawValue === "boolean" ||
      rawValue === null
    ) {
      safeMetadata[key] = rawValue;
    }
  }

  const serialized = JSON.stringify(safeMetadata);

  if (serialized.length <= MAX_METADATA_LENGTH) {
    return safeMetadata;
  }

  return {
    truncated: true,
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!isPlainObject(body)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventName = sanitizeEventName(body.eventName);
  const pagePath = sanitizePagePath(body.pagePath);

  if (!eventName || !pagePath) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const metadata = sanitizeMetadata(body.metadata);

  await query(
    `
      INSERT INTO analytics_events (
        event_name,
        page_path,
        event_date,
        metadata
      )
      VALUES ($1, $2, $3::date, $4::jsonb)
    `,
    [eventName, pagePath, getParisDateString(), JSON.stringify(metadata)],
  );

  return NextResponse.json({ ok: true });
}
