import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createPizza, updatePizza } from "@/lib/data";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

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

function parsePriceToCents(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const value = Number(normalized);

  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value * 100);
}

async function saveUploadedPhoto(photo: File): Promise<string> {
  const extension = getImageExtension(photo.name, photo.type);

  if (!extension) {
    throw new Error("Format d'image non pris en charge.");
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "pizzas");
  await mkdir(uploadsDir, { recursive: true });

  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  const fullPath = path.join(uploadsDir, filename);

  const arrayBuffer = await photo.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await writeFile(fullPath, buffer);

  return `/uploads/pizzas/${filename}`;
}

async function parseFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const ingredients = String(formData.get("ingredients") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const allergens = String(formData.get("allergens") ?? "").trim();
  const seasonality = String(formData.get("seasonality") ?? "").trim();
  const prepMinutes = Number(formData.get("prepMinutes") ?? 0);
  const active = String(formData.get("active") ?? "true") === "true";
  const existingPhotoPath =
    String(formData.get("existingPhotoPath") ?? "").trim() || null;
  const priceRaw = String(formData.get("priceEuros") ?? "").trim();

  if (!name) {
    return { error: "Le nom de la pizza est obligatoire." };
  }

  if (!Number.isInteger(prepMinutes) || prepMinutes <= 0) {
    return { error: "Le temps de préparation doit être un entier positif." };
  }

  const priceCents = parsePriceToCents(priceRaw);

  if (priceCents === null) {
    return { error: "Le prix doit être un nombre valide, par exemple 12.50" };
  }

  let photoPath: string | null = existingPhotoPath;
  const photoValue = formData.get("photo");

  if (photoValue instanceof File && photoValue.size > 0) {
    if (!photoValue.type.startsWith("image/")) {
      return { error: "Le fichier photo doit être une image." };
    }

    if (photoValue.size > MAX_FILE_SIZE_BYTES) {
      return { error: "La photo dépasse 5 Mo." };
    }

    photoPath = await saveUploadedPhoto(photoValue);
  }

  return {
    value: {
      name,
      ingredients,
      description,
      allergens,
      seasonality,
      prepMinutes,
      active,
      photoPath,
      priceCents,
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

    const pizza = await createPizza(parsed.value);

    return NextResponse.json({
      ok: true,
      pizza,
    });
  } catch (error) {
    console.error(error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: "Une pizza avec ce nom existe déjà." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Impossible de créer la pizza." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const formData = await request.formData();
    const pizzaId = Number(formData.get("pizzaId") ?? 0);

    if (!Number.isInteger(pizzaId) || pizzaId <= 0) {
      return NextResponse.json(
        { error: "Identifiant de pizza invalide." },
        { status: 400 },
      );
    }

    const parsed = await parseFormData(formData);

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const pizza = await updatePizza(pizzaId, parsed.value);

    if (!pizza) {
      return NextResponse.json(
        { error: "Pizza introuvable." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      pizza,
    });
  } catch (error) {
    console.error(error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: "Une pizza avec ce nom existe déjà." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Impossible de modifier la pizza." },
      { status: 500 },
    );
  }
}