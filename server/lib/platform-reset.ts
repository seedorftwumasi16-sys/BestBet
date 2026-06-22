import fs from "fs";
import os from "os";
import path from "path";
import type { Database } from "../db";
import { PROTECTED_SUPER_ADMIN_EMAIL, repairProtectedSuperAdmin } from "./super-admin";

export const PLATFORM_RESET_CONFIRM_PHRASE = "RESET PLATFORM";

/** Operational tables cleared on reset — matches, leagues, settings, and promotions are kept. */
const CLEAR_TABLES = [
  "bet_selections",
  "bets",
  "booking_logs",
  "booking_codes",
  "deposits",
  "withdrawals",
  "notifications",
  "referral_rewards",
  "support_tickets",
  "responsible_gaming",
  "agents",
  "login_logs",
  "device_sessions",
  "password_reset_tokens",
  "otp_codes",
  "audit_logs",
] as const;

export interface PlatformResetResult {
  backupPath: string;
  adminUserId: string;
  clearedTables: string[];
}

export function isValidPlatformResetConfirmation(text: unknown): boolean {
  return typeof text === "string" && text.trim() === PLATFORM_RESET_CONFIRM_PHRASE;
}

async function createBackup(db: Database): Promise<string> {
  const backupDir = path.join(process.cwd(), "backups");
  try {
    fs.mkdirSync(backupDir, { recursive: true });
  } catch {
    /* use temp fallback below */
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  if (db.driver === "json") {
    const jsonPath = process.env.JSON_DB_PATH || "./data/bestbet.json";
    const dest = path.join(backupDir, `bestbet-backup-${stamp}.json`);
    try {
      if (fs.existsSync(jsonPath)) {
        fs.copyFileSync(jsonPath, dest);
      } else {
        fs.writeFileSync(dest, JSON.stringify({ tables: {} }, null, 2));
      }
      return dest;
    } catch {
      const fallback = path.join(os.tmpdir(), `bestbet-backup-${stamp}.json`);
      if (fs.existsSync(jsonPath)) fs.copyFileSync(jsonPath, fallback);
      return fallback;
    }
  }

  const marker = path.join(backupDir, `postgres-reset-marker-${stamp}.txt`);
  fs.writeFileSync(
    marker,
    `PostgreSQL platform reset at ${new Date().toISOString()}\nConfigure pg_dump for full backups in production.\n`
  );
  return marker;
}

async function clearOperationalTables(db: Database): Promise<string[]> {
  const cleared: string[] = [];
  for (const table of CLEAR_TABLES) {
    try {
      await db.query(`DELETE FROM ${table}`);
      cleared.push(table);
    } catch (err) {
      console.warn(`[platform-reset] Could not clear ${table}:`, err);
    }
  }
  return cleared;
}

async function resetUserData(db: Database, adminUserId: string): Promise<void> {
  const protectedEmail = PROTECTED_SUPER_ADMIN_EMAIL.toLowerCase();

  await db.query(`DELETE FROM users WHERE LOWER(email) != ?`, [protectedEmail]);
  await db.query(`DELETE FROM admins WHERE user_id != ?`, [adminUserId]);
  await db.query(`DELETE FROM wallets WHERE user_id != ?`, [adminUserId]);

  await db.query(
    `UPDATE wallets SET balance = ?, bonus_balance = ?, locked_balance = ? WHERE user_id = ?`,
    [0, 0, 0, adminUserId]
  );

  await repairProtectedSuperAdmin(db);
}

async function resolveAdminUserId(db: Database): Promise<string> {
  const lookup = await db.query(`SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1`, [
    PROTECTED_SUPER_ADMIN_EMAIL.toLowerCase(),
  ]);
  if (lookup.rows.length > 0) {
    return String(lookup.rows[0].id);
  }
  await repairProtectedSuperAdmin(db);
  const again = await db.query(`SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1`, [
    PROTECTED_SUPER_ADMIN_EMAIL.toLowerCase(),
  ]);
  if (again.rows.length === 0) {
    throw new Error("Protected admin account could not be restored");
  }
  return String(again.rows[0].id);
}

export async function resetPlatformData(db: Database): Promise<PlatformResetResult> {
  let backupPath = "";
  try {
    backupPath = await createBackup(db);
  } catch (err) {
    console.warn("[platform-reset] Backup failed, continuing reset:", err);
    backupPath = "backup-unavailable";
  }

  const adminUserId = await resolveAdminUserId(db);

  if (db.driver === "postgresql") {
    await db.exec("BEGIN");
    try {
      const clearedTables = await clearOperationalTables(db);
      await resetUserData(db, adminUserId);
      await db.exec("COMMIT");
      return { backupPath, adminUserId, clearedTables };
    } catch (err) {
      await db.exec("ROLLBACK");
      throw err;
    }
  }

  const clearedTables = await clearOperationalTables(db);
  await resetUserData(db, adminUserId);
  return { backupPath, adminUserId, clearedTables };
}
