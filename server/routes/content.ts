import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { authenticate, requireRole, logAudit } from "../middleware/auth";
import { boolFrom } from "../db/helpers";

const router = Router();

router.get("/promotions", async (_req, res) => {
  const db = await getDb();
  const result = await db.query(`SELECT * FROM promotions WHERE active = 1 OR active = true`);
  res.json(result.rows.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    image: p.image_url || "/banners/promo-default.jpg",
    cta: p.cta || "Claim Now",
    badge: p.badge,
  })));
});

router.post("/promotions", authenticate, requireRole("super_admin", "sub_admin"), async (req, res) => {
  const { title, description, imageUrl, cta, badge } = req.body;
  if (!title || !description) return res.status(400).json({ error: "Title and description required" });

  const db = await getDb();
  const id = uuidv4();
  await db.query(
    `INSERT INTO promotions (id, title, description, image_url, cta, badge) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, title, description, imageUrl || null, cta || "Claim Now", badge || null]
  );
  await logAudit(req.user!.id, "create_promotion", title);
  res.status(201).json({ id });
});

router.get("/banners", async (_req, res) => {
  const db = await getDb();
  const result = await db.query(`SELECT * FROM banners WHERE active = 1 OR active = true`);
  const sorted = result.rows.sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
  res.json(sorted);
});

router.post("/banners", authenticate, requireRole("super_admin"), async (req, res) => {
  const { title, subtitle, imageUrl, linkUrl, sortOrder } = req.body;
  if (!title) return res.status(400).json({ error: "Title required" });

  const db = await getDb();
  const id = uuidv4();
  await db.query(
    `INSERT INTO banners (id, title, subtitle, image_url, link_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, title, subtitle || null, imageUrl || null, linkUrl || null, sortOrder || 0]
  );
  await logAudit(req.user!.id, "create_banner", title);
  res.status(201).json({ id });
});

router.get("/settings", async (_req, res) => {
  const db = await getDb();
  const result = await db.query(`SELECT * FROM site_settings`);
  const settings: Record<string, string> = {};
  for (const row of result.rows) settings[row.key as string] = row.value as string;
  res.json(settings);
});

router.put("/settings", authenticate, requireRole("super_admin"), async (req, res) => {
  const db = await getDb();
  for (const [key, value] of Object.entries(req.body)) {
    const existing = await db.query(`SELECT key FROM site_settings WHERE key = ?`, [key]);
    if (existing.rows.length > 0) {
      await db.query(`UPDATE site_settings SET value = ?, updated_at = ? WHERE key = ?`, [String(value), new Date().toISOString(), key]);
    } else {
      await db.query(`INSERT INTO site_settings (key, value) VALUES (?, ?)`, [key, String(value)]);
    }
  }
  await logAudit(req.user!.id, "update_settings", JSON.stringify(Object.keys(req.body)));
  res.json({ message: "Settings updated" });
});

router.get("/virtual-games", async (_req, res) => {
  const db = await getDb();
  const result = await db.query(`SELECT * FROM virtual_games WHERE active = 1 OR active = true`);
  res.json(result.rows.map((g) => ({
    id: g.id,
    name: g.name,
    type: g.type,
    config: typeof g.config === "string" ? JSON.parse(g.config as string) : g.config,
    active: boolFrom(g, "active"),
  })));
});

router.post("/virtual-games", authenticate, requireRole("super_admin"), async (req, res) => {
  const { name, type, config } = req.body;
  if (!name || !type) return res.status(400).json({ error: "Name and type required" });

  const db = await getDb();
  const id = uuidv4();
  await db.query(
    `INSERT INTO virtual_games (id, name, type, config) VALUES (?, ?, ?, ?)`,
    [id, name, type, JSON.stringify(config || {})]
  );
  await logAudit(req.user!.id, "create_virtual_game", name);
  res.status(201).json({ id });
});

router.patch("/virtual-games/:id", authenticate, requireRole("super_admin"), async (req, res) => {
  const { name, config, active } = req.body;
  const db = await getDb();
  const game = await db.query(`SELECT id FROM virtual_games WHERE id = ?`, [req.params.id]);
  if (game.rows.length === 0) return res.status(404).json({ error: "Game not found" });

  if (name) await db.query(`UPDATE virtual_games SET name = ? WHERE id = ?`, [name, req.params.id]);
  if (config) await db.query(`UPDATE virtual_games SET config = ? WHERE id = ?`, [JSON.stringify(config), req.params.id]);
  if (active !== undefined) await db.query(`UPDATE virtual_games SET active = ? WHERE id = ?`, [active ? 1 : 0, req.params.id]);

  await logAudit(req.user!.id, "update_virtual_game", req.params.id);
  res.json({ message: "Virtual game updated" });
});

export default router;
