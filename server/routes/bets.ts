import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb, getWalletBalance } from "../db";
import { authenticate, requirePermission, logAudit } from "../middleware/auth";
import { boolFrom } from "../db/helpers";

const router = Router();

function generateBookingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "BB-";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

router.get("/matches", async (req, res) => {
  const { sport, live } = req.query;
  const db = await getDb();
  const result = await db.query(`SELECT * FROM matches ORDER BY is_live DESC, start_time ASC`);
  let rows = result.rows;

  if (sport) rows = rows.filter((m) => m.sport === sport);
  if (live === "true") rows = rows.filter((m) => boolFrom(m, "is_live"));

  const matches = rows.map((m) => ({
    id: m.id,
    homeTeam: { name: m.home_team, shortName: String(m.home_team).slice(0, 3).toUpperCase(), logo: "⚽" },
    awayTeam: { name: m.away_team, shortName: String(m.away_team).slice(0, 3).toUpperCase(), logo: "⚽" },
    league: m.league,
    leagueId: String(m.league).toLowerCase().replace(/\s+/g, "-"),
    sport: m.sport,
    startTime: m.start_time,
    isLive: boolFrom(m, "is_live"),
    liveMinute: m.live_minute,
    homeScore: m.home_score,
    awayScore: m.away_score,
    odds: { home: Number(m.odds_home), draw: m.odds_draw ? Number(m.odds_draw) : undefined, away: Number(m.odds_away) },
  }));
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
    const { type, stake, selections } = req.body as {
      type: "single" | "multi";
      stake: number;
      selections: { matchId: string; market: string; selection: string; odds: number }[];
    };

    if (!type || !stake || !selections?.length) {
      return res.status(400).json({ error: "Type, stake, and selections are required" });
    }
    if (stake <= 0) return res.status(400).json({ error: "Stake must be positive" });

    const db = await getDb();
    const userStatus = await db.query(`SELECT status FROM users WHERE id = ?`, [req.user!.id]);
    const status = userStatus.rows[0]?.status || "active";
    if (status !== "active") return res.status(403).json({ error: "Account is not active" });

    const balance = await getWalletBalance(req.user!.id);
    if (balance < stake) {
      return res.status(400).json({ error: "Insufficient balance", balance, stake });
    }

    const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
    const potentialWin = stake * totalOdds;
    const betId = uuidv4();
    const bookingCode = generateBookingCode();
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
  await logAudit(req.user!.id, "cashout", `Cashed out bet ${req.params.id} for GHS ${cashoutValue}`);

  const newBalance = await getWalletBalance(req.user!.id);
  res.json({ message: "Cash out successful", amount: cashoutValue, balance: newBalance });
});

router.post("/booking-code/save", authenticate, async (req, res) => {
  const { payload } = req.body;
  if (!payload) return res.status(400).json({ error: "Payload is required" });

  const code = generateBookingCode();
  const db = await getDb();
  await db.query(
    `INSERT INTO booking_codes (id, code, user_id, payload) VALUES (?, ?, ?, ?)`,
    [uuidv4(), code, req.user!.id, JSON.stringify(payload)]
  );
  await db.query(
    `INSERT INTO booking_logs (id, user_id, code, action, details) VALUES (?, ?, ?, ?, ?)`,
    [uuidv4(), req.user!.id, code, "save", JSON.stringify({ selectionCount: payload.selections?.length || 0 })]
  );
  await logAudit(req.user!.id, "book_bet", `Booking code saved: ${code}`);

  res.json({ code });
});

router.get("/booking-code/:code", async (req, res) => {
  const db = await getDb();
  const result = await db.query(`SELECT payload, user_id FROM booking_codes WHERE code = ?`, [req.params.code]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Booking code not found" });
  }

  await db.query(
    `INSERT INTO booking_logs (id, user_id, code, action) VALUES (?, ?, ?, ?)`,
    [uuidv4(), null, req.params.code, "load"]
  );

  res.json({ payload: JSON.parse(result.rows[0].payload as string) });
});

export default router;
