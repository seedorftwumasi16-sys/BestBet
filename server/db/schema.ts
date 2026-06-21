export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES roles(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  sport TEXT NOT NULL,
  start_time TEXT NOT NULL,
  is_live INTEGER NOT NULL DEFAULT 0,
  odds_home REAL NOT NULL,
  odds_draw REAL,
  odds_away REAL NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  live_minute INTEGER
);

CREATE TABLE IF NOT EXISTS bets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK(type IN ('single', 'multi')),
  stake REAL NOT NULL,
  potential_win REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  booking_code TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bet_selections (
  id TEXT PRIMARY KEY,
  bet_id TEXT NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL REFERENCES matches(id),
  market TEXT NOT NULL,
  selection TEXT NOT NULL,
  odds REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS deposits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  method TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  method TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS booking_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const PG_SCHEMA_SQL = SCHEMA_SQL
  .replace(/datetime\('now'\)/g, "NOW()")
  .replace(/INTEGER NOT NULL DEFAULT 0/g, "BOOLEAN NOT NULL DEFAULT FALSE")
  .replace(/read INTEGER/g, "read BOOLEAN")
  .replace(/is_live INTEGER/g, "is_live BOOLEAN")
  .replace(/used INTEGER/g, "used BOOLEAN")
  .replace(/REAL/g, "DECIMAL(12,2)");
