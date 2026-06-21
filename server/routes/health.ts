import { Router } from "express";

import { getDb } from "../db";
import { getMatchSchemaStatus } from "../db/schema-verify";

const AUTH_BUILD = "simulated-v3";

const router = Router();

router.get("/health", async (_req, res) => {
  let dbStatus: Awaited<ReturnType<typeof getMatchSchemaStatus>> | null = null;
  try {
    const db = await getDb();
    dbStatus = await getMatchSchemaStatus(db);
  } catch {
    dbStatus = null;
  }

  res.json({
    status: "ok",
    authBuild: AUTH_BUILD,
    gitSha: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null,
    nodeEnv: process.env.NODE_ENV || "development",
    db: dbStatus,
  });
});
export default router;
