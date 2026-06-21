import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb, getWalletBalance } from "../db";
import { authenticate, requirePermission, requireRole, logAudit } from "../middleware/auth";
import { createNotification } from "../services/notifications";
import adminMatchesRoutes from "./admin/matches";
import adminAdminsRoutes from "./admin/admins";

const router = Router();

router.use("/matches", adminMatchesRoutes);
router.use("/admins", adminAdminsRoutes);

router.get("/stats", authenticate, requireRole("super_admin", "sub_admin"), async (_req, res) => {
  const db = await getDb();
  const users = await db.query(`SELECT COUNT(*) as count FROM users`);
  const bets = await db.query(`SELECT COUNT(*) as count FROM bets`);
  const matches = await db.query(`SELECT COUNT(*) as count FROM matches`);
  const liveMatches = await db.query(
    `SELECT COUNT(*) as count FROM matches WHERE match_status = 'live' OR is_live = true OR is_live = 1`
  );
  const deposits = await db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE status = 'completed'`);
  const withdrawals = await db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE status = 'completed'`);
  const pendingDeposits = await db.query(`SELECT COUNT(*) as count FROM deposits WHERE status = 'pending'`);
  const pendingWithdrawals = await db.query(`SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'`);
  const activeUsers = await db.query(`SELECT COUNT(*) as count FROM users WHERE status = 'active' OR status IS NULL`);

  const totalDeposits = Number(deposits.rows[0].total);
  const totalWithdrawals = Number(withdrawals.rows[0].total);

  res.json({
    totalUsers: Number(users.rows[0].count),
    activeUsers: Number(activeUsers.rows[0]?.count ?? users.rows[0].count),
    totalBets: Number(bets.rows[0].count),
    totalMatches: Number(matches.rows[0]?.count ?? 0),
    liveMatches: Number(liveMatches.rows[0]?.count ?? 0),
    totalDeposits,
    totalWithdrawals,
    revenue: totalDeposits - totalWithdrawals,
    pendingDeposits: Number(pendingDeposits.rows[0]?.count ?? 0),
    pendingWithdrawals: Number(pendingWithdrawals.rows[0]?.count ?? 0),
  });
});

router.get("/users", authenticate, requirePermission("manage_users"), async (_req, res) => {
  const db = await getDb();
  const result = await db.query(
    `SELECT u.id, u.email, u.name, u.phone, u.phone_verified, u.status, u.role_id, u.referral_code, u.created_at, w.balance, w.bonus_balance, w.locked_balance
     FROM users u LEFT JOIN wallets w ON w.user_id = u.id ORDER BY u.created_at DESC`
  );
  res.json(result.rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    phoneVerified: u.phone_verified,
    status: u.status || "active",
    roleId: u.role_id,
    referralCode: u.referral_code,
    balance: Number(u.balance ?? 0),
    bonusBalance: Number(u.bonus_balance ?? 0),
    lockedBalance: Number(u.locked_balance ?? 0),
    createdAt: u.created_at,
  })));
});

router.patch("/users/:id/status", authenticate, requirePermission("manage_users"), async (req, res) => {
  const { status } = req.body;
  if (!["active", "suspended", "banned"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const db = await getDb();
  await db.query(`UPDATE users SET status = ? WHERE id = ?`, [status, req.params.id]);
  await logAudit(req.user!.id, "update_user_status", `User ${req.params.id} set to ${status}`);
  await createNotification(req.params.id, "Account Update", `Your account status has been changed to ${status}`, status === "active" ? "success" : "warning");
  res.json({ message: "User status updated" });
});

router.patch("/users/:id/balance", authenticate, requireRole("super_admin"), async (req, res) => {
  const { amount, type, reason } = req.body;
  if (typeof amount !== "number" || !type) {
    return res.status(400).json({ error: "Amount and type (add/deduct) required" });
  }

  const db = await getDb();
  const wallet = await db.query(`SELECT balance FROM wallets WHERE user_id = ?`, [req.params.id]);
  if (wallet.rows.length === 0) return res.status(404).json({ error: "Wallet not found" });

  const delta = type === "add" ? amount : -amount;
  await db.query(`UPDATE wallets SET balance = balance + ? WHERE user_id = ?`, [delta, req.params.id]);
  await logAudit(req.user!.id, "adjust_balance", `${type} ${amount} for user ${req.params.id}: ${reason || ""}`);

  const newBalance = await getWalletBalance(req.params.id);
  await createNotification(req.params.id, "Balance Updated", `Your balance has been ${type === "add" ? "credited" : "debited"} by GHS ${amount}`, "info");
  res.json({ balance: newBalance });
});

router.get("/deposits", authenticate, requirePermission("manage_deposits"), async (_req, res) => {
  const db = await getDb();
  const result = await db.query(
    `SELECT d.*, u.email, u.name FROM deposits d
     LEFT JOIN users u ON u.id = d.user_id ORDER BY d.created_at DESC`
  );
  res.json(result.rows);
});

router.get("/withdrawals", authenticate, requirePermission("manage_withdrawals"), async (_req, res) => {
  const db = await getDb();
  const result = await db.query(
    `SELECT w.*, u.email, u.name FROM withdrawals w
     LEFT JOIN users u ON u.id = w.user_id ORDER BY w.created_at DESC`
  );
  res.json(result.rows);
});

router.get("/bets", authenticate, requireRole("super_admin", "sub_admin"), async (_req, res) => {
  const db = await getDb();
  const bets = await db.query(
    `SELECT b.*, u.email, u.name FROM bets b
     LEFT JOIN users u ON u.id = b.user_id ORDER BY b.created_at DESC LIMIT 200`
  );
  res.json(bets.rows);
});

router.get("/bookings", authenticate, requireRole("super_admin", "sub_admin"), async (_req, res) => {
  const db = await getDb();
  const codes = await db.query(
    `SELECT bc.*, u.email FROM booking_codes bc
     LEFT JOIN users u ON u.id = bc.user_id ORDER BY bc.created_at DESC`
  );
  const logs = await db.query(`SELECT * FROM booking_logs ORDER BY created_at DESC LIMIT 100`);
  res.json({ codes: codes.rows, logs: logs.rows });
});

router.post("/agents", authenticate, requireRole("super_admin"), async (req, res) => {
  const { userId, commissionRate } = req.body;
  if (!userId) return res.status(400).json({ error: "User ID required" });

  const db = await getDb();
  const id = uuidv4();
  await db.query(
    `INSERT INTO agents (id, user_id, commission_rate) VALUES (?, ?, ?)`,
    [id, userId, commissionRate || 5]
  );
  await logAudit(req.user!.id, "create_agent", `Agent created for user ${userId}`);
  res.status(201).json({ id });
});

router.get("/agents", authenticate, requireRole("super_admin"), async (_req, res) => {
  const db = await getDb();
  const result = await db.query(
    `SELECT a.*, u.email, u.name FROM agents a
     LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC`
  );
  res.json(result.rows);
});

router.get("/audit-logs", authenticate, requirePermission("view_audit_logs"), async (_req, res) => {
  const db = await getDb();
  const result = await db.query(
    `SELECT a.*, u.email as user_email FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 200`
  );
  res.json(result.rows);
});

router.get("/login-logs", authenticate, requirePermission("view_audit_logs"), async (_req, res) => {
  const db = await getDb();
  const result = await db.query(`SELECT * FROM login_logs ORDER BY created_at DESC LIMIT 200`);
  res.json(result.rows);
});

router.get("/permissions", authenticate, requireRole("super_admin"), async (_req, res) => {
  const db = await getDb();
  const roles = await db.query(`SELECT * FROM roles`);
  const permissions = await db.query(`SELECT * FROM permissions`);
  const rolePerms = await db.query(`SELECT * FROM role_permissions`);
  res.json({ roles: roles.rows, permissions: permissions.rows, rolePermissions: rolePerms.rows });
});

router.post("/notifications/broadcast", authenticate, requireRole("super_admin"), async (req, res) => {
  const { title, message, type } = req.body;
  if (!title || !message) return res.status(400).json({ error: "Title and message required" });

  const db = await getDb();
  const users = await db.query(`SELECT id FROM users WHERE role_id = 'user'`);
  for (const user of users.rows) {
    await createNotification(user.id as string, title, message, type || "promo");
  }
  await logAudit(req.user!.id, "broadcast_notification", title);
  res.json({ message: "Notification broadcast", count: users.rows.length });
});

export default router;
