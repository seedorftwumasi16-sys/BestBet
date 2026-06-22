import { Router } from "express";
import { getDb, getWalletBalance } from "../db";
import { authenticate, requirePermission, logAudit } from "../middleware/auth";
import { boolFrom } from "../db/helpers";
import { listMatches, type FixtureWindow } from "../lib/matches";
import { saveBookingCodeRecord, loadBookingCodeRecord } from "../lib/booking-codes";
import { placeBetRecord } from "../lib/place-bet";
import { formatCurrency } from "../lib/currency";

const router = Router();

router.get("/matches", async (req, res) => {
  try {
    const { sport, live, featured, league, search, window, status } = req.query;
    const validWindows = new Set(["live", "today", "tomorrow", "upcoming", "week", "results"]);
    const validStatuses = new Set(["upcoming", "live", "finished"]);
    const matches = await listMatches({
      sport: sport ? String(sport) : undefined,
      live: live === "true" ? true : undefined,
      featured: featured === "true" ? true : undefined,
      league: league ? String(league) : undefined,
      search: search ? String(search) : undefined,
      window: window && validWindows.has(String(window)) ? (String(window) as FixtureWindow) : undefined,
      status:
        status && validStatuses.has(String(status))
          ? (String(status) as "upcoming" | "live" | "finished")
          : undefined,
    });
    res.json(matches);
  } catch (err) {
    console.error("[bets/matches]", err);
    res.status(500).json({ error: "Failed to load matches" });
  }
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
  const userId = req.user!.id;

  try {
    const { type, stake, selections, savedBookingCode } = req.body as {
      type: "single" | "multi";
      stake: number;
      selections: { matchId: string; market: string; selection: string; odds: number }[];
      savedBookingCode?: string;
    };

    console.log("[bets/place] Request", {
      userId,
      type,
      stake,
      selectionCount: selections?.length ?? 0,
      selections: selections?.map((s) => ({
        matchId: s.matchId,
        market: s.market,
        selection: s.selection,
        odds: s.odds,
      })),
      savedBookingCode: savedBookingCode || null,
    });

    if (!type || !stake || !selections?.length) {
      return res.status(400).json({ error: "Type, stake, and selections are required" });
    }
    if (stake <= 0) return res.status(400).json({ error: "Stake must be positive" });
    if (type === "single" && selections.length !== 1) {
      return res.status(400).json({ error: "Single bets must have exactly one selection" });
    }
    if (type === "multi" && selections.length < 2) {
      return res.status(400).json({ error: "Multi bets require at least two selections" });
    }

    const result = await placeBetRecord({
      userId,
      type,
      stake: Number(stake),
      selections,
      savedBookingCode,
    });

    console.log("[bets/place] Success", {
      userId,
      betId: result.id,
      bookingCode: result.bookingCode,
      stake: result.stake,
      totalOdds: result.totalOdds,
    });

    res.status(201).json(result);
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : String(err);
    const extra = err as { balance?: number; stake?: number };

    console.error("[bets/place] FAILED:", {
      userId,
      message,
      statusCode,
      stack: err instanceof Error ? err.stack : undefined,
    });

    res.status(statusCode).json({
      error: message || "Failed to place bet",
      ...(extra.balance !== undefined ? { balance: extra.balance, stake: extra.stake } : {}),
    });
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
