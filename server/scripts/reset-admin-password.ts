/**
 * Reset admin password to match ADMIN_PASSWORD env (default Admin@123456).
 * Run: npx tsx server/scripts/reset-admin-password.ts
 */
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { getDb } from "../db";

dotenv.config();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@bestbet.gh").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@123456";
  const hash = await bcrypt.hash(password, 10);

  const db = await getDb();
  const existing = await db.query(`SELECT id FROM users WHERE email = ?`, [email]);

  if (existing.rows.length === 0) {
    console.error(`Admin user not found: ${email}. Run npm run db:seed first.`);
    process.exit(1);
  }

  const userId = existing.rows[0].id as string;
  await db.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, userId]);
  await db.query(`UPDATE users SET status = ? WHERE id = ?`, ["active", userId]);

  const valid = await bcrypt.compare(password, hash);
  console.log(`Admin password reset for ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Hash verify: ${valid ? "OK" : "FAILED"}`);
  console.log(`Database driver: ${db.driver}`);

  await db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
