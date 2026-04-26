import { Pool, QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var pizzaPlannerPool: Pool | undefined;
}

export const pool =
  global.pizzaPlannerPool ??
  new Pool({
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  global.pizzaPlannerPool = pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  return pool.query<T>(text, params);
}