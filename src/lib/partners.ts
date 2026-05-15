import { query } from "@/lib/db";
import type { Partner, PartnerWriteInput } from "@/lib/partner-types";

const partnerSelectFields = `
  id,
  name,
  category,
  description,
  photo_path AS "photoPath",
  contact_enabled AS "contactEnabled",
  contact_email AS "contactEmail",
  contact_phone AS "contactPhone",
  contact_address AS "contactAddress",
  is_active AS "isActive",
  display_order AS "displayOrder",
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS "createdAt",
  TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI') AS "updatedAt"
`;

export async function getAllPartnersForAdmin(): Promise<Partner[]> {
  const result = await query(`
    SELECT ${partnerSelectFields}
    FROM partners
    ORDER BY is_active DESC, display_order, name;
  `);

  return result.rows as Partner[];
}

export async function getPublicPartnersRandomized(): Promise<Partner[]> {
  const result = await query(`
    SELECT ${partnerSelectFields}
    FROM partners
    WHERE is_active = TRUE
    ORDER BY RANDOM();
  `);

  return result.rows as Partner[];
}

export async function createPartner(input: PartnerWriteInput): Promise<Partner> {
  const result = await query(
    `
    WITH next_order AS (
      SELECT COALESCE(MAX(display_order), 0) + 10 AS value
      FROM partners
    )
    INSERT INTO partners (
      name,
      category,
      description,
      photo_path,
      contact_enabled,
      contact_email,
      contact_phone,
      contact_address,
      is_active,
      display_order
    )
    SELECT
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      next_order.value
    FROM next_order
    RETURNING ${partnerSelectFields};
    `,
    [
      input.name,
      input.category,
      input.description,
      input.photoPath,
      input.contactEnabled,
      input.contactEmail,
      input.contactPhone,
      input.contactAddress,
      input.isActive,
    ],
  );

  return result.rows[0] as Partner;
}

export async function updatePartner(
  partnerId: number,
  input: PartnerWriteInput,
): Promise<Partner | null> {
  const result = await query(
    `
    UPDATE partners
    SET
      name = $2,
      category = $3,
      description = $4,
      photo_path = $5,
      contact_enabled = $6,
      contact_email = $7,
      contact_phone = $8,
      contact_address = $9,
      is_active = $10,
      updated_at = NOW()
    WHERE id = $1
    RETURNING ${partnerSelectFields};
    `,
    [
      partnerId,
      input.name,
      input.category,
      input.description,
      input.photoPath,
      input.contactEnabled,
      input.contactEmail,
      input.contactPhone,
      input.contactAddress,
      input.isActive,
    ],
  );

  return (result.rows[0] as Partner | undefined) ?? null;
}