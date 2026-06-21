import { getDb } from "./index";
import { SCHEMA_SQL, PG_SCHEMA_SQL } from "./schema";
import {
  SCHEMA_EXT_SQL,
  PG_SCHEMA_EXT_SQL,
  USER_COLUMNS_SQL,
  WALLET_COLUMNS_SQL,
  DEPOSIT_COLUMNS_SQL,
  WITHDRAWAL_COLUMNS_SQL,
  BET_COLUMNS_SQL,
  MATCH_COLUMNS_SQL,
  BOOKING_COLUMNS_SQL,
  LOGIN_LOG_COLUMNS_SQL,
  SPORTSDB_SCHEMA_SQL,
  SPORTSDB_COLUMNS_SQL,
  SIMULATED_MATCH_COLUMNS_SQL,
  PG_SIMULATED_MATCH_COLUMNS_SQL,
  STATUS_OVERRIDE_COLUMNS_SQL,
  MATCH_TIMER_COLUMNS_SQL,
} from "./schema-ext";
import { recreateProtectedSuperAdmin } from "../lib/super-admin";
import { ensureMatchSchema } from "./schema-verify";
import { cacheInvalidatePrefix } from "../services/redis";

async function runStatements(db: Awaited<ReturnType<typeof getDb>>, sql: string) {
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
        console.warn("[Migrate]", msg);
      }
    }
  }
}

export async function migrate(): Promise<{ driver: string }> {
  const db = await getDb();
  const schema = db.driver === "postgresql" ? PG_SCHEMA_SQL : SCHEMA_SQL;
  const schemaExt = db.driver === "postgresql" ? PG_SCHEMA_EXT_SQL : SCHEMA_EXT_SQL;

  await runStatements(db, schema);
  await runStatements(db, schemaExt);

  await runStatements(db, SPORTSDB_SCHEMA_SQL);

  if (db.driver === "postgresql") {
    await runStatements(db, USER_COLUMNS_SQL);
    await runStatements(db, WALLET_COLUMNS_SQL);
    await runStatements(db, DEPOSIT_COLUMNS_SQL);
    await runStatements(db, WITHDRAWAL_COLUMNS_SQL);
    await runStatements(db, BET_COLUMNS_SQL);
    await runStatements(db, MATCH_COLUMNS_SQL);
    await runStatements(db, BOOKING_COLUMNS_SQL);
    await runStatements(db, LOGIN_LOG_COLUMNS_SQL);
    await runStatements(db, SPORTSDB_COLUMNS_SQL);
    await runStatements(db, PG_SIMULATED_MATCH_COLUMNS_SQL);
    await runStatements(db, STATUS_OVERRIDE_COLUMNS_SQL);
    await runStatements(db, MATCH_TIMER_COLUMNS_SQL);
  } else {
    await runStatements(db, MATCH_COLUMNS_SQL.replace(/ADD COLUMN IF NOT EXISTS/g, "ADD COLUMN"));
    await runStatements(db, LOGIN_LOG_COLUMNS_SQL.replace(/ADD COLUMN IF NOT EXISTS/g, "ADD COLUMN"));
    await runStatements(db, SPORTSDB_COLUMNS_SQL.replace(/ADD COLUMN IF NOT EXISTS/g, "ADD COLUMN"));
    await runStatements(db, SIMULATED_MATCH_COLUMNS_SQL.replace(/ADD COLUMN IF NOT EXISTS/g, "ADD COLUMN"));
    await runStatements(db, STATUS_OVERRIDE_COLUMNS_SQL.replace(/ADD COLUMN IF NOT EXISTS/g, "ADD COLUMN"));
    await runStatements(db, MATCH_TIMER_COLUMNS_SQL.replace(/ADD COLUMN IF NOT EXISTS/g, "ADD COLUMN"));
  }

  const schemaCheck = await ensureMatchSchema(db);
  if (!schemaCheck.ok) {
    console.error("[Migrate] Match schema still incomplete:", schemaCheck.missing.join(", "));
  }

  await cacheInvalidatePrefix("matches:");

  await recreateProtectedSuperAdmin(db);

  return { driver: db.driver };
}
