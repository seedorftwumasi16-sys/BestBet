import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import type { Database } from "../db";

/** Canonical protected super-admin email — always admin@bestbet.gh regardless of env. */
export const PROTECTED_SUPER_ADMIN_EMAIL = "admin@bestbet.gh";

/** Primary seed super-admin user id — cannot be banned or demoted. */
export const PROTECTED_SUPER_ADMIN_ID = "admin-001";

const DEFAULT_ADMIN_PASSWORD = "Admin123@";

export function getProtectedSuperAdminEmail(): string {
  return PROTECTED_SUPER_ADMIN_EMAIL;
}

export function getProtectedSuperAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
}

/** Legacy password kept for one-release migration when env/default changed. */
export const LEGACY_ADMIN_PASSWORDS = ["Admin@2005"] as const;

export function getProtectedAdminPasswordCandidates(): string[] {
  const primary = getProtectedSuperAdminPassword();
  return [...new Set([primary, DEFAULT_ADMIN_PASSWORD, ...LEGACY_ADMIN_PASSWORDS])];
}

export function isProtectedSuperAdmin(userId: string, email: string): boolean {
  const normalized = String(email || "").toLowerCase().trim();
  return userId === PROTECTED_SUPER_ADMIN_ID || normalized === PROTECTED_SUPER_ADMIN_EMAIL;
}

export function isAdminRole(roleId?: string): boolean {
  return roleId === "super_admin" || roleId === "sub_admin";
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

/** Reset protected super admin: fresh password, role, status, and admins row. */
export async function recreateProtectedSuperAdmin(db: Database): Promise<string> {
  const email = PROTECTED_SUPER_ADMIN_EMAIL;
  const password = getProtectedSuperAdminPassword();
  const hash = await bcrypt.hash(password, 10);
  const adminId = PROTECTED_SUPER_ADMIN_ID;

  const existing = await db.query(`SELECT id, status, role_id FROM users WHERE LOWER(email) = ?`, [email]);
  let userId = adminId;

  if (existing.rows.length > 0) {
    userId = String(existing.rows[0].id);
    const previousStatus = existing.rows[0].status;
    const previousRole = existing.rows[0].role_id;

    await db.query(`DELETE FROM admins WHERE user_id = ?`, [userId]);

    await db.query(
      `UPDATE users SET email = ?, password_hash = ?, name = ?, role_id = ?, status = ?, referral_code = ? WHERE id = ?`,
      [email, hash, "Super Admin", "super_admin", "active", "BBADMIN", userId]
    );

    console.log(
      `[super-admin] Recreated protected admin ${email} (userId=${userId}, previous status=${previousStatus ?? "none"}, previous role=${previousRole ?? "none"})`
    );
  } else {
    await db.query(
      `INSERT INTO users (id, email, password_hash, name, role_id, referral_code, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, email, hash, "Super Admin", "super_admin", "BBADMIN", "active"]
    );

    const wallet = await db.query(`SELECT id FROM wallets WHERE user_id = ?`, [adminId]);
    if (wallet.rows.length === 0) {
      await db.query(`INSERT INTO wallets (id, user_id, balance, bonus_balance, locked_balance) VALUES (?, ?, ?, ?, ?)`, [
        uuidv4(),
        adminId,
        10000,
        0,
        0,
      ]);
    }

    console.log(`[super-admin] Created new protected admin ${email} (userId=${adminId})`);
    userId = adminId;
  }

  await db.query(`INSERT INTO admins (id, user_id, role, status) VALUES (?, ?, ?, ?)`, [
    uuidv4(),
    userId,
    "super_admin",
    "active",
  ]);

  return userId;
}

/** Create protected admin if missing; repair role/status without resetting password. */
export async function ensureProtectedSuperAdmin(db: Database): Promise<string> {
  const email = PROTECTED_SUPER_ADMIN_EMAIL;
  const users = await db.query(`SELECT id FROM users WHERE LOWER(email) = ?`, [email.toLowerCase()]);
  if (users.rows.length === 0) {
    return recreateProtectedSuperAdmin(db);
  }
  await repairProtectedSuperAdmin(db);
  return String(users.rows[0].id);
}

/** Force-reset protected admin credentials (password + role). */
export async function resetProtectedSuperAdminPassword(
  db: Database,
  newPassword?: string
): Promise<string> {
  const email = PROTECTED_SUPER_ADMIN_EMAIL;
  const password = newPassword?.trim() || getProtectedSuperAdminPassword();
  if (password.length < 8) {
    throw new Error("Admin password must be at least 8 characters");
  }

  const hash = await bcrypt.hash(password, 10);
  const users = await db.query(`SELECT id FROM users WHERE LOWER(email) = ?`, [email.toLowerCase()]);
  let userId = PROTECTED_SUPER_ADMIN_ID;

  if (users.rows.length === 0) {
    return recreateProtectedSuperAdmin(db);
  }

  userId = String(users.rows[0].id);
  await db.query(
    `UPDATE users SET email = ?, password_hash = ?, name = ?, role_id = ?, status = ?, referral_code = ? WHERE id = ?`,
    [email, hash, "Super Admin", "super_admin", "active", "BBADMIN", userId]
  );
  await repairProtectedSuperAdmin(db);
  console.log(`[super-admin] Password reset for ${email} (userId=${userId})`);
  return userId;
}

/** Ensure admin@bestbet.gh is active super_admin (lightweight repair — does not reset password). */
export async function repairProtectedSuperAdmin(db: Database): Promise<void> {
  const email = PROTECTED_SUPER_ADMIN_EMAIL;
  const users = await db.query(`SELECT id, status, role_id FROM users WHERE LOWER(email) = ?`, [email]);
  if (users.rows.length === 0) {
    await recreateProtectedSuperAdmin(db);
    return;
  }

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

export async function resolveAdminAccess(
  db: Database,
  userId: string,
  roleId: string
): Promise<{ isAdmin: boolean; effectiveRole: string; adminStatus?: string }> {
  if (isAdminRole(roleId)) {
    return { isAdmin: true, effectiveRole: roleId };
  }

  const adminLink = await db.query(`SELECT role, status FROM admins WHERE user_id = ?`, [userId]);
  if (adminLink.rows.length > 0) {
    const role = String(adminLink.rows[0].role);
    const adminStatus = String(adminLink.rows[0].status || "active");
    return {
      isAdmin: isAdminRole(role),
      effectiveRole: role,
      adminStatus,
    };
  }

  return { isAdmin: false, effectiveRole: roleId };
}
