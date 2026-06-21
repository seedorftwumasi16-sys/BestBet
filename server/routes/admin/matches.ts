import { Router } from "express";

import { v4 as uuidv4 } from "uuid";

import { authenticate, requireRole, logAudit } from "../../middleware/auth";

import {

  createMatchRecord,

  deleteMatchRecord,

  emitMatchChange,

  getMatchById,

  listMatches,

  updateMatchRecord,

  type MatchInput,

  type MatchStatus,

} from "../../lib/matches";

import { validateMatchInput, formatDbError } from "../../lib/match-validation";



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

  if (body.isSimulated !== undefined) input.isSimulated = body.isSimulated === true || body.isSimulated === "true";

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

  if (body.correctScoreOdds !== undefined && typeof body.correctScoreOdds === "object") {

    input.correctScoreOdds = body.correctScoreOdds as Record<string, number>;

  }

  if (body.doubleChanceOdds !== undefined && typeof body.doubleChanceOdds === "object") {

    input.doubleChanceOdds = body.doubleChanceOdds as Record<string, number>;

  }

  return input;

}



function buildCreatePayload(input: Partial<MatchInput>): MatchInput {

  return {

    homeTeam: input.homeTeam!,

    awayTeam: input.awayTeam!,

    league: input.league!,

    sport: input.sport!,

    startTime: input.startTime,

    matchStatus: input.matchStatus || "upcoming",

    isFeatured: input.isFeatured,

    bettingSuspended: input.bettingSuspended,

    isSimulated: input.isSimulated,

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

    correctScoreOdds: input.correctScoreOdds,

    doubleChanceOdds: input.doubleChanceOdds,

  };

}



router.use(authenticate, requireRole("super_admin", "sub_admin"));



router.get("/", async (_req, res) => {

  const matches = await listMatches();

  res.json(matches);

});



router.post("/", async (req, res) => {

  try {

    const input = parseMatchInput(req.body);

    const validation = validateMatchInput(input, "create");

    if (!validation.ok) {

      return res.status(400).json({ error: validation.error });

    }



    const id = uuidv4();

    const payload = buildCreatePayload(input);

    await createMatchRecord(id, payload);

    const match = await getMatchById(id);

    if (!match) {

      return res.status(500).json({ error: "Match was created but could not be loaded. Refresh and try again." });

    }



    await logAudit(req.user!.id, "create_match", `Created ${payload.homeTeam} vs ${payload.awayTeam}`);

    await emitMatchChange("created", match);

    res.status(201).json(match);

  } catch (err) {

    console.error("[admin/matches POST]", err);

    res.status(500).json({ error: formatDbError(err) });

  }

});



router.post("/simulated-matches", async (req, res) => {

  req.body = { ...req.body, isSimulated: true };

  try {

    const input = parseMatchInput(req.body);

    input.isSimulated = true;

    const validation = validateMatchInput(input, "create");

    if (!validation.ok) {

      return res.status(400).json({ error: validation.error });

    }



    const id = uuidv4();

    const payload = buildCreatePayload({ ...input, isSimulated: true });

    await createMatchRecord(id, payload);

    const match = await getMatchById(id);

    if (!match) {

      return res.status(500).json({ error: "Match was created but could not be loaded. Refresh and try again." });

    }



    await logAudit(req.user!.id, "create_simulated_match", `Created simulated ${payload.homeTeam} vs ${payload.awayTeam}`);

    await emitMatchChange("created", match);

    res.status(201).json(match);

  } catch (err) {

    console.error("[admin/matches POST /simulated-matches]", err);

    res.status(500).json({ error: formatDbError(err) });

  }

});



router.put("/:id", async (req, res) => {

  try {

    const input = parseMatchInput(req.body);

    const validation = validateMatchInput(input, "update");

    if (!validation.ok) {

      return res.status(400).json({ error: validation.error });

    }



    const match = await updateMatchRecord(req.params.id, input);

    if (!match) return res.status(404).json({ error: "Match not found" });



    await logAudit(req.user!.id, "update_match", `Updated match ${req.params.id}`);

    await emitMatchChange("updated", match);

    res.json(match);

  } catch (err) {

    console.error("[admin/matches PUT]", err);

    res.status(500).json({ error: formatDbError(err) });

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

    res.status(500).json({ error: formatDbError(err) });

  }

});



export default router;


