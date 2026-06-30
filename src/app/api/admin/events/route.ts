import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { saveBusinessEvent } from "@/lib/events";
import type { BusinessEventImage, BusinessEventStatus } from "@/lib/types";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const EVENT_STATUSES: BusinessEventStatus[] = ["draft", "published", "archived"];

type ParsedEventImage = Omit<BusinessEventImage, "id" | "eventId">;

function getImageExtension(filename: string, mimeType: string): string {
  const extension = path.extname(filename).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension)) {
    return extension;
  }

  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return "";
  }
}

function parseNullableInteger(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseNullableCoordinate(raw: FormDataEntryValue | null, min: number, max: number): number | null {
  const value = String(raw ?? "").trim().replace(",", ".");

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function parseStatus(raw: string): BusinessEventStatus {
  return EVENT_STATUSES.includes(raw as BusinessEventStatus)
    ? (raw as BusinessEventStatus)
    : "draft";
}

function parsePizzaIds(raw: string): number[] {
  if (!raw.trim()) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function parseExistingImages(raw: string, title: string): ParsedEventImage[] {
  if (!raw.trim()) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((item, index): ParsedEventImage | null => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const image = item as Partial<BusinessEventImage>;
      const imagePath = typeof image.imagePath === "string" ? image.imagePath : "";

      if (!imagePath.startsWith("/uploads/")) {
        return null;
      }

      return {
        imagePath,
        altText:
          typeof image.altText === "string" && image.altText.trim()
            ? image.altText.trim()
            : title,
        displayOrder: index * 10,
      };
    })
    .filter((image): image is ParsedEventImage => image !== null);
}

function readImageFiles(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

async function saveUploadedImage(image: File): Promise<string> {
  const extension = getImageExtension(image.name, image.type);

  if (!extension) {
    throw new Error("Format d'image non pris en charge.");
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "events");
  await mkdir(uploadsDir, { recursive: true });

  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  const fullPath = path.join(uploadsDir, filename);
  const arrayBuffer = await image.arrayBuffer();

  await writeFile(fullPath, Buffer.from(arrayBuffer));

  return `/uploads/events/${filename}`;
}

async function saveUploadedImages(files: File[]): Promise<string[]> {
  const paths: string[] = [];

  for (const file of files) {
    paths.push(await saveUploadedImage(file));
  }

  return paths;
}

async function parseFormData(formData: FormData) {
  const eventId = parseNullableInteger(formData.get("eventId"));
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const status = parseStatus(String(formData.get("status") ?? "draft"));
  const serviceDate = String(formData.get("serviceDate") ?? "").trim();
  const opensAt = String(formData.get("opensAt") ?? "").trim();
  const closesAt = String(formData.get("closesAt") ?? "").trim();
  const visibleFrom = String(formData.get("visibleFrom") ?? "").trim() || null;
  const orderOpensAt = String(formData.get("orderOpensAt") ?? "").trim() || null;
  const orderClosesAt = String(formData.get("orderClosesAt") ?? "").trim() || null;
  const locationId = parseNullableInteger(formData.get("locationId"));
  const locationName = String(formData.get("locationName") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const latitude = parseNullableCoordinate(formData.get("latitude"), -90, 90);
  const longitude = parseNullableCoordinate(formData.get("longitude"), -180, 180);
  const description = String(formData.get("description") ?? "").trim();
  const publicNote = String(formData.get("publicNote") ?? "").trim();
  const capacityPizzas = parseNullableInteger(formData.get("capacityPizzas"));
  const slotCapacityPizzas = parseNullableInteger(formData.get("slotCapacityPizzas"));
  const pizzaIds = parsePizzaIds(String(formData.get("pizzaIdsJson") ?? ""));
  const existingImages = parseExistingImages(
    String(formData.get("existingImagesJson") ?? ""),
    title,
  );
  const imageFiles = readImageFiles(formData);

  if (!title) {
    return { error: "Le nom de l'événement est obligatoire." };
  }

  for (const imageFile of imageFiles) {
    if (!imageFile.type.startsWith("image/")) {
      return { error: "Chaque fichier image doit être une image." };
    }

    if (imageFile.size > MAX_FILE_SIZE_BYTES) {
      return { error: "Une image dépasse 5 Mo." };
    }
  }

  return {
    value: {
      event: {
        id: eventId ?? undefined,
        title,
        slug,
        status,
        serviceDate,
        opensAt,
        closesAt,
        visibleFrom,
        orderOpensAt,
        orderClosesAt,
        locationId,
        locationName,
        address,
        city,
        latitude,
        longitude,
        description,
        publicNote,
        capacityPizzas,
        slotCapacityPizzas,
        pizzaIds,
        images: existingImages,
      },
      imageFiles,
    },
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const parsed = await parseFormData(formData);

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const uploadedImagePaths = await saveUploadedImages(parsed.value.imageFiles);
    const images = [
      ...parsed.value.event.images,
      ...uploadedImagePaths.map((imagePath, index) => ({
        imagePath,
        altText: parsed.value.event.title,
        displayOrder: (parsed.value.event.images.length + index) * 10,
      })),
    ];

    const event = await saveBusinessEvent({
      ...parsed.value.event,
      images,
    });

    return NextResponse.json({ ok: true, event });
  } catch (error) {
    console.error(error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: "Un événement utilise déjà ce slug." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer l'événement.",
      },
      { status: 500 },
    );
  }
}

export const PUT = POST;
