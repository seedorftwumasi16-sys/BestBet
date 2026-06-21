import type { Database } from "../db";
import { v4 as uuidv4 } from "uuid";

/** Primary seed super-admin user id — cannot be banned or demoted. */
export const PROTECTED_SUPER_ADMIN_ID = "admin-001";

export function getProtectedSuperAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || "admin@bestbet.gh").toLowerCase();
}

export function isProtectedSuperAdmin(userId: string, email: string): boolean {
  return userId === PROTECTED_SUPER_ADMIN_ID || email.toLowerCase() === getProtectedSuperAdminEmail();
}

export function canChangeUserStatus(
  userId: string,
  email: string,
  nextStatus: string
): { allowed: boolean; reason?: string } {
  if (nextStatus === "active") return { allowed: true };
  if (isProtectedSuperAdmin(userId, email)) {
    return {
      allowed: false,
      reason: "The primary super admin account cannot be suspended or banned",
    };
  }
  return { allowed: true };
}

/** Ensure admin@bestbet.gh (or ADMIN_EMAIL) is active super_admin in users + admins tables. */
export async function repairProtectedSuperAdmin(db: Database): Promise<void> {
  const email = getProtectedSuperAdminEmail();
  const users = await db.query(`SELECT id, status, role_id FROM users WHERE LOWER(email) = ?`, [email]);
  if (users.rows.length === 0) return;

  const userId = String(users.rows[0].id);
  const previousStatus = users.rows[0].status;

  await db.query(`UPDATE users SET status = ?, role_id = ? WHERE id = ?`, ["active", "super_admin", userId]);

  const adminRow = await db.query(`SELECT id FROM admins WHERE user_id = ?`, [userId]);
  if (adminRow.rows.length === 0) {
    await db.query(`INSERT INTO admins (id, user_id, role, status) VALUES (?, ?, ?, ?)`, [
      uuidv4(),
      userId,
      "super_admin",
      "active",
    ]);
  } else {
    await db.query(`UPDATE admins SET role = ?, status = ? WHERE user_id = ?`, [
      "super_admin",
      "active",
      userId,
    ]);
  }

  if (previousStatus && previousStatus !== "active") {
    console.warn(
      `[super-admin] Repaired protected admin ${email}: users.status was "${previousStatus}" → active`
    );
  }
}
