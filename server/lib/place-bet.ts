import { v4 as uuidv4 } from "uuid";
import { getDb, getWalletBalance } from "../db";
import { boolFrom, boolVal } from "../db/helpers";
import { logAudit } from "../middleware/auth";
import { normalizeMatchStatus } from "./matches";
import { calculatePotentialWin, calculateTotalOdds, sanitizeBetOdds } from "./bet-odds";
import { generateUniqueBookingCode, markBookingCodeUsed } from "./booking-codes";

export interface PlaceBetInput {
  userId: string;
  type: "single" | "multi";
  stake: number;
  selections: { matchId: string; market: string; selection: string; odds: number }[];
  savedBookingCode?: string;
}

export interface PlaceBetResult {
  id: string;
  bookingCode: string;
  stake: number;
  potentialWin: number;
  totalOdds: number;
  cashoutValue: number;
  balance: number;
}

async function ensureWallet(userId: string): Promise<void> {
  const db = await getDb();
  const existing = await db.query(`SELECT id FROM wallets WHERE user_id = ?`, [userId]);
  if (existing.rows.length > 0) return;
  await db.query(
    `INSERT INTO wallets (id, user_id, balance, bonus_balance, locked_balance) VALUES (?, ?, ?, ?, ?)`,
    [uuidv4(), userId, 0, 0, 0]
  );
  console.warn(`[bets/place] Created missing wallet for user ${userId}`);
}

export async function placeBetRecord(input: PlaceBetInput): Promise<PlaceBetResult> {
  const db = await getDb();
  const createdAt = new Date().toISOString();
  const normalizedSelections = input.selections.map((sel) => ({
    ...sel,
    odds: sanitizeBetOdds(sel.odds),
  }));

  const userStatus = await db.query(`SELECT status FROM users WHERE id = ?`, [input.userId]);
  if (userStatus.rows.length === 0) {
    throw Object.assign(new Error("User account not found"), { statusCode: 404 });
  }
  const status = String(userStatus.rows[0].status || "active");
  if (status !== "active") {
    throw Object.assign(new Error("Account is not active"), { statusCode: 403 });
  }

  for (const sel of normalizedSelections) {
    const match = await db.query(
      `SELECT id, betting_suspended, match_status, is_simulated FROM matches WHERE id = ?`,
      [sel.matchId]
    );
    if (match.rows.length === 0) {
      throw Object.assign(new Error(`Match not found: ${sel.matchId}`), { statusCode: 400 });
    }
    if (boolFrom(match.rows[0], "betting_suspended")) {
      throw Object.assign(new Error("Betting is suspended on one or more selected matches"), {
        statusCode: 400,
      });
    }
    if (normalizeMatchStatus(match.rows[0]) === "finished") {
      throw Object.assign(new Error("One or more matches have finished"), { statusCode: 400 });
    }
  }

  await ensureWallet(input.userId);

  const balance = await getWalletBalance(input.userId);
  if (balance < input.stake) {
    throw Object.assign(new Error("Insufficient balance"), {
      statusCode: 400,
      balance,
      stake: input.stake,
    });
  }

  const totalOdds = calculateTotalOdds(normalizedSelections);
  if (totalOdds < 1.01) {
    throw Object.assign(new Error("Total odds must be at least 1.01"), { statusCode: 400 });
  }

  const potentialWin = calculatePotentialWin(input.stake, totalOdds);
  const betId = uuidv4();
  const bookingCode = await generateUniqueBookingCode();
  const cashoutValue = Math.round(potentialWin * 0.85 * 100) / 100;

  await db.query(
    `INSERT INTO bets (id, user_id, type, stake, potential_win, status, booking_code, cashout_value, cashout_available, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      betId,
      input.userId,
      input.type,
      input.stake,
      potentialWin,
      "pending",
      bookingCode,
      cashoutValue,
      boolVal(db, true),
      createdAt,
    ]
  );

  for (const sel of normalizedSelections) {
    await db.query(
      `INSERT INTO bet_selections (id, bet_id, match_id, market, selection, odds) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), betId, sel.matchId, sel.market, sel.selection, sel.odds]
    );
  }

  await db.query(`UPDATE wallets SET balance = balance - ? WHERE user_id = ?`, [input.stake, input.userId]);

  try {
    await logAudit(input.userId, "place_bet", `Bet ${betId} placed, stake: ${input.stake}, code: ${bookingCode}`);
  } catch (err) {
    console.warn("[bets/place] Audit log failed (bet still placed):", err instanceof Error ? err.message : err);
  }

  if (input.savedBookingCode) {
    try {
      await markBookingCodeUsed(input.savedBookingCode, input.userId, betId);
    } catch (err) {
      console.warn("[bets/place] Booking code mark-used failed:", err instanceof Error ? err.message : err);
    }
  }

  const newBalance = await getWalletBalance(input.userId);

  return {
    id: betId,
    bookingCode,
    stake: input.stake,
    potentialWin,
    totalOdds,
    cashoutValue,
    balance: newBalance,
  };
}
