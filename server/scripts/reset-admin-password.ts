/**
 * Reset admin password and reactivate protected super admin account.
 * Run: npx tsx server/scripts/reset-admin-password.ts
 */
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { getDb } from "../db";
import { repairProtectedSuperAdmin, getProtectedSuperAdminEmail } from "../lib/super-admin";

dotenv.config();

async function main() {
  const email = getProtectedSuperAdminEmail();
  const password = process.env.ADMIN_PASSWORD || "Admin@123";
  const hash = await bcrypt.hash(password, 10);

  const db = await getDb();
  const existing = await db.query(`SELECT id, status, role_id FROM users WHERE email = ?`, [email]);

  if (existing.rows.length === 0) {
    console.error(`Admin user not found: ${email}. Run npm run db:seed first.`);
    process.exit(1);
  }

  const userId = existing.rows[0].id as string;
  const beforeStatus = existing.rows[0].status;
  await db.query(`UPDATE users SET password_hash = ?, role_id = ?, status = ? WHERE id = ?`, [
    hash,
    "super_admin",
    "active",
    userId,
  ]);
  await repairProtectedSuperAdmin(db);

  const valid = await bcrypt.compare(password, hash);
  console.log(`Admin password reset for ${email}`);
  console.log(`Previous status: ${beforeStatus ?? "unknown"}`);
  console.log(`Current status: active (role: super_admin)`);
  console.log(`Password: ${password}`);
  console.log(`Hash verify: ${valid ? "OK" : "FAILED"}`);
  console.log(`Database driver: ${db.driver}`);

  await db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
