import { pool, query } from "@/lib/db";

const PARIS_TIME_ZONE_SQL = "Europe/Paris";

const homeImageSelectFields = `
  id,
  image_path AS "imagePath",
  title,
  alt_text AS "altText",
  is_active AS "isActive",
  TO_CHAR(created_at AT TIME ZONE '${PARIS_TIME_ZONE_SQL}', 'DD/MM/YYYY HH24:MI') AS "createdAt",
  TO_CHAR(activated_at AT TIME ZONE '${PARIS_TIME_ZONE_SQL}', 'DD/MM/YYYY HH24:MI') AS "activatedAt"
`;

export type HomeImage = {
  id: number;
  imagePath: string;
  title: string;
  altText: string;
  isActive: boolean;
  createdAt: string;
  activatedAt: string | null;
};

type CreateHomeImageInput = {
  imagePath: string;
  title: string;
  altText: string;
};

export async function getActiveHomeImage(): Promise<HomeImage | null> {
  const result = await query<HomeImage>(`
    SELECT ${homeImageSelectFields}
    FROM home_images
    WHERE is_active = TRUE
    ORDER BY activated_at DESC NULLS LAST, created_at DESC, id DESC
    LIMIT 1;
  `);

  return result.rows[0] ?? null;
}

export async function getAllHomeImagesForAdmin(): Promise<HomeImage[]> {
  const result = await query<HomeImage>(`
    SELECT ${homeImageSelectFields}
    FROM home_images
    ORDER BY is_active DESC, created_at DESC, id DESC;
  `);

  return result.rows;
}

export async function createHomeImage(
  input: CreateHomeImageInput,
): Promise<HomeImage> {
  const result = await query<HomeImage>(
    `
      INSERT INTO home_images (
        image_path,
        title,
        alt_text
      )
      VALUES ($1, $2, $3)
      RETURNING ${homeImageSelectFields};
    `,
    [input.imagePath, input.title, input.altText],
  );

  return result.rows[0];
}

export async function activateHomeImage(
  imageId: number,
): Promise<HomeImage | null> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query<{ id: number }>(
      `
        SELECT id
        FROM home_images
        WHERE id = $1
        LIMIT 1;
      `,
      [imageId],
    );

    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(`
      UPDATE home_images
      SET
        is_active = FALSE,
        activated_at = NULL
      WHERE is_active = TRUE;
    `);

    const result = await client.query<HomeImage>(
      `
        UPDATE home_images
        SET
          is_active = TRUE,
          activated_at = NOW()
        WHERE id = $1
        RETURNING ${homeImageSelectFields};
      `,
      [imageId],
    );

    await client.query("COMMIT");

    return result.rows[0] ?? null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}