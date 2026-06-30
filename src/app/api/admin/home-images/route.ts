import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import {
  activateHomeImage,
  createHomeImage,
  getAllHomeImagesForAdmin,
} from "@/lib/home-images";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

function getImageExtension(filename: string, mimeType: string): string {
  const extension = path.extname(filename).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
    return extension;
  }

  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return "";
  }
}

async function saveUploadedImage(image: File): Promise<string> {
  const extension = getImageExtension(image.name, image.type);

  if (!extension) {
    throw new Error("Format d'image non pris en charge.");
  }

  const uploadsDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "home-images",
  );

  await mkdir(uploadsDir, { recursive: true });

  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  const fullPath = path.join(uploadsDir, filename);
  const arrayBuffer = await image.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await writeFile(fullPath, buffer);

  return `/uploads/home-images/${filename}`;
}

export async function GET() {
  try {
    const images = await getAllHomeImagesForAdmin();

    return NextResponse.json({
      ok: true,
      images,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de charger les images d'accueil." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const title = String(formData.get("title") ?? "").trim();
    const altText = String(formData.get("altText") ?? "").trim();
    const imageValue = formData.get("image");

    if (!(imageValue instanceof File) || imageValue.size <= 0) {
      return NextResponse.json(
        { error: "Choisis une image à envoyer." },
        { status: 400 },
      );
    }

    if (!imageValue.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Le fichier doit être une image." },
        { status: 400 },
      );
    }

    if (imageValue.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "L'image dépasse 8 Mo." },
        { status: 400 },
      );
    }

    const imagePath = await saveUploadedImage(imageValue);

    await createHomeImage({
      imagePath,
      title: title || "Bandeau pizzas",
      altText: altText || title || "Pizzas du moment À table tonton !",
    });

    const images = await getAllHomeImagesForAdmin();

    return NextResponse.json({
      ok: true,
      images,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible d'envoyer l'image d'accueil." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { imageId?: unknown };
    const imageId = Number(body.imageId ?? 0);

    if (!Number.isInteger(imageId) || imageId <= 0) {
      return NextResponse.json(
        { error: "Identifiant d'image invalide." },
        { status: 400 },
      );
    }

    const image = await activateHomeImage(imageId);

    if (!image) {
      return NextResponse.json(
        { error: "Image introuvable." },
        { status: 404 },
      );
    }

    const images = await getAllHomeImagesForAdmin();

    return NextResponse.json({
      ok: true,
      images,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible d'activer l'image d'accueil." },
      { status: 500 },
    );
  }
}