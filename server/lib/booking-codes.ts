import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";

const BOOKING_TTL_DAYS = 7;

export function generateShareBookingCode(): string {
  let digits = "";
  for (let i = 0; i < 8; i++) digits += Math.floor(Math.random() * 10);
  return `BB${digits}`;
}

export async function generateUniqueBookingCode(): Promise<string> {
  const db = await getDb();
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateShareBookingCode();
    const existing = await db.query(`SELECT id FROM booking_codes WHERE code = ?`, [code]);
    if (existing.rows.length === 0) return code;
  }
  return `BB${Date.now().toString().slice(-8)}`;
}

export interface SaveBookingInput {
  userId: string;
  selections: unknown[];
  stake: number;
  betType: "single" | "multi";
  totalOdds: number;
  potentialWin: number;
}

export async function saveBookingCodeRecord(input: SaveBookingInput) {
  const db = await getDb();
  const id = uuidv4();
  const code = await generateUniqueBookingCode();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + BOOKING_TTL_DAYS * 86400000);

  const payload = {
    selections: input.selections,
    stake: input.stake,
    betType: input.betType,
    totalOdds: input.totalOdds,
    potentialWin: input.potentialWin,
  };

  await db.query(
    `INSERT INTO booking_codes (
      id, code, user_id, payload, selections, total_odds, stake, potential_win,
      status, bet_type, created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      code,
      input.userId,
      JSON.stringify(payload),
      JSON.stringify(input.selections),
      input.totalOdds,
      input.stake,
      input.potentialWin,
      "active",
      input.betType,
      createdAt.toISOString(),
      expiresAt.toISOString(),
    ]
  );

  await db.query(
    `INSERT INTO booking_logs (id, user_id, code, action, details) VALUES (?, ?, ?, ?, ?)`,
    [uuidv4(), input.userId, code, "save", JSON.stringify({ selectionCount: input.selections.length })]
  );

  return {
    id,
    code,
    stake: input.stake,
    totalOdds: input.totalOdds,
    potentialWin: input.potentialWin,
    betType: input.betType,
    selections: input.selections,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: "active" as const,
  };
}

export async function loadBookingCodeRecord(code: string, loaderUserId?: string | null) {
  const db = await getDb();
  const normalized = code.trim().toUpperCase();
  const result = await db.query(
    `SELECT bc.*, u.email as creator_email, u.name as creator_name,
            u2.email as used_by_email, u2.name as used_by_name
     FROM booking_codes bc
     LEFT JOIN users u ON u.id = bc.user_id
     LEFT JOIN users u2 ON u2.id = bc.used_by
     WHERE UPPER(bc.code) = ?`,
    [normalized]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  if (row.status === "expired" || row.status === "deleted") return { error: "Booking code is no longer valid" as const };
  if (row.expires_at && new Date(String(row.expires_at)) < new Date()) {
    await db.query(`UPDATE booking_codes SET status = 'expired' WHERE id = ?`, [row.id]);
    return { error: "Booking code has expired" as const };
  }
  if (row.status === "used") {
    return { error: "Booking code has already been used" as const };
  }

  let selections: unknown[] = [];
  try {
    selections = row.selections ? JSON.parse(String(row.selections)) : JSON.parse(String(row.payload)).selections;
  } catch {
    selections = JSON.parse(String(row.payload)).selections || [];
  }

  const payload = {
    selections,
    stake: Number(row.stake ?? JSON.parse(String(row.payload)).stake ?? 10),
    betType: (row.bet_type || JSON.parse(String(row.payload)).betType || "single") as "single" | "multi",
    totalOdds: Number(row.total_odds ?? 1),
    potentialWin: Number(row.potential_win ?? 0),
  };

  await db.query(
    `INSERT INTO booking_logs (id, user_id, code, action, details) VALUES (?, ?, ?, ?, ?)`,
    [uuidv4(), loaderUserId || null, normalized, "load", JSON.stringify({ loaderUserId })]
  );

  return {
    code: String(row.code),
    id: String(row.id),
    status: String(row.status),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    creatorEmail: row.creator_email,
    creatorName: row.creator_name,
    usedByEmail: row.used_by_email,
    usedByName: row.used_by_name,
    payload,
  };
}

export async function markBookingCodeUsed(code: string, userId: string, betId?: string) {
  const db = await getDb();
  await db.query(
    `UPDATE booking_codes SET status = 'used', used_by = ?, used_at = ? WHERE UPPER(code) = ? AND status = 'active'`,
    [userId, new Date().toISOString(), code.trim().toUpperCase()]
  );
  await db.query(
    `INSERT INTO booking_logs (id, user_id, code, action, details) VALUES (?, ?, ?, ?, ?)`,
    [uuidv4(), userId, code.trim().toUpperCase(), "used", JSON.stringify({ betId })]
  );
}
