import type { MatchInput } from "./matches";

export interface MatchValidationResult {
  ok: boolean;
  error?: string;
}

function isPositiveOdds(value: unknown, label: string): string | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 1) {
    return `${label} must be a number greater than 1.00`;
  }
  return null;
}

export function validateMatchInput(input: Partial<MatchInput>, mode: "create" | "update" = "create"): MatchValidationResult {
  if (mode === "create") {
    if (!input.homeTeam?.trim()) return { ok: false, error: "Home team is required" };
    if (!input.awayTeam?.trim()) return { ok: false, error: "Away team is required" };
    if (!input.league?.trim()) return { ok: false, error: "League is required" };
    if (!input.sport?.trim()) return { ok: false, error: "Sport is required" };
  }

  if (input.homeTeam !== undefined && !input.homeTeam.trim()) {
    return { ok: false, error: "Home team cannot be empty" };
  }
  if (input.awayTeam !== undefined && !input.awayTeam.trim()) {
    return { ok: false, error: "Away team cannot be empty" };
  }
  if (input.league !== undefined && !input.league.trim()) {
    return { ok: false, error: "League cannot be empty" };
  }

  if (input.startTime) {
    const start = new Date(input.startTime);
    if (Number.isNaN(start.getTime())) {
      return { ok: false, error: "Kickoff date/time is invalid" };
    }
  }

  const oddsChecks = [
    isPositiveOdds(input.oddsHome, "Home odds"),
    isPositiveOdds(input.oddsAway, "Away odds"),
    input.oddsDraw != null ? isPositiveOdds(input.oddsDraw, "Draw odds") : null,
    input.oddsOver != null ? isPositiveOdds(input.oddsOver, "Over odds") : null,
    input.oddsUnder != null ? isPositiveOdds(input.oddsUnder, "Under odds") : null,
    input.oddsBttsYes != null ? isPositiveOdds(input.oddsBttsYes, "BTTS Yes odds") : null,
    input.oddsBttsNo != null ? isPositiveOdds(input.oddsBttsNo, "BTTS No odds") : null,
  ].filter(Boolean) as string[];

  if (oddsChecks.length > 0) {
    return { ok: false, error: oddsChecks[0] };
  }

  if (input.matchStatus && !["upcoming", "live", "finished"].includes(input.matchStatus)) {
    return { ok: false, error: "Match status must be upcoming, live, or finished" };
  }

  return { ok: true };
}

export function formatDbError(err: unknown): string {
  if (!(err instanceof Error)) return "Unknown database error";

  const msg = err.message;
  if (msg.includes("duplicate key") || msg.includes("UNIQUE constraint")) {
    return "A record with the same unique identifier already exists. Please try again.";
  }
  if (msg.includes("does not exist") && msg.includes("column")) {
    return "Database schema is out of date. Run migrations on the server (is_simulated / created_at columns missing).";
  }
  if (msg.includes("violates not-null constraint")) {
    return "A required database field was missing. Check all required match fields.";
  }
  return msg;
}
