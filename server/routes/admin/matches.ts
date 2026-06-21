import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { authenticate, requireRole, logAudit } from "../middleware/auth";
import {
  createMatchRecord,
  deleteMatchRecord,
  emitMatchChange,
  getMatchById,
  listMatches,
  updateMatchRecord,
  type MatchInput,
  type MatchStatus,
} from "../lib/matches";

const router = Router();

function parseMatchInput(body: Record<string, unknown>): Partial<MatchInput> {
  const input: Partial<MatchInput> = {};
  if (body.homeTeam !== undefined) input.homeTeam = String(body.homeTeam);
  if (body.awayTeam !== undefined) input.awayTeam = String(body.awayTeam);
  if (body.league !== undefined) input.league = String(body.league);
  if (body.sport !== undefined) input.sport = String(body.sport);
  if (body.startTime !== undefined) input.startTime = String(body.startTime);
  if (body.matchStatus !== undefined) input.matchStatus = body.matchStatus as MatchStatus;
  if (body.isFeatured !== undefined) input.isFeatured = body.isFeatured === true || body.isFeatured === "true";
  if (body.bettingSuspended !== undefined) {
    input.bettingSuspended = body.bettingSuspended === true || body.bettingSuspended === "true";
  }
  if (body.oddsHome !== undefined) input.oddsHome = Number(body.oddsHome);
  if (body.oddsDraw !== undefined) input.oddsDraw = body.oddsDraw === null || body.oddsDraw === "" ? null : Number(body.oddsDraw);
  if (body.oddsAway !== undefined) input.oddsAway = Number(body.oddsAway);
  if (body.oddsOver !== undefined) input.oddsOver = body.oddsOver === null || body.oddsOver === "" ? null : Number(body.oddsOver);
  if (body.oddsUnder !== undefined) input.oddsUnder = body.oddsUnder === null || body.oddsUnder === "" ? null : Number(body.oddsUnder);
  if (body.oddsBttsYes !== undefined) input.oddsBttsYes = body.oddsBttsYes === null || body.oddsBttsYes === "" ? null : Number(body.oddsBttsYes);
  if (body.oddsBttsNo !== undefined) input.oddsBttsNo = body.oddsBttsNo === null || body.oddsBttsNo === "" ? null : Number(body.oddsBttsNo);
  if (body.overUnderLine !== undefined) input.overUnderLine = Number(body.overUnderLine);
  if (body.homeScore !== undefined) input.homeScore = Number(body.homeScore);
  if (body.awayScore !== undefined) input.awayScore = Number(body.awayScore);
  if (body.liveMinute !== undefined) input.liveMinute = Number(body.liveMinute);
  return input;
}

router.use(authenticate, requireRole("super_admin", "sub_admin"));

router.get("/", async (_req, res) => {
  const matches = await listMatches();
  res.json(matches);
});

router.post("/", async (req, res) => {
  try {
    const input = parseMatchInput(req.body);
    if (!input.homeTeam || !input.awayTeam || !input.league || !input.sport) {
      return res.status(400).json({ error: "homeTeam, awayTeam, league, and sport are required" });
    }

    const id = uuidv4();
    await createMatchRecord(id, {
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      league: input.league,
      sport: input.sport,
      startTime: input.startTime,
      matchStatus: input.matchStatus || "upcoming",
      isFeatured: input.isFeatured,
      bettingSuspended: input.bettingSuspended,
      oddsHome: input.oddsHome,
      oddsDraw: input.oddsDraw,
      oddsAway: input.oddsAway,
      oddsOver: input.oddsOver,
      oddsUnder: input.oddsUnder,
      oddsBttsYes: input.oddsBttsYes,
      oddsBttsNo: input.oddsBttsNo,
      overUnderLine: input.overUnderLine,
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      liveMinute: input.liveMinute,
    });
    const match = await getMatchById(id);
    await logAudit(req.user!.id, "create_match", `Created ${input.homeTeam} vs ${input.awayTeam}`);
    await emitMatchChange("created", match);
    res.status(201).json(match);
  } catch (err) {
    console.error("[admin/matches POST]", err);
    res.status(500).json({ error: "Failed to create match" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const input = parseMatchInput(req.body);
    const match = await updateMatchRecord(req.params.id, input);
    if (!match) return res.status(404).json({ error: "Match not found" });

    await logAudit(req.user!.id, "update_match", `Updated match ${req.params.id}`);
    await emitMatchChange("updated", match);
    res.json(match);
  } catch (err) {
    console.error("[admin/matches PUT]", err);
    res.status(500).json({ error: "Failed to update match" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteMatchRecord(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Match not found" });

    await logAudit(req.user!.id, "delete_match", `Deleted match ${req.params.id}`);
    await emitMatchChange("deleted", null, req.params.id);
    res.json({ message: "Match deleted" });
  } catch (err) {
    console.error("[admin/matches DELETE]", err);
    res.status(500).json({ error: "Failed to delete match" });
  }
});

export default router;
