import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { createPizza, replacePizzaPhotos, updatePizza } from "@/lib/data";
import type { PizzaPhoto } from "@/lib/types";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type ParsedPizzaPhoto = {
  imagePath: string;
  altText: string;
  displayOrder: number;
};

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

function parseExistingPhotos(raw: string, pizzaName: string): ParsedPizzaPhoto[] {
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
    .map((item, index): ParsedPizzaPhoto | null => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const photo = item as Partial<PizzaPhoto>;
      const imagePath = typeof photo.imagePath === "string" ? photo.imagePath : "";

      if (!imagePath.startsWith("/uploads/")) {
        return null;
      }

      const altText =
        typeof photo.altText === "string" && photo.altText.trim()
          ? photo.altText.trim()
          : pizzaName;

      const displayOrder = Number.isInteger(photo.displayOrder)
        ? Number(photo.displayOrder)
        : index * 10;

      return {
        imagePath,
        altText,
        displayOrder,
      };
    })
    .filter((photo): photo is ParsedPizzaPhoto => photo !== null);
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

async function saveUploadedPhotos(files: File[]): Promise<string[]> {
  const paths: string[] = [];

  for (const file of files) {
    paths.push(await saveUploadedPhoto(file));
  }

  return paths;
}

function readPhotoFiles(formData: FormData): File[] {
  const files = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  const legacyPhoto = formData.get("photo");

  if (legacyPhoto instanceof File && legacyPhoto.size > 0) {
    files.push(legacyPhoto);
  }

  return files;
}

async function parseFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const ingredients = String(formData.get("ingredients") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const allergens = String(formData.get("allergens") ?? "").trim();
  const seasonality = String(formData.get("seasonality") ?? "").trim();
  const prepMinutes = Number(formData.get("prepMinutes") ?? 0);
  const active = String(formData.get("active") ?? "true") === "true";
  const priceRaw = String(formData.get("priceEuros") ?? "").trim();
  const existingPhotosRaw = String(formData.get("existingPhotosJson") ?? "");
  const existingPhotoPath =
    String(formData.get("existingPhotoPath") ?? "").trim() || null;

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

  const photoFiles = readPhotoFiles(formData);

  for (const photoFile of photoFiles) {
    if (!photoFile.type.startsWith("image/")) {
      return { error: "Chaque fichier photo doit être une image." };
    }

    if (photoFile.size > MAX_FILE_SIZE_BYTES) {
      return { error: "Une photo dépasse 5 Mo." };
    }
  }

  const existingPhotos = parseExistingPhotos(existingPhotosRaw, name);

  if (existingPhotos.length === 0 && existingPhotoPath) {
    existingPhotos.push({
      imagePath: existingPhotoPath,
      altText: name,
      displayOrder: 0,
    });
  }

  return {
    value: {
      pizza: {
        name,
        ingredients,
        description,
        allergens,
        seasonality,
        prepMinutes,
        active,
        photoPath: existingPhotos[0]?.imagePath ?? null,
        priceCents,
      },
      existingPhotos,
      photoFiles,
    },
  };
}

function buildPhotoList(
  pizzaName: string,
  existingPhotos: ParsedPizzaPhoto[],
  uploadedPhotoPaths: string[],
): ParsedPizzaPhoto[] {
  const photos = existingPhotos.map((photo, index) => ({
    ...photo,
    altText: photo.altText || pizzaName,
    displayOrder: index * 10,
  }));

  for (const path of uploadedPhotoPaths) {
    photos.push({
      imagePath: path,
      altText: pizzaName,
      displayOrder: photos.length * 10,
    });
  }

  return photos;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const parsed = await parseFormData(formData);

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const uploadedPhotoPaths = await saveUploadedPhotos(parsed.value.photoFiles);
    const photos = buildPhotoList(
      parsed.value.pizza.name,
      parsed.value.existingPhotos,
      uploadedPhotoPaths,
    );

    const pizza = await createPizza({
      ...parsed.value.pizza,
      photoPath: photos[0]?.imagePath ?? null,
    });

    const pizzaWithPhotos = await replacePizzaPhotos(pizza.id, photos);

    return NextResponse.json({
      ok: true,
      pizza: pizzaWithPhotos ?? pizza,
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

    const uploadedPhotoPaths = await saveUploadedPhotos(parsed.value.photoFiles);
    const photos = buildPhotoList(
      parsed.value.pizza.name,
      parsed.value.existingPhotos,
      uploadedPhotoPaths,
    );

    const pizza = await updatePizza(pizzaId, {
      ...parsed.value.pizza,
      photoPath: photos[0]?.imagePath ?? null,
    });

    if (!pizza) {
      return NextResponse.json(
        { error: "Pizza introuvable." },
        { status: 404 },
      );
    }

    const pizzaWithPhotos = await replacePizzaPhotos(pizzaId, photos);

    return NextResponse.json({
      ok: true,
      pizza: pizzaWithPhotos ?? pizza,
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
