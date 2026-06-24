import { Router } from "express";
import { getDb } from "../../db";
import { authenticate, requireRole, logAudit } from "../../middleware/auth";

const router = Router();

router.use(authenticate, requireRole("super_admin", "sub_admin"));

router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    const db = await getDb();
    let sql = `
      SELECT bc.*, u.email as creator_email, u.name as creator_name,
             u2.email as used_by_email, u2.name as used_by_name
      FROM booking_codes bc
      LEFT JOIN users u ON u.id = bc.user_id
      LEFT JOIN users u2 ON u2.id = bc.used_by
    `;
    const params: unknown[] = [];

    if (q) {
      sql += ` WHERE UPPER(bc.code) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.name) LIKE ?`;
      const term = `%${String(q).toLowerCase()}%`;
      params.push(`%${String(q).toUpperCase()}%`, term, term);
    }

    sql += ` ORDER BY bc.created_at DESC LIMIT 200`;
    const result = await db.query(sql, params);

    let logs = { rows: [] as Record<string, unknown>[] };
    try {
      logs = await db.query(`SELECT * FROM booking_logs ORDER BY created_at DESC LIMIT 100`);
    } catch (err) {
      console.warn("[admin/booking-codes] booking_logs unavailable:", err instanceof Error ? err.message : err);
    }

    res.json({
      codes: result.rows.map((row) => {
        let selectionCount = 0;
        try {
          selectionCount = row.selections ? JSON.parse(String(row.selections)).length : 0;
        } catch {
          selectionCount = 0;
        }
        return {
          id: row.id,
          code: row.code,
          userId: row.user_id,
          creatorEmail: row.creator_email,
          creatorName: row.creator_name,
          stake: Number(row.stake ?? 0),
          totalOdds: Number(row.total_odds ?? 0),
          potentialWin: Number(row.potential_win ?? 0),
          betType: row.bet_type || "single",
          status: row.status || "active",
          createdAt: row.created_at,
          expiresAt: row.expires_at,
          usedBy: row.used_by,
          usedByEmail: row.used_by_email,
          usedByName: row.used_by_name,
          usedAt: row.used_at,
          selectionCount,
        };
      }),
      logs: logs.rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load booking codes";
    if (message.toLowerCase().includes("does not exist") || message.toLowerCase().includes("no such table")) {
      console.warn("[admin/booking-codes] table missing — returning empty list");
      return res.json({ codes: [], logs: [] });
    }
    console.error("[admin/booking-codes]", err);
    res.status(500).json({ error: message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const db = await getDb();
    const existing = await db.query(`SELECT code FROM booking_codes WHERE id = ?`, [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: "Booking code not found" });

    await db.query(`UPDATE booking_codes SET status = 'deleted' WHERE id = ?`, [req.params.id]);
    await logAudit(req.user!.id, "delete_booking_code", `Deleted booking code ${existing.rows[0].code}`);
    res.json({ message: "Booking code deleted" });
  } catch (err) {
    console.error("[admin/booking-codes/delete]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to delete booking code" });
  }
});

export default router;
