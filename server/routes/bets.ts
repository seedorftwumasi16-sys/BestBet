import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb, getWalletBalance } from "../db";
import { authenticate, requirePermission, logAudit } from "../middleware/auth";
import { boolFrom } from "../db/helpers";
import { listMatches, normalizeMatchStatus } from "../lib/matches";
import {
  saveBookingCodeRecord,
  loadBookingCodeRecord,
  markBookingCodeUsed,
  generateShareBookingCode,
} from "../lib/booking-codes";
import { formatCurrency } from "../lib/currency";

const router = Router();

function generateBetBookingCode(): string {
  return generateShareBookingCode();
}

router.get("/matches", async (req, res) => {
  const { sport, live, featured } = req.query;
  const matches = await listMatches({
    sport: sport ? String(sport) : undefined,
    live: live === "true" ? true : undefined,
    featured: featured === "true" ? true : undefined,
  });
  res.json(matches);
});

router.get("/history", authenticate, async (req, res) => {
  const db = await getDb();
  const bets = await db.query(`SELECT * FROM bets WHERE user_id = ? ORDER BY created_at DESC`, [req.user!.id]);

  const result = [];
  for (const bet of bets.rows) {
    const sels = await db.query(`SELECT * FROM bet_selections WHERE bet_id = ?`, [bet.id]);
    result.push({
      id: bet.id,
      type: bet.type,
      stake: Number(bet.stake),
      potentialWin: Number(bet.potential_win),
      status: bet.status,
      bookingCode: bet.booking_code,
      cashoutValue: bet.cashout_value ? Number(bet.cashout_value) : null,
      cashoutAvailable: boolFrom(bet, "cashout_available"),
      placedAt: bet.created_at,
      selections: sels.rows.map((s) => ({
        id: s.id,
        matchId: s.match_id,
        market: s.market,
        selection: s.selection,
        odds: Number(s.odds),
      })),
    });
  }
  res.json(result);
});

router.post("/place", authenticate, requirePermission("place_bets"), async (req, res) => {
  try {
    const { type, stake, selections, savedBookingCode } = req.body as {
      type: "single" | "multi";
      stake: number;
      selections: { matchId: string; market: string; selection: string; odds: number }[];
      savedBookingCode?: string;
    };

    if (!type || !stake || !selections?.length) {
      return res.status(400).json({ error: "Type, stake, and selections are required" });
    }
    if (stake <= 0) return res.status(400).json({ error: "Stake must be positive" });
    if (type === "single" && selections.length !== 1) {
      return res.status(400).json({ error: "Single bets must have exactly one selection" });
    }

    const db = await getDb();
    const userStatus = await db.query(`SELECT status FROM users WHERE id = ?`, [req.user!.id]);
    const status = userStatus.rows[0]?.status || "active";
    if (status !== "active") return res.status(403).json({ error: "Account is not active" });

    for (const sel of selections) {
      const match = await db.query(`SELECT betting_suspended, match_status FROM matches WHERE id = ?`, [sel.matchId]);
      if (match.rows.length === 0) return res.status(400).json({ error: "One or more matches not found" });
      if (boolFrom(match.rows[0], "betting_suspended")) {
        return res.status(400).json({ error: "Betting is suspended on one or more selected matches" });
      }
      if (normalizeMatchStatus(match.rows[0]) === "finished") {
        return res.status(400).json({ error: "One or more matches have finished" });
      }
    }

    const balance = await getWalletBalance(req.user!.id);
    if (balance < stake) {
      return res.status(400).json({ error: "Insufficient balance", balance, stake });
    }

    const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
    const potentialWin = stake * totalOdds;
    const betId = uuidv4();
    const bookingCode = generateBetBookingCode();
    const cashoutValue = stake * totalOdds * 0.85;

    await db.query(
      `INSERT INTO bets (id, user_id, type, stake, potential_win, status, booking_code, cashout_value, cashout_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [betId, req.user!.id, type, stake, potentialWin, "pending", bookingCode, cashoutValue, 1]
    );

    for (const sel of selections) {
      await db.query(
        `INSERT INTO bet_selections (id, bet_id, match_id, market, selection, odds) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), betId, sel.matchId, sel.market, sel.selection, sel.odds]
      );
    }

    await db.query(`UPDATE wallets SET balance = balance - ? WHERE user_id = ?`, [stake, req.user!.id]);
    await logAudit(req.user!.id, "place_bet", `Bet ${betId} placed, stake: ${stake}`);

    if (savedBookingCode) {
      await markBookingCodeUsed(savedBookingCode, req.user!.id, betId);
    }

    const newBalance = await getWalletBalance(req.user!.id);

    res.status(201).json({
      id: betId,
      bookingCode,
      stake,
      potentialWin,
      totalOdds,
      cashoutValue,
      balance: newBalance,
    });
  } catch (err) {
    console.error("[bets/place]", err);
    res.status(500).json({ error: "Failed to place bet" });
  }
});

router.post("/:id/cashout", authenticate, async (req, res) => {
  const db = await getDb();
  const bet = await db.query(`SELECT * FROM bets WHERE id = ? AND user_id = ?`, [req.params.id, req.user!.id]);
  if (bet.rows.length === 0) return res.status(404).json({ error: "Bet not found" });

  const row = bet.rows[0];
  if (row.status !== "pending") return res.status(400).json({ error: "Bet cannot be cashed out" });
  if (!boolFrom(row, "cashout_available")) return res.status(400).json({ error: "Cash out not available" });

  const cashoutValue = Number(row.cashout_value || row.stake);
  await db.query(`UPDATE bets SET status = 'cashout', cashout_available = 0 WHERE id = ?`, [req.params.id]);
  await db.query(`UPDATE wallets SET balance = balance + ? WHERE user_id = ?`, [cashoutValue, req.user!.id]);
  await logAudit(req.user!.id, "cashout", `Cashed out bet ${req.params.id} for ${formatCurrency(cashoutValue)}`);

  const newBalance = await getWalletBalance(req.user!.id);
  res.json({ message: "Cash out successful", amount: cashoutValue, balance: newBalance });
});

router.post("/booking-code/save", authenticate, async (req, res) => {
  try {
    const { selections, stake, betType, payload } = req.body as {
      selections?: unknown[];
      stake?: number;
      betType?: "single" | "multi";
      payload?: { selections?: unknown[]; stake?: number; betType?: "single" | "multi" };
    };

    const slipSelections = selections || payload?.selections;
    const slipStake = stake ?? payload?.stake ?? 10;
    const slipType = betType || payload?.betType || "single";

    if (!slipSelections?.length) {
      return res.status(400).json({ error: "At least one selection is required" });
    }

    const totalOdds = (slipSelections as { odds: number }[]).reduce((acc, s) => acc * Number(s.odds || 1), 1);
    const potentialWin = slipStake * totalOdds;

    const record = await saveBookingCodeRecord({
      userId: req.user!.id,
      selections: slipSelections,
      stake: slipStake,
      betType: slipType,
      totalOdds,
      potentialWin,
    });

    await logAudit(req.user!.id, "book_bet", `Booking code saved: ${record.code}`);
    res.json(record);
  } catch (err) {
    console.error("[booking-code/save]", err);
    res.status(500).json({ error: "Failed to save booking code" });
  }
});

router.get("/booking-code/:code", async (req, res) => {
  try {
    const userId = req.headers.authorization ? undefined : null;
    const result = await loadBookingCodeRecord(req.params.code, userId);
    if (!result) return res.status(404).json({ error: "Booking code not found" });
    if ("error" in result) return res.status(410).json({ error: result.error });

    res.json({
      code: result.code,
      payload: result.payload,
      createdAt: result.createdAt,
      expiresAt: result.expiresAt,
      status: result.status,
      creatorName: result.creatorName,
      creatorEmail: result.creatorEmail,
    });
  } catch (err) {
    console.error("[booking-code/load]", err);
    res.status(500).json({ error: "Failed to load booking code" });
  }
});

export default router;
