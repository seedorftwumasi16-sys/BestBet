import { Router } from "express";

const AUTH_BUILD = "ban-fix-v2";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    authBuild: AUTH_BUILD,
    gitSha: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null,
    nodeEnv: process.env.NODE_ENV || "development",
  });
});

export default router;
