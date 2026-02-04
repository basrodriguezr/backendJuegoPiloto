import "dotenv/config";
import bcrypt from "bcryptjs";
import { query } from "./db.js";

const email = process.env.SEED_USER_EMAIL || "demo@piloto.local";
const password = process.env.SEED_USER_PASSWORD || "Demo1234!";

async function run() {
  const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount === 0) {
    const hash = await bcrypt.hash(password, 10);
    await query("INSERT INTO users (email, password_hash) VALUES ($1, $2)", [email, hash]);
    console.log(`Seeded user ${email}`);
  } else {
    console.log(`User ${email} already exists`);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed", err);
    process.exit(1);
  });
