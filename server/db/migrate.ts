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
} from "./schema-ext";

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

  if (db.driver === "postgresql") {
    await runStatements(db, USER_COLUMNS_SQL);
    await runStatements(db, WALLET_COLUMNS_SQL);
    await runStatements(db, DEPOSIT_COLUMNS_SQL);
    await runStatements(db, WITHDRAWAL_COLUMNS_SQL);
    await runStatements(db, BET_COLUMNS_SQL);
  }

  return { driver: db.driver };
}
