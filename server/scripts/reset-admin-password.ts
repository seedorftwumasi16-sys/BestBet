/**
 * Reset admin password and reactivate protected super admin account.
 * Run: npx tsx server/scripts/reset-admin-password.ts
 */
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { getDb } from "../db";
import {
  recreateProtectedSuperAdmin,
  getProtectedSuperAdminEmail,
  getProtectedSuperAdminPassword,
} from "../lib/super-admin";

dotenv.config();

async function main() {
  const email = getProtectedSuperAdminEmail();
  const password = getProtectedSuperAdminPassword();

  const db = await getDb();
  const userId = await recreateProtectedSuperAdmin(db);

  const row = await db.query(`SELECT password_hash, status, role_id FROM users WHERE id = ?`, [userId]);
  const hash = String(row.rows[0]?.password_hash ?? "");
  const valid = await bcrypt.compare(password, hash);

  console.log(`Super admin recreated for ${email}`);
  console.log(`User ID: ${userId}`);
  console.log(`Status: ${row.rows[0]?.status ?? "active"}`);
  console.log(`Role: ${row.rows[0]?.role_id ?? "super_admin"}`);
  console.log(`Password: ${password}`);
  console.log(`Hash verify: ${valid ? "OK" : "FAILED"}`);
  console.log(`Database driver: ${db.driver}`);

  await db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
