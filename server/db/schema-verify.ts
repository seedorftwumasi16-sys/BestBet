import type { Database } from "./index";
import { PG_SIMULATED_MATCH_COLUMNS_SQL, SIMULATED_MATCH_COLUMNS_SQL } from "./schema-ext";

const REQUIRED_MATCH_COLUMNS = [
  "is_simulated",
  "created_at",
  "home_team_logo",
  "away_team_logo",
  "league_badge",
  "match_status",
  "is_featured",
  "betting_suspended",
  "status_override",
] as const;

async function pgColumnExists(db: Database, table: string, column: string): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ? AND column_name = ? LIMIT 1`,
    [table, column]
  );
  return result.rows.length > 0;
}

async function listPgColumns(db: Database, table: string): Promise<Set<string>> {
  const result = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ?`,
    [table]
  );
  return new Set(result.rows.map((row) => String(row.column_name).toLowerCase()));
}

async function runStatements(db: Database, sql: string) {
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    try {
      await db.exec(statement + ";");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("already exists") && !msg.includes("duplicate column")) {
        console.warn("[SchemaVerify]", msg);
      }
    }
  }
}

export async function ensureMatchSchema(db: Database): Promise<{ ok: boolean; missing: string[] }> {
  if (db.driver === "postgresql") {
    const columns = await listPgColumns(db, "matches");
    const missing = REQUIRED_MATCH_COLUMNS.filter((col) => !columns.has(col));

    if (missing.length > 0) {
      console.warn(`[SchemaVerify] Missing match columns: ${missing.join(", ")} — applying migrations`);
      await runStatements(
        db,
        db.driver === "postgresql" ? PG_SIMULATED_MATCH_COLUMNS_SQL : SIMULATED_MATCH_COLUMNS_SQL
      );
      await runStatements(db, `
        ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_team_logo TEXT;
        ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_team_logo TEXT;
        ALTER TABLE matches ADD COLUMN IF NOT EXISTS league_badge TEXT;
        ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_status TEXT DEFAULT 'upcoming';
        ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
        ALTER TABLE matches ADD COLUMN IF NOT EXISTS betting_suspended BOOLEAN DEFAULT FALSE;
        ALTER TABLE matches ADD COLUMN IF NOT EXISTS status_override BOOLEAN DEFAULT FALSE;
      `);

      const recheck = await listPgColumns(db, "matches");
      const stillMissing = REQUIRED_MATCH_COLUMNS.filter((col) => !recheck.has(col));
      return { ok: stillMissing.length === 0, missing: stillMissing };
    }

    return { ok: true, missing: [] };
  }

  // JSON/SQLite driver stores rows dynamically — columns are created on insert.
  return { ok: true, missing: [] };
}

export async function getMatchSchemaStatus(db: Database): Promise<{
  driver: string;
  ok: boolean;
  missing: string[];
  oddsTable: boolean;
}> {
  let missing: string[] = [];
  let oddsTable = true;

  if (db.driver === "postgresql") {
    const columns = await listPgColumns(db, "matches");
    missing = REQUIRED_MATCH_COLUMNS.filter((col) => !columns.has(col));
    oddsTable = await pgColumnExists(db, "odds", "id");
  }

  return {
    driver: db.driver,
    ok: missing.length === 0 && oddsTable,
    missing,
    oddsTable,
  };
}
