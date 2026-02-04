import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set. Backend will fail to query Postgres.");
}

export const pool = new Pool({
  connectionString,
});

export async function query(text, params) {
  return pool.query(text, params);
}
