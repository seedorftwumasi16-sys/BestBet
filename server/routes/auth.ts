import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getDb, getWalletBalance } from "../db";
import { getUserWithWallet } from "../db/helpers";
import { signToken, authenticate, loadUserPermissions, logAudit } from "../middleware/auth";
import { authLimiter } from "../middleware/security";
import { createNotification } from "../services/notifications";

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

async function logLogin(userId: string | null, email: string, success: boolean, req: Parameters<typeof getClientInfo>[0]) {
  const db = await getDb();
  const info = getClientInfo(req);
  await db.query(
    `INSERT INTO login_logs (id, user_id, email, ip_address, user_agent, device_id, success) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), userId, email, info.ip, info.userAgent, info.deviceId, success ? 1 : 0]
  );
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
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const db = await getDb();
    const row = await getUserWithWallet(db, { email });

    if (!row) {
      await logLogin(null, email.toLowerCase(), false, req);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (row.status === "banned" || row.status === "suspended") {
      return res.status(403).json({ error: `Account is ${row.status}` });
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      await logLogin(row.id, email.toLowerCase(), false, req);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const permissions = await loadUserPermissions(row.id);
    const user = {
      id: row.id,
      email: row.email,
      name: row.name,
      roleId: row.role_id,
      permissions,
    };
    const token = signToken(user);
    await logAudit(user.id, "login", `User logged in: ${email}`);
    await logLogin(user.id, email.toLowerCase(), true, req);

    const info = getClientInfo(req);
    await db.query(
      `INSERT INTO device_sessions (id, user_id, device_id, device_name, ip_address) VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), user.id, info.deviceId, info.userAgent.slice(0, 100), info.ip]
    );

    res.json({
      token,
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
    res.status(500).json({ error: "Login failed" });
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
