import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { getDb, getWalletBalance } from "../db";
import { authenticate, requirePermission, logAudit } from "../middleware/auth";
import { depositLimiter } from "../middleware/security";
import { createNotification, notifyAdmins } from "../services/notifications";
import { getMomoFromEnv, getMomoInfo } from "../lib/momo";

const router = Router();

export const MOMO_NUMBER = getMomoFromEnv().number;

const uploadDir = process.env.UPLOAD_DIR || "./uploads/deposits";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|jpg|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

router.get("/balance", authenticate, async (req, res) => {
  const db = await getDb();
  const result = await db.query(`SELECT balance, bonus_balance, locked_balance FROM wallets WHERE user_id = ?`, [req.user!.id]);
  const row = result.rows[0] || {};
  res.json({
    balance: Number(row.balance ?? 0),
    bonusBalance: Number(row.bonus_balance ?? 0),
    lockedBalance: Number(row.locked_balance ?? 0),
    available: Number(row.balance ?? 0) - Number(row.locked_balance ?? 0),
  });
});

router.get("/momo-info", async (_req, res) => {
  res.json(await getMomoInfo());
});

router.post("/deposit", authenticate, depositLimiter, upload.single("screenshot"), async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const amountSent = Number(req.body.amountSent || amount);
    const paymentReference = req.body.paymentReference?.trim();

    if (!amount || amount <= 0) return res.status(400).json({ error: "Valid amount is required" });
    if (!paymentReference) return res.status(400).json({ error: "Payment reference number is required" });
    if (!req.file) return res.status(400).json({ error: "Payment screenshot is required" });

    const db = await getDb();
    const id = uuidv4();
    const screenshotUrl = `/uploads/deposits/${req.file.filename}`;

    await db.query(
      `INSERT INTO deposits (id, user_id, amount, amount_sent, status, method, payment_reference, screenshot_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user!.id, amount, amountSent, "pending", "mobile_money", paymentReference, screenshotUrl]
    );
    await logAudit(req.user!.id, "deposit_request", `MoMo deposit GHS ${amount}, ref: ${paymentReference}`);
    await notifyAdmins("New Deposit Request", `User ${req.user!.email} submitted GHS ${amount} deposit`, "warning");
    await createNotification(req.user!.id, "Deposit Submitted", "Your deposit is pending admin approval", "info");

    res.status(201).json({ id, amount, amountSent, status: "pending", paymentReference, screenshotUrl });
  } catch (err) {
    console.error("[wallets/deposit]", err);
    res.status(500).json({ error: "Failed to submit deposit" });
  }
});

router.post("/withdraw", authenticate, async (req, res) => {
  const { amount, method, accountDetails } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: "Valid amount is required" });
  if (!method) return res.status(400).json({ error: "Withdrawal method is required" });
  if (!accountDetails) return res.status(400).json({ error: "Account details required" });

  const db = await getDb();
  const balance = await getWalletBalance(req.user!.id);
  const wallet = await db.query(`SELECT locked_balance FROM wallets WHERE user_id = ?`, [req.user!.id]);
  const locked = Number(wallet.rows[0]?.locked_balance ?? 0);
  const available = balance - locked;

  if (available < amount) return res.status(400).json({ error: "Insufficient available balance" });

  const id = uuidv4();
  await db.query(
    `INSERT INTO withdrawals (id, user_id, amount, status, method, account_details) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, req.user!.id, amount, "pending", method, accountDetails]
  );
  await db.query(`UPDATE wallets SET locked_balance = locked_balance + ? WHERE user_id = ?`, [amount, req.user!.id]);
  await logAudit(req.user!.id, "withdrawal_request", `Withdrawal request: GHS ${amount}`);
  await notifyAdmins("New Withdrawal Request", `User ${req.user!.email} requested GHS ${amount} withdrawal`, "warning");

  res.status(201).json({ id, amount, status: "pending", method });
});

router.get("/transactions", authenticate, async (req, res) => {
  const db = await getDb();
  const deposits = await db.query(
    `SELECT id, amount, amount_sent, status, method, payment_reference, screenshot_url, admin_note, created_at as date, 'deposit' as type FROM deposits WHERE user_id = ?`,
    [req.user!.id]
  );
  const withdrawals = await db.query(
    `SELECT id, amount, status, method, account_details, admin_note, created_at as date, 'withdrawal' as type FROM withdrawals WHERE user_id = ?`,
    [req.user!.id]
  );
  const all = [...deposits.rows, ...withdrawals.rows].sort(
    (a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime()
  );
  res.json(all);
});

router.post("/deposit/:id/approve", authenticate, requirePermission("manage_deposits"), async (req, res) => {
  const db = await getDb();
  const dep = await db.query(`SELECT * FROM deposits WHERE id = ?`, [req.params.id]);
  if (dep.rows.length === 0) return res.status(404).json({ error: "Deposit not found" });

  const row = dep.rows[0];
  if (row.status === "completed") return res.status(400).json({ error: "Already approved" });
  if (row.status === "rejected") return res.status(400).json({ error: "Deposit was rejected" });

  const creditAmount = Number(row.amount_sent || row.amount);
  await db.query(`UPDATE deposits SET status = 'completed', reviewed_by = ? WHERE id = ?`, [req.user!.id, req.params.id]);
  await db.query(`UPDATE wallets SET balance = balance + ? WHERE user_id = ?`, [creditAmount, row.user_id]);
  await logAudit(req.user!.id, "approve_deposit", `Approved deposit ${req.params.id} for GHS ${creditAmount}`);
  await createNotification(row.user_id as string, "Deposit Approved", `GHS ${creditAmount} has been credited to your wallet`, "success");

  res.json({ message: "Deposit approved", amount: creditAmount });
});

router.post("/deposit/:id/reject", authenticate, requirePermission("manage_deposits"), async (req, res) => {
  const { adminNote } = req.body;
  const db = await getDb();
  const dep = await db.query(`SELECT * FROM deposits WHERE id = ?`, [req.params.id]);
  if (dep.rows.length === 0) return res.status(404).json({ error: "Deposit not found" });

  const row = dep.rows[0];
  await db.query(`UPDATE deposits SET status = 'rejected', admin_note = ?, reviewed_by = ? WHERE id = ?`, [adminNote || "Rejected by admin", req.user!.id, req.params.id]);
  await logAudit(req.user!.id, "reject_deposit", `Rejected deposit ${req.params.id}`);
  await createNotification(row.user_id as string, "Deposit Rejected", adminNote || "Your deposit was rejected. Contact support.", "warning");

  res.json({ message: "Deposit rejected" });
});

router.post("/deposit/:id/request-info", authenticate, requirePermission("manage_deposits"), async (req, res) => {
  const { adminNote } = req.body;
  const db = await getDb();
  const dep = await db.query(`SELECT * FROM deposits WHERE id = ?`, [req.params.id]);
  if (dep.rows.length === 0) return res.status(404).json({ error: "Deposit not found" });

  const row = dep.rows[0];
  await db.query(`UPDATE deposits SET status = 'info_requested', admin_note = ?, reviewed_by = ? WHERE id = ?`, [adminNote, req.user!.id, req.params.id]);
  await createNotification(row.user_id as string, "More Info Needed", adminNote || "Please provide additional deposit information", "warning");
  res.json({ message: "Information requested" });
});

router.post("/withdraw/:id/approve", authenticate, requirePermission("manage_withdrawals"), async (req, res) => {
  const db = await getDb();
  const wd = await db.query(`SELECT * FROM withdrawals WHERE id = ?`, [req.params.id]);
  if (wd.rows.length === 0) return res.status(404).json({ error: "Withdrawal not found" });

  const row = wd.rows[0];
  if (row.status === "completed") return res.status(400).json({ error: "Already approved" });

  await db.query(`UPDATE withdrawals SET status = 'completed', reviewed_by = ? WHERE id = ?`, [req.user!.id, req.params.id]);
  await db.query(`UPDATE wallets SET balance = balance - ?, locked_balance = locked_balance - ? WHERE user_id = ?`, [row.amount, row.amount, row.user_id]);
  await logAudit(req.user!.id, "approve_withdrawal", `Approved withdrawal ${req.params.id} for GHS ${row.amount}`);
  await createNotification(row.user_id as string, "Withdrawal Approved", `GHS ${row.amount} withdrawal has been processed`, "success");

  res.json({ message: "Withdrawal approved", amount: Number(row.amount) });
});

router.post("/withdraw/:id/reject", authenticate, requirePermission("manage_withdrawals"), async (req, res) => {
  const { adminNote } = req.body;
  const db = await getDb();
  const wd = await db.query(`SELECT * FROM withdrawals WHERE id = ?`, [req.params.id]);
  if (wd.rows.length === 0) return res.status(404).json({ error: "Withdrawal not found" });

  const row = wd.rows[0];
  await db.query(`UPDATE withdrawals SET status = 'rejected', admin_note = ?, reviewed_by = ? WHERE id = ?`, [adminNote || "Rejected", req.user!.id, req.params.id]);
  await db.query(`UPDATE wallets SET locked_balance = locked_balance - ? WHERE user_id = ?`, [row.amount, row.user_id]);
  await logAudit(req.user!.id, "reject_withdrawal", `Rejected withdrawal ${req.params.id}`);
  await createNotification(row.user_id as string, "Withdrawal Rejected", adminNote || "Your withdrawal was rejected", "warning");

  res.json({ message: "Withdrawal rejected" });
});

export default router;
