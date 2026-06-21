import { Router } from "express";

import { getDb } from "../db";
import { getMatchSchemaStatus } from "../db/schema-verify";
import { PROTECTED_SUPER_ADMIN_EMAIL } from "../lib/super-admin";

const AUTH_BUILD = "api-sports-football-v1";

const router = Router();

router.get("/health", async (_req, res) => {
  let dbStatus: Awaited<ReturnType<typeof getMatchSchemaStatus>> | null = null;
  let adminAccount: { exists: boolean; email: string; status?: string; role?: string } | null = null;

  try {
    const db = await getDb();
    dbStatus = await getMatchSchemaStatus(db);

    const admin = await db.query(
      `SELECT id, email, status, role_id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1`,
      [PROTECTED_SUPER_ADMIN_EMAIL]
    );
    if (admin.rows.length > 0) {
      adminAccount = {
        exists: true,
        email: PROTECTED_SUPER_ADMIN_EMAIL,
        status: String(admin.rows[0].status ?? "active"),
        role: String(admin.rows[0].role_id ?? "super_admin"),
      };
    } else {
      adminAccount = { exists: false, email: PROTECTED_SUPER_ADMIN_EMAIL };
    }
  } catch {
    dbStatus = null;
    adminAccount = null;
  }

  res.json({
    status: "ok",
    authBuild: AUTH_BUILD,
    gitSha: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null,
    nodeEnv: process.env.NODE_ENV || "development",
    db: dbStatus,
    admin: adminAccount,
  });
});
export default router;
