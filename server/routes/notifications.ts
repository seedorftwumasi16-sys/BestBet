import { Router } from "express";
import { getDb } from "../db";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  const db = await getDb();
  const result = await db.query(
    `SELECT id, title, message, type, read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [req.user!.id]
  );
  res.json(result.rows.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    read: n.read === 1 || n.read === true,
    date: n.created_at,
  })));
});

router.patch("/:id/read", authenticate, async (req, res) => {
  const db = await getDb();
  await db.query(`UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?`, [req.params.id, req.user!.id]);
  res.json({ message: "Marked as read" });
});

export default router;
