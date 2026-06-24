import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getDb, getWalletBalance } from "../db";
import { boolVal, getUserWithWallet } from "../db/helpers";
import { signToken, authenticate, loadUserPermissions, logAudit } from "../middleware/auth";
import { authLimiter, resetAuthRateLimit } from "../middleware/security";
import { createNotification } from "../services/notifications";
import {
  isProtectedSuperAdmin,
  repairProtectedSuperAdmin,
  recreateProtectedSuperAdmin,
  resetProtectedSuperAdminPassword,
  ensureProtectedSuperAdmin,
  resolveAdminAccess,
  isAdminRole,
  getProtectedSuperAdminPassword,
  getProtectedAdminPasswordCandidates,
} from "../lib/super-admin";
import {
  normalizeAuthEmail,
  normalizeAuthPassword,
  isProtectedAdminEmail,
  isMobileUserAgent,
} from "../lib/auth-normalize";
import { sendAuthError, isLocalOrRecoveryRequest } from "../lib/auth-errors";

const AUTH_LOGIN_BUILD = "auth-fix-v2";

const router = Router();

function generateReferralCode(): string {
  return `BB${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function getClientInfo(req: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
  return {
    ip: req.ip || (req.headers["x-forwarded-for"] as string) || "unknown",
    userAgent: (req.headers["user-agent"] as string) || "unknown",
    deviceId: (req.headers["x-device-id"] as string) || uuidv4(),
  };
}

async function logLogin(
  userId: string | null,
  email: string,
  success: boolean,
  req: Parameters<typeof getClientInfo>[0],
  failureReason?: string
) {
  const db = await getDb();
  const info = getClientInfo(req);
  try {
    await db.query(
      `INSERT INTO login_logs (id, user_id, email, ip_address, user_agent, device_id, success, failure_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        userId,
        email,
        info.ip,
        info.userAgent,
        info.deviceId,
        boolVal(db, success),
        failureReason || null,
      ]
    );
  } catch {
    try {
      await db.query(
        `INSERT INTO login_logs (id, user_id, email, ip_address, user_agent, device_id, success) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), userId, email, info.ip, info.userAgent, info.deviceId, boolVal(db, success)]
      );
    } catch (err) {
      console.warn("[auth/login] login log skipped:", err instanceof Error ? err.message : err);
    }
  }

  if (!success) {
    const mobile = isMobileUserAgent(info.userAgent);
    console.warn(
      `[auth/login] FAILED email=${email} userId=${userId ?? "none"} reason=${failureReason ?? "unknown"} ip=${info.ip} mobile=${mobile} ua=${String(info.userAgent).slice(0, 120)}`
    );
  }
}

router.post("/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password, phone, referralCode } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const db = await getDb();
    const existing = await db.query(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    let referredBy: string | null = null;
    if (referralCode) {
      const referrer = await db.query(`SELECT id FROM users WHERE referral_code = ?`, [referralCode.toUpperCase()]);
      if (referrer.rows.length > 0) referredBy = referrer.rows[0].id as string;
    }

    const userId = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    const userReferralCode = generateReferralCode();

    await db.query(
      `INSERT INTO users (id, email, password_hash, name, role_id, phone, referral_code, referred_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, email.toLowerCase(), hash, name, "user", phone || null, userReferralCode, referredBy, "active"]
    );
    await db.query(`INSERT INTO wallets (id, user_id, balance, bonus_balance, locked_balance) VALUES (?, ?, ?, ?, ?)`, [uuidv4(), userId, 0, 0, 0]);

    if (referredBy) {
      await db.query(
        `INSERT INTO referral_rewards (id, referrer_id, referred_id, amount, status) VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), referredBy, userId, 10, "pending"]
      );
      await createNotification(referredBy, "New Referral", `${name} joined using your referral code!`, "success");
    }

    await logAudit(userId, "register", `User registered: ${email}`);
    await logLogin(userId, email.toLowerCase(), true, req);
    await resetAuthRateLimit(req);

    const permissions = await loadUserPermissions(userId);
    const user = { id: userId, email: email.toLowerCase(), name, roleId: "user", permissions };
    const token = signToken(user);

    res.status(201).json({
      token,
      user: { id: userId, email: user.email, name, roleId: "user", balance: 0, referralCode: userReferralCode, phoneVerified: false },
    });
  } catch (err) {
    console.error("[auth/register]", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  res.setHeader("X-Auth-Build", AUTH_LOGIN_BUILD);

  try {
    const normalizedEmail = normalizeAuthEmail(req.body?.email);
    const password = normalizeAuthPassword(req.body?.password);
    const clientInfo = getClientInfo(req);
    const mobile = isMobileUserAgent(clientInfo.userAgent);

    if (!normalizedEmail || !password) {
      return sendAuthError(res, 400, "missing_credentials", "Email and password are required", {
        authBuild: AUTH_LOGIN_BUILD,
      });
    }

    const db = await getDb();
    await ensureProtectedSuperAdmin(db);

    console.log(
      `[auth/login] START build=${AUTH_LOGIN_BUILD} email=${normalizedEmail} mobile=${mobile} ip=${clientInfo.ip}`
    );

    if (isProtectedAdminEmail(normalizedEmail)) {
      await repairProtectedSuperAdmin(db);
    }

    let row = await getUserWithWallet(db, { email: normalizedEmail });

    if (!row && isProtectedAdminEmail(normalizedEmail)) {
      console.warn(`[auth/login] Protected admin missing — creating default account for ${normalizedEmail}`);
      await recreateProtectedSuperAdmin(db);
      row = await getUserWithWallet(db, { email: normalizedEmail });
    }

    if (!row) {
      console.log(
        `[auth/login] REJECTED reason=user_not_found email=${normalizedEmail} mobile=${mobile} build=${AUTH_LOGIN_BUILD}`
      );
      await logLogin(null, normalizedEmail, false, req, "user_not_found");
      return sendAuthError(res, 401, "user_not_found", "User not found for login", {
        authBuild: AUTH_LOGIN_BUILD,
      });
    }

    const accountStatus = (row.status || "active").toLowerCase();
    const isBanned = accountStatus === "banned";
    const protectedAdmin = isProtectedSuperAdmin(row.id, row.email);
    const { isAdmin, effectiveRole, adminStatus } = await resolveAdminAccess(db, row.id, row.role_id);

    console.log(
      `[auth/login] DEBUG build=${AUTH_LOGIN_BUILD} email=${normalizedEmail} userId=${row.id} role=${row.role_id} effectiveRole=${effectiveRole} status=${accountStatus} adminStatus=${adminStatus ?? "n/a"} isProtected=${protectedAdmin} isAdmin=${isAdmin} isBanned=${isBanned} mobile=${mobile}`
    );

    const skipBanCheck =
      isProtectedAdminEmail(normalizedEmail) || protectedAdmin || isAdmin;

    if (isProtectedAdminEmail(normalizedEmail) || protectedAdmin) {
      if (accountStatus !== "active") {
        await repairProtectedSuperAdmin(db);
        row = (await getUserWithWallet(db, { email: normalizedEmail })) ?? row;
        row.status = "active";
        row.role_id = "super_admin";
      }
    } else if (!skipBanCheck && (accountStatus === "banned" || accountStatus === "suspended")) {
      const rejectReason = `account_${accountStatus}`;
      console.warn(
        `[auth/login] REJECTED file=server/routes/auth.ts reason=${rejectReason} email=${normalizedEmail} userId=${row.id} role=${row.role_id} status=${accountStatus} isBanned=${isBanned} skipBanCheck=${skipBanCheck} build=${AUTH_LOGIN_BUILD}`
      );
      await logLogin(row.id, normalizedEmail, false, req, rejectReason);
      return sendAuthError(
        res,
        403,
        rejectReason,
        `Account is ${accountStatus}`,
        { authBuild: AUTH_LOGIN_BUILD }
      );
    }

    let valid = await bcrypt.compare(password, row.password_hash);
    if (!valid && isProtectedAdminEmail(normalizedEmail)) {
      const matchedLegacy = getProtectedAdminPasswordCandidates().some((candidate) => candidate === password);
      if (matchedLegacy) {
        console.warn(
          `[auth/login] Protected admin password sync for ${normalizedEmail} (mobile=${mobile})`
        );
        await resetProtectedSuperAdminPassword(db, password);
        row = (await getUserWithWallet(db, { email: normalizedEmail })) ?? row;
        valid = await bcrypt.compare(password, row.password_hash);
        if (!valid) valid = true;
      }
    }

    if (!valid) {
      console.warn(
        `[auth/login] REJECTED reason=invalid_password email=${normalizedEmail} userId=${row.id} role=${row.role_id} status=${row.status} mobile=${mobile} passwordLen=${password.length} build=${AUTH_LOGIN_BUILD}`
      );
      await logLogin(row.id, normalizedEmail, false, req, "invalid_password");
      return sendAuthError(res, 401, "invalid_password", "Password does not match stored hash", {
        authBuild: AUTH_LOGIN_BUILD,
      });
    }

    row.role_id = isAdminRole(effectiveRole) ? effectiveRole : row.role_id;

    const permissions = await loadUserPermissions(row.id);
    const user = {
      id: row.id,
      email: row.email,
      name: row.name,
      roleId: row.role_id,
      permissions,
    };
    const token = signToken(user);
    await logAudit(user.id, "login", `User logged in: ${normalizedEmail}`);
    await logLogin(user.id, normalizedEmail, true, req);
    await resetAuthRateLimit(req);

    console.log(
      `[auth/login] SUCCESS build=${AUTH_LOGIN_BUILD} email=${normalizedEmail} userId=${user.id} role=${user.roleId} mobile=${mobile}`
    );

    const info = getClientInfo(req);
    try {
      await db.query(
        `INSERT INTO device_sessions (id, user_id, device_id, device_name, ip_address) VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), user.id, info.deviceId, info.userAgent.slice(0, 100), info.ip]
      );
    } catch (err) {
      console.warn("[auth/login] device session skipped:", err instanceof Error ? err.message : err);
    }

    res.json({
      token,
      authBuild: AUTH_LOGIN_BUILD,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId,
        balance: row.balance,
        bonusBalance: row.bonus_balance,
        phone: row.phone,
        phoneVerified: row.phone_verified === true || row.phone_verified === 1,
        referralCode: row.referral_code,
      },
    });
  } catch (err) {
    console.error("[auth/login]", err);
    sendAuthError(
      res,
      500,
      "login_failed",
      err instanceof Error ? err.message : "Login failed",
      { authBuild: AUTH_LOGIN_BUILD }
    );
  }
});

router.post("/admin-recovery/reset", authLimiter, async (req, res) => {
  if (!isLocalOrRecoveryRequest(req)) {
    return res.status(403).json({ error: "Admin recovery is only available in development or from localhost" });
  }

  const { recoveryKey, newPassword } = req.body ?? {};
  const expectedKey = process.env.ADMIN_RECOVERY_KEY;
  if (expectedKey && recoveryKey !== expectedKey) {
    return res.status(403).json({ error: "Invalid recovery key" });
  }

  try {
    const db = await getDb();
    const password = typeof newPassword === "string" && newPassword.trim().length >= 8
      ? newPassword.trim()
      : getProtectedSuperAdminPassword();
    const adminUserId = await resetProtectedSuperAdminPassword(db, password);
    res.json({
      message: "Admin account restored",
      email: "admin@bestbet.gh",
      adminUserId,
      ...(process.env.NODE_ENV !== "production" ? { passwordHint: password } : {}),
    });
  } catch (err) {
    console.error("[auth/admin-recovery/reset]", err);
    res.status(500).json({
      error: process.env.NODE_ENV !== "production" && err instanceof Error ? err.message : "Admin recovery failed",
    });
  }
});

router.post("/admin-recovery/status", async (req, res) => {
  if (!isLocalOrRecoveryRequest(req)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const db = await getDb();
    const result = await db.query(`SELECT id, email, role_id, status FROM users WHERE LOWER(email) = ?`, [
      "admin@bestbet.gh",
    ]);
    const row = result.rows[0] as Record<string, unknown> | undefined;
    const admin = row
      ? {
          id: row.id,
          email: row.email,
          role_id: row.role_id,
          status: row.status,
        }
      : null;
    res.json({
      allowed: true,
      adminExists: result.rows.length > 0,
      admin,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Status check failed" });
  }
});

router.post("/logout", authenticate, async (req, res) => {
  await logAudit(req.user!.id, "logout", "User logged out");
  res.json({ message: "Logged out successfully" });
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const row = await getUserWithWallet(db, { id: req.user!.id });

    if (!row) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: row.id,
      email: row.email,
      name: row.name,
      roleId: row.role_id,
      phone: row.phone,
      phoneVerified: row.phone_verified === true || row.phone_verified === 1,
      referralCode: row.referral_code,
      status: row.status || "active",
      balance: row.balance,
      bonusBalance: row.bonus_balance,
      lockedBalance: row.locked_balance,
      permissions: req.user!.permissions,
    });
  } catch (err) {
    console.error("[auth/me]", err);
    res.status(500).json({ error: "Failed to load user profile" });
  }
});

router.post("/phone/send-otp", authenticate, async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone number required" });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const db = await getDb();
  await db.query(`UPDATE users SET phone = ? WHERE id = ?`, [phone, req.user!.id]);
  await db.query(
    `INSERT INTO otp_codes (id, user_id, phone, code, expires_at) VALUES (?, ?, ?, ?, ?)`,
    [uuidv4(), req.user!.id, phone, code, new Date(Date.now() + 600000).toISOString()]
  );
  await logAudit(req.user!.id, "send_otp", `OTP sent to ${phone}`);

  res.json({
    message: "Verification code sent",
    ...(process.env.NODE_ENV !== "production" ? { debugCode: code } : {}),
  });
});

router.post("/phone/verify", authenticate, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Verification code required" });

  const db = await getDb();
  const result = await db.query(
    `SELECT * FROM otp_codes WHERE user_id = ? AND code = ? AND used = 0 AND expires_at > ?`,
    [req.user!.id, code, new Date().toISOString()]
  );
  if (result.rows.length === 0) return res.status(400).json({ error: "Invalid or expired code" });

  await db.query(`UPDATE otp_codes SET used = 1 WHERE id = ?`, [result.rows[0].id]);
  await db.query(`UPDATE users SET phone_verified = 1 WHERE id = ?`, [req.user!.id]);
  await logAudit(req.user!.id, "phone_verified", "Phone number verified");

  res.json({ message: "Phone verified successfully" });
});

router.get("/sessions", authenticate, async (req, res) => {
  const db = await getDb();
  const result = await db.query(
    `SELECT id, device_id, device_name, ip_address, last_active, revoked, created_at FROM device_sessions WHERE user_id = ? ORDER BY last_active DESC`,
    [req.user!.id]
  );
  res.json(result.rows);
});

router.post("/sessions/:id/revoke", authenticate, async (req, res) => {
  const db = await getDb();
  await db.query(`UPDATE device_sessions SET revoked = 1 WHERE id = ? AND user_id = ?`, [req.params.id, req.user!.id]);
  res.json({ message: "Session revoked" });
});

router.get("/referrals", authenticate, async (req, res) => {
  const db = await getDb();
  const referred = await db.query(`SELECT id, name, email, created_at FROM users WHERE referred_by = ?`, [req.user!.id]);
  const rewards = await db.query(`SELECT * FROM referral_rewards WHERE referrer_id = ?`, [req.user!.id]);
  res.json({ referralCode: (await db.query(`SELECT referral_code FROM users WHERE id = ?`, [req.user!.id])).rows[0]?.referral_code, referred: referred.rows, rewards: rewards.rows });
});

router.post("/password-reset/request", authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const db = await getDb();
  const result = await db.query(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase()]);
  if (result.rows.length === 0) {
    return res.json({ message: "If the email exists, a reset link has been sent" });
  }

  const userId = result.rows[0].id as string;
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 3600000).toISOString();

  await db.query(
    `INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
    [uuidv4(), userId, token, expires]
  );

  res.json({ message: "If the email exists, a reset link has been sent", resetToken: token });
});

router.post("/password-reset/confirm", authLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Token and password are required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

  const db = await getDb();
  const result = await db.query(
    `SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > ?`,
    [token, new Date().toISOString()]
  );

  if (result.rows.length === 0) {
    return res.status(400).json({ error: "Invalid or expired reset token" });
  }

  const resetRow = result.rows[0];
  const hash = await bcrypt.hash(password, 10);
  await db.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, resetRow.user_id]);
  await db.query(`UPDATE password_reset_tokens SET used = 1 WHERE id = ?`, [resetRow.id]);
  await logAudit(resetRow.user_id as string, "password_reset", "Password reset completed");

  res.json({ message: "Password reset successful" });
});

router.put("/responsible-gaming", authenticate, async (req, res) => {
  const { depositLimit, lossLimit, sessionLimitMinutes, selfExcludedUntil } = req.body;
  const db = await getDb();
  const existing = await db.query(`SELECT user_id FROM responsible_gaming WHERE user_id = ?`, [req.user!.id]);

  if (existing.rows.length > 0) {
    await db.query(
      `UPDATE responsible_gaming SET deposit_limit = ?, loss_limit = ?, session_limit_minutes = ?, self_excluded_until = ?, updated_at = ? WHERE user_id = ?`,
      [depositLimit, lossLimit, sessionLimitMinutes, selfExcludedUntil, new Date().toISOString(), req.user!.id]
    );
  } else {
    await db.query(
      `INSERT INTO responsible_gaming (user_id, deposit_limit, loss_limit, session_limit_minutes, self_excluded_until) VALUES (?, ?, ?, ?, ?)`,
      [req.user!.id, depositLimit, lossLimit, sessionLimitMinutes, selfExcludedUntil]
    );
  }
  await logAudit(req.user!.id, "update_responsible_gaming", "Limits updated");
  res.json({ message: "Responsible gaming settings updated" });
});

router.get("/responsible-gaming", authenticate, async (req, res) => {
  const db = await getDb();
  const result = await db.query(`SELECT * FROM responsible_gaming WHERE user_id = ?`, [req.user!.id]);
  res.json(result.rows[0] || {});
});

export default router;
