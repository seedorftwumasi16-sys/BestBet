export const SCHEMA_EXT_SQL = `
CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  cta TEXT,
  badge TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS banners (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  link_url TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_reply TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL REFERENCES users(id),
  referred_id TEXT NOT NULL REFERENCES users(id),
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS virtual_games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS login_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_id TEXT,
  success INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS device_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  ip_address TEXT,
  last_active TEXT NOT NULL DEFAULT (datetime('now')),
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  sport TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  commission_rate REAL NOT NULL DEFAULT 5,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS booking_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  code TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS responsible_gaming (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  deposit_limit REAL,
  loss_limit REAL,
  session_limit_minutes INTEGER,
  self_excluded_until TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'sub_admin',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS odds (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  market TEXT NOT NULL,
  selection TEXT NOT NULL,
  odds_value REAL NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(match_id, market, selection)
);
`;

export const PG_SCHEMA_EXT_SQL = SCHEMA_EXT_SQL
  .replace(/datetime\('now'\)/g, "NOW()")
  .replace(/INTEGER NOT NULL DEFAULT 0/g, "BOOLEAN NOT NULL DEFAULT FALSE")
  .replace(/INTEGER NOT NULL DEFAULT 1/g, "BOOLEAN NOT NULL DEFAULT TRUE")
  .replace(/active INTEGER/g, "active BOOLEAN")
  .replace(/success INTEGER/g, "success BOOLEAN")
  .replace(/revoked INTEGER/g, "revoked BOOLEAN")
  .replace(/used INTEGER/g, "used BOOLEAN")
  .replace(/REAL/g, "DECIMAL(12,2)");

export const USER_COLUMNS_SQL = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT;
`;

export const WALLET_COLUMNS_SQL = `
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS bonus_balance DECIMAL(12,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS locked_balance DECIMAL(12,2) DEFAULT 0;
`;

export const DEPOSIT_COLUMNS_SQL = `
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS amount_sent DECIMAL(12,2);
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
`;

export const WITHDRAWAL_COLUMNS_SQL = `
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS account_details TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
`;

export const BET_COLUMNS_SQL = `
ALTER TABLE bets ADD COLUMN IF NOT EXISTS cashout_value DECIMAL(12,2);
ALTER TABLE bets ADD COLUMN IF NOT EXISTS cashout_available BOOLEAN DEFAULT FALSE;
`;

export const MATCH_COLUMNS_SQL = `
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_status TEXT DEFAULT 'upcoming';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS betting_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_over DECIMAL(12,2);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_under DECIMAL(12,2);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_btts_yes DECIMAL(12,2);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_btts_no DECIMAL(12,2);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS over_under_line DECIMAL(12,2) DEFAULT 2.5;
`;

export const BOOKING_COLUMNS_SQL = `
ALTER TABLE booking_codes ADD COLUMN IF NOT EXISTS selections TEXT;
ALTER TABLE booking_codes ADD COLUMN IF NOT EXISTS total_odds DECIMAL(12,2);
ALTER TABLE booking_codes ADD COLUMN IF NOT EXISTS stake DECIMAL(12,2);
ALTER TABLE booking_codes ADD COLUMN IF NOT EXISTS potential_win DECIMAL(12,2);
ALTER TABLE booking_codes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE booking_codes ADD COLUMN IF NOT EXISTS bet_type TEXT DEFAULT 'single';
ALTER TABLE booking_codes ADD COLUMN IF NOT EXISTS expires_at TEXT;
ALTER TABLE booking_codes ADD COLUMN IF NOT EXISTS used_by TEXT;
ALTER TABLE booking_codes ADD COLUMN IF NOT EXISTS used_at TEXT;
`;

export const LOGIN_LOG_COLUMNS_SQL = `
ALTER TABLE login_logs ADD COLUMN IF NOT EXISTS failure_reason TEXT;
`;

export const SPORTSDB_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sports_teams (
  id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_name TEXT,
  badge_url TEXT,
  league_id TEXT,
  league_name TEXT,
  sport TEXT NOT NULL DEFAULT 'football',
  country TEXT,
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sports_sync_log (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  message TEXT,
  leagues_synced INTEGER DEFAULT 0,
  teams_synced INTEGER DEFAULT 0,
  events_synced INTEGER DEFAULT 0,
  source TEXT DEFAULT 'thesportsdb',
  created_at TEXT NOT NULL DEFAULT ''
);
`;

export const SPORTSDB_COLUMNS_SQL = `
ALTER TABLE matches ADD COLUMN IF NOT EXISTS external_event_id TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_team_logo TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_team_logo TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS league_badge TEXT;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS badge_url TEXT;
`;

export const SIMULATED_MATCH_COLUMNS_SQL = `
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS created_at TEXT DEFAULT (datetime('now'));
`;
