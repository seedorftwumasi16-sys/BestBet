import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { authenticate, logAudit } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  const db = await getDb();
  const result = await db.query(`SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC`, [req.user!.id]);
  res.json(result.rows);
});

router.post("/", authenticate, async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) return res.status(400).json({ error: "Subject and message required" });

  const db = await getDb();
  const id = uuidv4();
  await db.query(
    `INSERT INTO support_tickets (id, user_id, subject, message) VALUES (?, ?, ?, ?)`,
    [id, req.user!.id, subject, message]
  );
  await logAudit(req.user!.id, "create_ticket", subject);
  res.status(201).json({ id });
});

router.get("/admin/all", authenticate, async (req, res) => {
  if (!["super_admin", "sub_admin"].includes(req.user!.roleId)) {
    return res.status(403).json({ error: "Admin access required" });
  }
  const db = await getDb();
  const result = await db.query(
    `SELECT t.*, u.email, u.name FROM support_tickets t
     LEFT JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC`
  );
  res.json(result.rows);
});

router.patch("/:id", authenticate, async (req, res) => {
  const { status, adminReply } = req.body;
  const db = await getDb();
  const ticket = await db.query(`SELECT * FROM support_tickets WHERE id = ?`, [req.params.id]);
  if (ticket.rows.length === 0) return res.status(404).json({ error: "Ticket not found" });

  const row = ticket.rows[0];
  const isAdmin = ["super_admin", "sub_admin"].includes(req.user!.roleId);
  if (row.user_id !== req.user!.id && !isAdmin) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (status) await db.query(`UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?`, [status, new Date().toISOString(), req.params.id]);
  if (adminReply && isAdmin) {
    await db.query(`UPDATE support_tickets SET admin_reply = ?, status = 'resolved', updated_at = ? WHERE id = ?`, [adminReply, new Date().toISOString(), req.params.id]);
  }
  await logAudit(req.user!.id, "update_ticket", req.params.id);
  res.json({ message: "Ticket updated" });
});

export default router;
