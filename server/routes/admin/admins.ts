import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../../db";
import { authenticate, requirePermission, logAudit } from "../../middleware/auth";
import { isProtectedSuperAdmin, canChangeUserStatus } from "../../lib/super-admin";

const router = Router();

function mapAdminRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    email: String(row.email),
    role: String(row.role),
    status: String(row.status || "active"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

router.use(authenticate, requirePermission("manage_admins"));

router.get("/", async (_req, res) => {
  const db = await getDb();
  const result = await db.query(
    `SELECT a.id, a.user_id, a.role, a.status, a.created_at, a.updated_at, u.email, u.name
     FROM admins a
     INNER JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC`
  );
  res.json(result.rows.map(mapAdminRow));
});

router.post("/", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const adminRole = role === "super_admin" ? "super_admin" : "sub_admin";
    const db = await getDb();
    const existing = await db.query(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase()]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "Email already exists" });

    const userId = uuidv4();
    const adminId = uuidv4();
    const hash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (id, email, password_hash, name, role_id, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, email.toLowerCase(), hash, name, adminRole, "active"]
    );
    await db.query(`INSERT INTO wallets (id, user_id, balance) VALUES (?, ?, ?)`, [uuidv4(), userId, 0]);
    await db.query(
      `INSERT INTO admins (id, user_id, role, status) VALUES (?, ?, ?, ?)`,
      [adminId, userId, adminRole, "active"]
    );

    await logAudit(req.user!.id, "create_admin", `Created admin: ${email}`);
    res.status(201).json(mapAdminRow({
      id: adminId,
      user_id: userId,
      role: adminRole,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email: email.toLowerCase(),
      name,
    }));
  } catch (err) {
    console.error("[admin/admins POST]", err);
    res.status(500).json({ error: "Failed to create admin" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, email, password, role, status } = req.body;
    const db = await getDb();
    const existing = await db.query(
      `SELECT a.*, u.email, u.name FROM admins a
       INNER JOIN users u ON u.id = a.user_id WHERE a.id = ?`,
      [req.params.id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: "Admin not found" });

    const row = existing.rows[0];
    const userId = String(row.user_id);

    if (email) {
      const dup = await db.query(`SELECT id FROM users WHERE email = ? AND id != ?`, [
        String(email).toLowerCase(),
        userId,
      ]);
      if (dup.rows.length > 0) return res.status(409).json({ error: "Email already in use" });
    }

    const nextRole = role === "super_admin" ? "super_admin" : role === "sub_admin" ? "sub_admin" : String(row.role);
    const nextStatus = status && ["active", "suspended"].includes(status) ? status : String(row.status || "active");

    if (isProtectedSuperAdmin(userId, String(row.email)) && nextStatus !== "active") {
      return res.status(403).json({ error: "The primary super admin account cannot be suspended" });
    }

    if (name || email || password || role) {
      const updates: string[] = [];
      const params: unknown[] = [];
      if (name) {
        updates.push("name = ?");
        params.push(name);
      }
      if (email) {
        updates.push("email = ?");
        params.push(String(email).toLowerCase());
      }
      if (password) {
        if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
        updates.push("password_hash = ?");
        params.push(await bcrypt.hash(password, 10));
      }
      if (role) {
        updates.push("role_id = ?");
        params.push(nextRole);
      }
      if (updates.length > 0) {
        params.push(userId);
        await db.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
      }
    }

    await db.query(`UPDATE admins SET role = ?, status = ?, updated_at = ? WHERE id = ?`, [
      nextRole,
      nextStatus,
      new Date().toISOString(),
      req.params.id,
    ]);

    if (status) {
      const guard = canChangeUserStatus(userId, String(row.email), nextStatus === "suspended" ? "suspended" : "active");
      if (!guard.allowed) {
        return res.status(403).json({ error: guard.reason });
      }
      await db.query(`UPDATE users SET status = ? WHERE id = ?`, [
        nextStatus === "suspended" ? "suspended" : "active",
        userId,
      ]);
    }

    await logAudit(req.user!.id, "update_admin", `Updated admin ${req.params.id}`);

    const updated = await db.query(
      `SELECT a.id, a.user_id, a.role, a.status, a.created_at, a.updated_at, u.email, u.name
       FROM admins a INNER JOIN users u ON u.id = a.user_id WHERE a.id = ?`,
      [req.params.id]
    );
    res.json(mapAdminRow(updated.rows[0]));
  } catch (err) {
    console.error("[admin/admins PUT]", err);
    res.status(500).json({ error: "Failed to update admin" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const db = await getDb();
    const existing = await db.query(`SELECT * FROM admins WHERE id = ?`, [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: "Admin not found" });

    const admin = existing.rows[0];
    if (String(admin.user_id) === req.user!.id) {
      return res.status(400).json({ error: "You cannot delete your own admin account" });
    }

    const owner = await db.query(`SELECT email FROM users WHERE id = ?`, [admin.user_id]);
    const ownerEmail = owner.rows[0]?.email ? String(owner.rows[0].email) : "";
    if (isProtectedSuperAdmin(String(admin.user_id), ownerEmail)) {
      return res.status(403).json({ error: "The primary super admin account cannot be removed" });
    }

    if (String(admin.role) === "super_admin") {
      const supers = await db.query(`SELECT COUNT(*) as count FROM admins WHERE role = 'super_admin' AND status = 'active'`);
      if (Number(supers.rows[0]?.count ?? 0) <= 1) {
        return res.status(400).json({ error: "Cannot delete the last super admin" });
      }
    }

    await db.query(`DELETE FROM admins WHERE id = ?`, [req.params.id]);
    await db.query(`UPDATE users SET role_id = 'user', status = 'active' WHERE id = ?`, [admin.user_id]);
    await logAudit(req.user!.id, "delete_admin", `Removed admin ${admin.user_id}`);
    res.json({ message: "Admin removed" });
  } catch (err) {
    console.error("[admin/admins DELETE]", err);
    res.status(500).json({ error: "Failed to delete admin" });
  }
});

export default router;
