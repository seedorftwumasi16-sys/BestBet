import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { getDb } from "./index";
import { migrate } from "./migrate";
import { upsert, boolVal } from "./helpers";
import { syncOddsForMatch } from "../lib/odds";

dotenv.config();

const ROLES = [
  { id: "super_admin", name: "Super Admin", description: "Full system access" },
  { id: "sub_admin", name: "Sub Admin", description: "Limited admin access" },
  { id: "user", name: "User", description: "Standard bettor" },
];

const PERMISSIONS = [
  { id: "manage_users", name: "manage_users", description: "Manage users" },
  { id: "manage_admins", name: "manage_admins", description: "Manage admins" },
  { id: "manage_matches", name: "manage_matches", description: "Manage matches" },
  { id: "manage_odds", name: "manage_odds", description: "Manage odds" },
  { id: "manage_deposits", name: "manage_deposits", description: "Approve deposits" },
  { id: "manage_withdrawals", name: "manage_withdrawals", description: "Approve withdrawals" },
  { id: "view_reports", name: "view_reports", description: "View reports" },
  { id: "view_audit_logs", name: "view_audit_logs", description: "View audit logs" },
  { id: "place_bets", name: "place_bets", description: "Place bets" },
];

const ROLE_PERMS: Record<string, string[]> = {
  super_admin: PERMISSIONS.map((p) => p.id),
  sub_admin: ["manage_matches", "manage_odds", "manage_deposits", "manage_withdrawals", "manage_users", "view_reports", "view_audit_logs"],
  user: ["place_bets"],
};

const LEAGUES = [
  { id: "epl", name: "Premier League", country: "England", sport: "football" },
  { id: "laliga", name: "La Liga", country: "Spain", sport: "football" },
  { id: "nba", name: "NBA", country: "USA", sport: "basketball" },
  { id: "ucl", name: "Champions League", country: "Europe", sport: "football" },
  { id: "atp", name: "ATP Tour", country: "International", sport: "tennis" },
  { id: "ipl", name: "IPL", country: "India", sport: "cricket" },
  { id: "mlb", name: "MLB", country: "USA", sport: "baseball" },
  { id: "ufc", name: "UFC", country: "International", sport: "mma" },
];

const MATCHES = [
  { id: "m1", home: "Manchester City", away: "Liverpool", league: "Premier League", sport: "football", live: true, oh: 1.85, od: 3.4, oa: 4.2, hs: 2, as: 1, lm: 67 },
  { id: "m2", home: "Real Madrid", away: "Barcelona", league: "La Liga", sport: "football", live: false, oh: 2.1, od: 3.25, oa: 3.5 },
  { id: "m3", home: "LA Lakers", away: "Boston Celtics", league: "NBA", sport: "basketball", live: true, oh: 1.95, oa: 1.9, hs: 78, as: 82, lm: 32 },
  { id: "m4", home: "Novak Djokovic", away: "Carlos Alcaraz", league: "ATP Tour", sport: "tennis", live: true, oh: 1.72, oa: 2.15, hs: 1, as: 0 },
  { id: "m5", home: "Poland", away: "Brazil", league: "Volleyball Nations", sport: "volleyball", live: false, oh: 2.4, oa: 1.55 },
  { id: "m6", home: "NY Yankees", away: "LA Dodgers", league: "MLB", sport: "baseball", live: false, oh: 1.88, oa: 1.95 },
  { id: "m7", home: "Mumbai Indians", away: "Chennai Super Kings", league: "IPL", sport: "cricket", live: true, oh: 1.65, oa: 2.25, hs: 142, as: 138 },
  { id: "m8", home: "Team Liquid", away: "FaZe Clan", league: "CS2 Major", sport: "esports", live: true, oh: 1.8, oa: 2.0 },
  { id: "m9", home: "Israel Adesanya", away: "Sean Strickland", league: "UFC", sport: "mma", live: false, oh: 1.55, oa: 2.45 },
  { id: "m10", home: "Anthony Joshua", away: "Deontay Wilder", league: "Heavyweight", sport: "boxing", live: false, oh: 1.7, oa: 2.15 },
];

const PROMOTIONS = [
  { id: "p1", title: "100% Welcome Bonus", description: "Double your first deposit up to GHS 500", cta: "Claim Now", badge: "NEW", image_url: "/images/promotions/welcome.svg" },
  { id: "p2", title: "Acca Boost", description: "Get up to 50% extra on multi-bets with 5+ selections", cta: "Bet Now", badge: "HOT", image_url: "/images/promotions/acca.svg" },
  { id: "p3", title: "Refer & Earn", description: "Earn GHS 10 for every friend you refer", cta: "Share Code", badge: "EARN", image_url: "/images/promotions/refer.svg" },
];

const BANNERS = [
  { id: "b1", title: "Bet Smarter. Win Bigger.", subtitle: "Premium odds on 9+ sports", sort_order: 0 },
  { id: "b2", title: "Live Betting", subtitle: "Real-time odds updates", sort_order: 1 },
  { id: "b3", title: "Mobile Money Deposits", subtitle: "Fast & secure via 0203907314", sort_order: 2 },
];

const VIRTUAL_GAMES = [
  { id: "vg1", name: "Virtual Football", type: "virtual_football", config: { interval: 180, leagues: ["Virtual EPL", "Virtual La Liga"] } },
  { id: "vg2", name: "Virtual Basketball", type: "virtual_basketball", config: { interval: 120, leagues: ["Virtual NBA"] } },
  { id: "vg3", name: "Virtual Racing", type: "virtual_racing", config: { interval: 60, tracks: ["Speedway", "Grand Prix"] } },
  { id: "vg4", name: "Virtual Dogs", type: "virtual_dogs", config: { interval: 90, tracks: ["Night Track", "Day Track"] } },
  { id: "vg5", name: "Virtual Numbers", type: "virtual_numbers", config: { interval: 30, range: [1, 36] } },
];

const SETTINGS = [
  { key: "site_name", value: "BestBet" },
  { key: "site_slogan", value: "Bet Smarter. Win Bigger." },
  { key: "momo_number", value: "0203907314" },
  { key: "momo_recipient_name", value: "RAHAMATU NUHU" },
  { key: "min_deposit", value: "5" },
  { key: "min_withdrawal", value: "10" },
  { key: "referral_bonus", value: "10" },
  { key: "currency", value: "GHS" },
];

export async function seed(): Promise<void> {
  await migrate();
  const db = await getDb();

  for (const role of ROLES) await upsert(db, "roles", role, "id");
  for (const perm of PERMISSIONS) await upsert(db, "permissions", perm, "id");
  for (const [roleId, perms] of Object.entries(ROLE_PERMS)) {
    for (const permId of perms) {
      if (db.driver === "json") {
        await db.query(`INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`, [roleId, permId]);
      } else {
        await db.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?) ON CONFLICT DO NOTHING`,
          [roleId, permId]
        );
      }
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@bestbet.gh";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
  const adminId = "admin-001";
  const hash = await bcrypt.hash(adminPassword, 10);

  const existing = await db.query(`SELECT id FROM users WHERE email = ?`, [adminEmail.toLowerCase()]);
  if (existing.rows.length === 0) {
    await db.query(
      `INSERT INTO users (id, email, password_hash, name, role_id, referral_code, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, adminEmail.toLowerCase(), hash, "Super Admin", "super_admin", "BBADMIN", "active"]
    );
    await db.query(`INSERT INTO wallets (id, user_id, balance, bonus_balance, locked_balance) VALUES (?, ?, ?, ?, ?)`, [uuidv4(), adminId, 10000, 0, 0]);
    await db.query(`INSERT INTO audit_logs (id, user_id, action, details) VALUES (?, ?, ?, ?)`, [uuidv4(), adminId, "seed", "Super admin account created"]);
  } else {
    const userId = (existing.rows[0].id as string) || adminId;
    await db.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, userId]);
    await db.query(`UPDATE users SET status = ? WHERE id = ?`, ["active", userId]);
    const wallet = await db.query(`SELECT id FROM wallets WHERE user_id = ?`, [userId]);
    if (wallet.rows.length === 0) {
      await db.query(`INSERT INTO wallets (id, user_id, balance, bonus_balance, locked_balance) VALUES (?, ?, ?, ?, ?)`, [
        uuidv4(),
        userId,
        10000,
        0,
        0,
      ]);
    }
    console.log(`Reset admin password for: ${adminEmail}`);
  }

  const adminUserId =
    existing.rows.length === 0
      ? adminId
      : ((existing.rows[0].id as string) || adminId);

  const adminRecord = await db.query(`SELECT id FROM admins WHERE user_id = ?`, [adminUserId]);
  if (adminRecord.rows.length === 0) {
    await db.query(`INSERT INTO admins (id, user_id, role, status) VALUES (?, ?, ?, ?)`, [
      uuidv4(),
      adminUserId,
      "super_admin",
      "active",
    ]);
  } else {
    await db.query(`UPDATE admins SET role = ?, status = ? WHERE user_id = ?`, [
      "super_admin",
      "active",
      adminUserId,
    ]);
  }

  const legacyAdmins = await db.query(
    `SELECT u.id, u.role_id FROM users u
     LEFT JOIN admins a ON a.user_id = u.id
     WHERE u.role_id IN ('super_admin', 'sub_admin') AND a.id IS NULL`
  );
  for (const row of legacyAdmins.rows) {
    await db.query(`INSERT INTO admins (id, user_id, role, status) VALUES (?, ?, ?, ?)`, [
      uuidv4(),
      row.id,
      row.role_id,
      "active",
    ]);
  }

  for (const l of LEAGUES) {
    const exists = await db.query(`SELECT id FROM leagues WHERE id = ?`, [l.id]);
    if (exists.rows.length === 0) {
      await db.query(`INSERT INTO leagues (id, name, country, sport) VALUES (?, ?, ?, ?)`, [l.id, l.name, l.country, l.sport]);
    }
  }

  for (const m of MATCHES) {
    const exists = await db.query(`SELECT id FROM matches WHERE id = ?`, [m.id]);
    if (exists.rows.length === 0) {
      await db.query(
        `INSERT INTO matches (id, home_team, away_team, league, sport, start_time, is_live, odds_home, odds_draw, odds_away, home_score, away_score, live_minute)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.id, m.home, m.away, m.league, m.sport, new Date().toISOString(), boolVal(db, m.live), m.oh, m.od ?? null, m.oa, m.hs ?? null, m.as ?? null, m.lm ?? null]
      );
      await syncOddsForMatch(m.id, {
        oddsHome: m.oh,
        oddsDraw: m.od ?? null,
        oddsAway: m.oa,
      });
    } else {
      await syncOddsForMatch(m.id, {
        oddsHome: m.oh,
        oddsDraw: m.od ?? null,
        oddsAway: m.oa,
      });
    }
  }

  for (const p of PROMOTIONS) {
    const exists = await db.query(`SELECT id FROM promotions WHERE id = ?`, [p.id]);
    if (exists.rows.length === 0) {
      await db.query(`INSERT INTO promotions (id, title, description, image_url, cta, badge) VALUES (?, ?, ?, ?, ?, ?)`, [p.id, p.title, p.description, p.image_url, p.cta, p.badge]);
    } else {
      await db.query(
        `UPDATE promotions SET image_url = ? WHERE id = ? AND (image_url IS NULL OR image_url LIKE '/banners/%' OR image_url LIKE '/banner/%')`,
        [p.image_url, p.id]
      );
    }
  }

  for (const b of BANNERS) {
    const exists = await db.query(`SELECT id FROM banners WHERE id = ?`, [b.id]);
    if (exists.rows.length === 0) {
      await db.query(`INSERT INTO banners (id, title, subtitle, sort_order) VALUES (?, ?, ?, ?)`, [b.id, b.title, b.subtitle, b.sort_order]);
    } else if (b.id === "b3") {
      await db.query(`UPDATE banners SET subtitle = ? WHERE id = ?`, [b.subtitle, b.id]);
    }
  }

  for (const vg of VIRTUAL_GAMES) {
    const exists = await db.query(`SELECT id FROM virtual_games WHERE id = ?`, [vg.id]);
    if (exists.rows.length === 0) {
      await db.query(`INSERT INTO virtual_games (id, name, type, config) VALUES (?, ?, ?, ?)`, [vg.id, vg.name, vg.type, JSON.stringify(vg.config)]);
    }
  }

  for (const s of SETTINGS) {
    const exists = await db.query(`SELECT key FROM site_settings WHERE key = ?`, [s.key]);
    if (exists.rows.length === 0) {
      await db.query(`INSERT INTO site_settings (key, value) VALUES (?, ?)`, [s.key, s.value]);
    } else if (s.key === "momo_number" || s.key === "momo_recipient_name") {
      await db.query(`UPDATE site_settings SET value = ? WHERE key = ?`, [s.value, s.key]);
    }
  }

  console.log(`Seeded admin: ${adminEmail}`);
  console.log(`Seeded ${MATCHES.length} matches, ${VIRTUAL_GAMES.length} virtual games`);
}

export default seed;
