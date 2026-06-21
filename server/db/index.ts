import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

export type DbDriver = "postgresql" | "json";

export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface Database {
  driver: DbDriver;
  query(sql: string, params?: unknown[]): Promise<QueryResult>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
  getWalletBalance?(userId: string): number;
}

interface JsonStore {
  tables: Record<string, Record<string, unknown>[]>;
}

let dbInstance: Database | null = null;

function loadStore(filePath: string): JsonStore {
  const empty: JsonStore = { tables: {} };
  if (!fs.existsSync(filePath)) return empty;

  const raw = fs.readFileSync(filePath, "utf-8").trim();
  if (!raw) {
    console.warn(`[DB] JSON store is empty at ${filePath}, starting fresh`);
    return empty;
  }

  try {
    return JSON.parse(raw) as JsonStore;
  } catch (err) {
    const backupPath = `${filePath}.bak`;
    if (fs.existsSync(backupPath)) {
      try {
        const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8").trim()) as JsonStore;
        console.warn(`[DB] Corrupt JSON store, restored from backup: ${backupPath}`);
        return backup;
      } catch {
        // fall through
      }
    }
    console.error(`[DB] Failed to parse JSON store at ${filePath}:`, err);
    throw err;
  }
}

function saveStore(filePath: string, store: JsonStore) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const payload = JSON.stringify(store, null, 2);
  const tempPath = `${filePath}.tmp`;

  try {
    fs.writeFileSync(tempPath, payload);
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, `${filePath}.bak`);
    }
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    // OneDrive/Windows can block atomic rename (EPERM); fall back to direct write.
    fs.writeFileSync(filePath, payload);
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ignore cleanup failure
      }
    }
    if ((err as NodeJS.ErrnoException).code !== "EPERM") {
      console.warn("[DB] Atomic JSON save failed, used direct write:", (err as Error).message);
    }
  }
}

function createJsonDb(filePath: string): Database {
  let store = loadStore(filePath);

  const ensureTable = (name: string) => {
    if (!store.tables[name]) store.tables[name] = [];
  };

  const persist = () => saveStore(filePath, store);

  const db: Database = {
    driver: "json",
    getWalletBalance(userId: string) {
      ensureTable("wallets");
      const wallet = store.tables.wallets.find((w) => w.user_id === userId);
      return Number(wallet?.balance ?? 0);
    },
    async query(sql: string, params: unknown[] = []) {
      const upper = sql.trim().toUpperCase();

      if (upper.startsWith("SELECT")) {
        if (upper.includes("COUNT(*)")) {
          const match = sql.match(/FROM\s+(\w+)/i);
          const table = match?.[1] ?? "";
          ensureTable(table);
          return { rows: [{ count: store.tables[table].length }], rowCount: 1 };
        }

        if (upper.includes("COALESCE(SUM")) {
          const match = sql.match(/FROM\s+(\w+)/i);
          const table = match?.[1] ?? "";
          ensureTable(table);
          let sum = 0;
          for (const row of store.tables[table]) {
            if (sql.includes("status = 'completed'") && row.status !== "completed") continue;
            sum += Number(row.amount ?? 0);
          }
          return { rows: [{ total: sum }], rowCount: 1 };
        }

        const fromMatch = sql.match(/FROM\s+(\w+)/i);
        const table = fromMatch?.[1] ?? "";
        ensureTable(table);
        let rows = [...store.tables[table]];

        if (sql.includes("WHERE")) {
          if (sql.includes("email = ?")) {
            rows = rows.filter((r) => r.email === params[0]);
          } else if (sql.includes("user_id = ?") && sql.includes("bet_id = ?")) {
            rows = rows.filter((r) => r.bet_id === params[0]);
          } else if (sql.includes("user_id = ?")) {
            rows = rows.filter((r) => r.user_id === params[0]);
          } else if (sql.includes("bet_id = ?")) {
            rows = rows.filter((r) => r.bet_id === params[0]);
          } else if (sql.includes("id = ?") && sql.includes("user_id = ?")) {
            rows = rows.filter((r) => r.id === params[0] && r.user_id === params[1]);
          } else if (sql.includes("id = ?")) {
            rows = rows.filter((r) => r.id === params[0]);
          } else if (sql.includes("code = ?")) {
            rows = rows.filter((r) => r.code === params[0]);
          } else if (sql.includes("token = ?")) {
            rows = rows.filter((r) => r.token === params[0] && !r.used && r.expires_at > params[1]);
          } else if (sql.includes("referral_code = ?")) {
            rows = rows.filter((r) => r.referral_code === params[0]);
          } else if (sql.includes("referred_by = ?")) {
            rows = rows.filter((r) => r.referred_by === params[0]);
          } else if (sql.includes("status = 'pending'")) {
            rows = rows.filter((r) => r.status === "pending");
          } else if (sql.includes("status = 'completed'") && sql.includes("SUM")) {
            // handled above
          } else if (sql.includes("status = 'active'")) {
            rows = rows.filter((r) => !r.status || r.status === "active");
          } else if (sql.includes("is_live = 1") || sql.includes("is_live = true")) {
            rows = rows.filter((r) => r.is_live === 1 || r.is_live === true);
          }
        }

        if (sql.includes("JOIN")) {
          if (sql.includes("users u") && sql.includes("wallets w")) {
            ensureTable("users");
            ensureTable("wallets");
            rows = store.tables.users.map((u) => {
              const w = store.tables.wallets.find((w) => w.user_id === u.id);
              return {
                ...u,
                balance: w?.balance ?? 0,
                bonus_balance: w?.bonus_balance ?? 0,
                locked_balance: w?.locked_balance ?? 0,
                role_id: u.role_id,
              };
            });
            if (params[0]) rows = rows.filter((r) => r.id === params[0] || r.email === params[0]);
          } else if (sql.includes("permissions p")) {
            ensureTable("role_permissions");
            ensureTable("permissions");
            ensureTable("users");
            const user = store.tables.users.find((u) => u.id === params[0]);
            if (!user) return { rows: [], rowCount: 0 };
            const rp = store.tables.role_permissions.filter((r) => r.role_id === user.role_id);
            rows = rp.map((r) => store.tables.permissions.find((p) => p.id === r.permission_id)).filter(Boolean) as Record<string, unknown>[];
          } else if (sql.includes("audit_logs a")) {
            ensureTable("audit_logs");
            ensureTable("users");
            rows = store.tables.audit_logs.map((a) => ({
              ...a,
              user_email: store.tables.users.find((u) => u.id === a.user_id)?.email,
            }));
          } else if (sql.includes("deposits d") || sql.includes("withdrawals w")) {
            const depTable = sql.includes("deposits d") ? "deposits" : "withdrawals";
            ensureTable(depTable);
            ensureTable("users");
            rows = store.tables[depTable].map((d) => {
              const u = store.tables.users.find((u) => u.id === d.user_id);
              return { ...d, email: u?.email, name: u?.name };
            });
          } else if (sql.includes("booking_codes bc")) {
            ensureTable("booking_codes");
            ensureTable("users");
            rows = store.tables.booking_codes.map((bc) => ({
              ...bc,
              email: store.tables.users.find((u) => u.id === bc.user_id)?.email,
            }));
          } else if (sql.includes("referral_code = ?")) {
            ensureTable("users");
            rows = store.tables.users.filter((u) => u.referral_code === params[0]);
          } else if (sql.includes("referred_by = ?")) {
            ensureTable("users");
            rows = store.tables.users.filter((u) => u.referred_by === params[0]);
          } else if (sql.includes("role_id IN")) {
            ensureTable("users");
            rows = store.tables.users.filter((u) => u.role_id === "super_admin" || u.role_id === "sub_admin");
          }
        }

        if (sql.includes("ORDER BY")) {
          if (sql.includes("created_at DESC")) {
            rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
          }
          if (sql.includes("is_live DESC")) {
            rows.sort((a, b) => Number(b.is_live) - Number(a.is_live));
          }
        }

        if (sql.includes("LIMIT")) {
          const limit = parseInt(sql.match(/LIMIT\s+(\d+)/i)?.[1] ?? "100");
          rows = rows.slice(0, limit);
        }

        return { rows, rowCount: rows.length };
      }

      if (upper.startsWith("INSERT")) {
        const match = sql.match(/INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+(\w+)\s*\(([^)]+)\)/i);
        if (!match) return { rows: [], rowCount: 0 };
        const table = match[1];
        const cols = match[2].split(",").map((c) => c.trim());
        ensureTable(table);

        const row: Record<string, unknown> = {};
        cols.forEach((col, i) => { row[col] = params[i]; });

        if (sql.includes("INSERT OR IGNORE") || sql.includes("ON CONFLICT")) {
          const exists = store.tables[table].some((r) => {
            if (table === "role_permissions") return r.role_id === row.role_id && r.permission_id === row.permission_id;
            return r.id === row.id || (row.email && r.email === row.email);
          });
          if (!exists) store.tables[table].push(row);
        } else {
          store.tables[table].push(row);
        }
        persist();
        return { rows: [], rowCount: 1 };
      }

      if (upper.startsWith("UPDATE")) {
        const match = sql.match(/UPDATE\s+(\w+)/i);
        const table = match?.[1] ?? "";
        ensureTable(table);

        if (sql.includes("balance = balance - ?")) {
          const wallet = store.tables.wallets.find((w) => w.user_id === params[1]);
          if (wallet) wallet.balance = Number(wallet.balance) - Number(params[0]);
        } else if (sql.includes("balance = balance + ?")) {
          const wallet = store.tables.wallets.find((w) => w.user_id === params[1]);
          if (wallet) wallet.balance = Number(wallet.balance) + Number(params[0]);
        } else if (sql.includes("password_hash = ?")) {
          const user = store.tables.users.find((u) => u.id === params[1]);
          if (user) user.password_hash = params[0];
        } else if (sql.includes("used = 1")) {
          const token = store.tables.password_reset_tokens.find((t) => t.id === params[0]);
          if (token) token.used = 1;
        } else if (sql.includes("status = 'completed'")) {
          const row = store.tables[table].find((r) => r.id === params[0]);
          if (row) row.status = "completed";
        } else if (sql.includes("status = 'rejected'") || sql.includes("status = 'info_requested'")) {
          const row = store.tables[table].find((r) => r.id === params[params.length - 1]);
          if (row) {
            if (sql.includes("'rejected'")) row.status = "rejected";
            else if (sql.includes("'info_requested'")) row.status = "info_requested";
            if (params[0] && typeof params[0] === "string" && params[0].length > 20) row.admin_note = params[0];
            if (sql.includes("reviewed_by")) row.reviewed_by = params[1];
          }
        } else if (sql.includes("locked_balance = locked_balance + ?")) {
          const wallet = store.tables.wallets.find((w) => w.user_id === params[1]);
          if (wallet) wallet.locked_balance = Number(wallet.locked_balance ?? 0) + Number(params[0]);
        } else if (sql.includes("locked_balance = locked_balance - ?")) {
          const wallet = store.tables.wallets.find((w) => w.user_id === params[1]);
          if (wallet) wallet.locked_balance = Number(wallet.locked_balance ?? 0) - Number(params[0]);
        } else if (sql.includes("balance = balance + ?") && !sql.includes("locked")) {
          const wallet = store.tables.wallets.find((w) => w.user_id === params[1]);
          if (wallet) wallet.balance = Number(wallet.balance) + Number(params[0]);
        } else if (sql.includes("status = ?") && sql.includes("users")) {
          const user = store.tables.users.find((u) => u.id === params[1]);
          if (user) user.status = params[0];
        } else if (sql.includes("phone_verified = 1")) {
          const user = store.tables.users.find((u) => u.id === params[0]);
          if (user) user.phone_verified = 1;
        } else if (sql.includes("cashout_available = 0")) {
          const bet = store.tables.bets.find((b) => b.id === params[0]);
          if (bet) { bet.status = "cashout"; bet.cashout_available = 0; }
        } else if (sql.includes("odds_home = ?")) {
          const row = store.tables.matches.find((r) => r.id === params[2]);
          if (row) { row.odds_home = params[0]; row.odds_away = params[1]; }
        } else if (sql.includes("read = 1")) {
          const row = store.tables[table].find((r) => r.id === params[0] && r.user_id === params[1]);
          if (row) row.read = 1;
        }
        persist();
        return { rows: [], rowCount: 1 };
      }

      return { rows: [], rowCount: 0 };
    },
    async exec(sql: string) {
      void sql;
    },
    async close() {
      persist();
    },
  };

  return db;
}

async function createPostgresDb(connectionString: string): Promise<Database | null> {
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString, connectionTimeoutMillis: 3000 });
    await pool.query("SELECT 1");

    return {
      driver: "postgresql",
      async query(sql: string, params: unknown[] = []) {
        let paramIndex = 0;
        const convertedSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
        const result = await pool.query(convertedSql, params);
        return { rows: result.rows, rowCount: result.rowCount ?? 0 };
      },
      async exec(sql: string) {
        await pool.query(sql);
      },
      async close() {
        await pool.end();
      },
    };
  } catch {
    return null;
  }
}

export async function getWalletBalance(userId: string): Promise<number> {
  const db = await getDb();
  if (db.getWalletBalance) return db.getWalletBalance(userId);
  const result = await db.query(`SELECT balance FROM wallets WHERE user_id = ?`, [userId]);
  return Number(result.rows[0]?.balance ?? 0);
}

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const pgUrl = process.env.DATABASE_URL;
  if (pgUrl) {
    const pg = await createPostgresDb(pgUrl);
    if (pg) {
      dbInstance = pg;
      console.log("[DB] Connected to PostgreSQL");
      return pg;
    }
    console.warn("[DB] PostgreSQL unavailable, falling back to JSON store");
  }

  const jsonPath = process.env.JSON_DB_PATH || "./data/bestbet.json";
  dbInstance = createJsonDb(jsonPath);
  console.log(`[DB] Connected to JSON store (${jsonPath})`);
  return dbInstance;
}

export async function resetDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
  const jsonPath = process.env.JSON_DB_PATH || "./data/bestbet.json";
  if (fs.existsSync(jsonPath)) {
    fs.unlinkSync(jsonPath);
  }
}
