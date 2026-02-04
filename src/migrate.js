import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlDir = path.resolve(__dirname, "..", "sql");

async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function appliedMigrations() {
  const result = await query("SELECT filename FROM schema_migrations");
  return new Set(result.rows.map((row) => row.filename));
}

async function run() {
  await ensureMigrationsTable();
  const applied = await appliedMigrations();
  const files = (await fs.readdir(sqlDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sqlPath = path.join(sqlDir, file);
    const sql = await fs.readFile(sqlPath, "utf8");
    await query("BEGIN");
    try {
      await query(sql);
      await query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await query("COMMIT");
      console.log(`Applied migration ${file}`);
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }
  }
}

run()
  .then(() => {
    console.log("Migrations complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed", err);
    process.exit(1);
  });
