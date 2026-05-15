import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import type { PartnerCategory } from "@/lib/partner-types";
import {
  createPartner,
  getAllPartnersForAdmin,
  updatePartner,
} from "@/lib/partners";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const PARTNER_CATEGORIES: PartnerCategory[] = [
  "producteur",
  "distributeur",
  "partenaire",
];

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

async function saveUploadedPhoto(photo: File): Promise<string> {
  const extension = getImageExtension(photo.name, photo.type);

  if (!extension) {
    throw new Error("Format d'image non pris en charge.");
  }

  const uploadsDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "partners",
  );

  await mkdir(uploadsDir, { recursive: true });

  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  const fullPath = path.join(uploadsDir, filename);
  const arrayBuffer = await photo.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await writeFile(fullPath, buffer);

  return `/uploads/partners/${filename}`;
}

async function parseFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const rawCategory = String(formData.get("category") ?? "partenaire").trim();
  const description = String(formData.get("description") ?? "").trim();
  const contactEnabled =
    String(formData.get("contactEnabled") ?? "false") === "true";
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const contactPhone = String(formData.get("contactPhone") ?? "").trim();
  const contactAddress = String(formData.get("contactAddress") ?? "").trim();
  const isActive = String(formData.get("isActive") ?? "true") === "true";
  const existingPhotoPath =
    String(formData.get("existingPhotoPath") ?? "").trim() || null;

  if (!name) {
    return { error: "Le nom du partenaire est obligatoire." };
  }

  if (!description) {
    return { error: "Le texte descriptif est obligatoire." };
  }

  if (!PARTNER_CATEGORIES.includes(rawCategory as PartnerCategory)) {
    return { error: "Catégorie de partenaire invalide." };
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
      category: rawCategory as PartnerCategory,
      description,
      photoPath,
      contactEnabled,
      contactEmail,
      contactPhone,
      contactAddress,
      isActive,
    },
  };
}

export async function GET() {
  try {
    const partners = await getAllPartnersForAdmin();

    return NextResponse.json({
      ok: true,
      partners,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de charger les partenaires." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const parsed = await parseFormData(formData);

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const partner = await createPartner(parsed.value);

    return NextResponse.json({
      ok: true,
      partner,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de créer le partenaire." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const formData = await request.formData();
    const partnerId = Number(formData.get("partnerId") ?? 0);

    if (!Number.isInteger(partnerId) || partnerId <= 0) {
      return NextResponse.json(
        { error: "Identifiant de partenaire invalide." },
        { status: 400 },
      );
    }

    const parsed = await parseFormData(formData);

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const partner = await updatePartner(partnerId, parsed.value);

    if (!partner) {
      return NextResponse.json(
        { error: "Partenaire introuvable." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      partner,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de modifier le partenaire." },
      { status: 500 },
    );
  }
}