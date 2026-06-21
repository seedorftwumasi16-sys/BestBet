import type { Database } from "./index";

export async function upsert(
  db: Database,
  table: string,
  data: Record<string, unknown>,
  conflictColumn: string
): Promise<void> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => "?").join(", ");

  if (db.driver === "json") {
    await db.query(
      `INSERT OR IGNORE INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`,
      values
    );
    return;
  }

  const pgPlaceholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const updates = keys.filter((k) => k !== conflictColumn).map((k) => `${k} = EXCLUDED.${k}`).join(", ");
  await db.query(
    `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${pgPlaceholders})
     ON CONFLICT (${conflictColumn}) DO ${updates ? `UPDATE SET ${updates}` : "NOTHING"}`,
    values
  );
}

export function boolVal(db: Database, val: boolean): number | boolean {
  return db.driver === "postgresql" ? val : (val ? 1 : 0);
}

export function boolFrom(row: Record<string, unknown>, key: string): boolean {
  const v = row[key];
  return v === true || v === 1 || v === "1";
}

export interface UserAuthRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role_id: string;
  status?: string;
  phone?: string | null;
  phone_verified?: boolean | number;
  referral_code?: string | null;
  balance: number;
  bonus_balance: number;
  locked_balance: number;
}

/** Reliable user lookup for auth — avoids fragile JOIN handling in the JSON driver. */
export async function getUserWithWallet(
  db: Database,
  lookup: { email?: string; id?: string }
): Promise<UserAuthRow | null> {
  let userResult;
  if (lookup.email) {
    userResult = await db.query(`SELECT * FROM users WHERE email = ?`, [lookup.email.toLowerCase()]);
  } else if (lookup.id) {
    userResult = await db.query(`SELECT * FROM users WHERE id = ?`, [lookup.id]);
  } else {
    return null;
  }

  if (userResult.rows.length === 0) return null;

  const user = userResult.rows[0];
  const walletResult = await db.query(`SELECT balance, bonus_balance, locked_balance FROM wallets WHERE user_id = ?`, [
    user.id,
  ]);
  const wallet = walletResult.rows[0] ?? {};

  return {
    id: user.id as string,
    email: user.email as string,
    name: user.name as string,
    password_hash: user.password_hash as string,
    role_id: user.role_id as string,
    status: (user.status as string) || "active",
    phone: user.phone as string | null,
    phone_verified: user.phone_verified as boolean | number | undefined,
    referral_code: user.referral_code as string | null,
    balance: Number(wallet.balance ?? 0),
    bonus_balance: Number(wallet.bonus_balance ?? 0),
    locked_balance: Number(wallet.locked_balance ?? 0),
  };
}
