/**
 * BestBet Full System Verification Script
 * Run: npm run verify
 */
import dotenv from "dotenv";
import { spawn, execSync } from "child_process";
import { WebSocket } from "ws";

dotenv.config();

const API = process.env.API_URL || "http://127.0.0.1:5000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@bestbet.gh";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@2005";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];
let serverProcess: ReturnType<typeof spawn> | null = null;

function pass(name: string, message = "OK") {
  results.push({ name, passed: true, message });
  console.log(`  ✅ ${name}: ${message}`);
}

function fail(name: string, message: string) {
  results.push({ name, passed: false, message });
  console.log(`  ❌ ${name}: ${message}`);
}

async function fetchJson(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers as Record<string, string>) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function waitForHealth(maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { status, body } = await fetchJson("/api/health");
      if (status === 200 && body.status === "ok") return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function killPort(port: number) {
  try {
    const { execSync } = await import("child_process");
    execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port} ^| findstr LISTENING') do taskkill /F /PID %a`, {
      shell: "cmd.exe",
      stdio: "pipe",
    });
  } catch {
    // port may not be in use
  }
}

async function startServer(): Promise<void> {
  console.log("  Starting backend server...");
  await killPort(5000);
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  await new Promise((r) => setTimeout(r, 1000));

  serverProcess = spawn("npx", ["tsx", "server/index.ts"], {
    cwd: process.cwd(),
    shell: true,
    stdio: "pipe",
    env: { ...process.env },
  });

  const ready = await waitForHealth(30);
  if (ready) pass("Express server start", "Server ready on port 5000");
  else fail("Express server start", "Server did not become healthy in 30s");
}

async function testDatabase() {
  console.log("\n📦 Database Verification");
  try {
    const { resetDb, getDb } = await import("../db");
    const { migrate } = await import("../db/migrate");
    const seed = (await import("../db/seed")).default;

    await resetDb();
    await migrate();
    await seed();
    const db = await getDb();
    pass("DB Connection", `Connected (${db.driver})`);

    const tables = ["users", "roles", "permissions", "matches", "bets", "wallets", "deposits", "withdrawals"];
    for (const table of tables) {
      const r = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
      pass(`Table: ${table}`, `${r.rows[0].count} rows`);
    }
  } catch (err) {
    fail("Database", err instanceof Error ? err.message : String(err));
  }
}

async function testHealth() {
  console.log("\n🏥 API Health");
  try {
    const { status, body } = await fetchJson("/api/health");
    if (status === 200 && body.status === "ok") {
      pass("GET /api/health", JSON.stringify(body));
    } else {
      fail("GET /api/health", `Status ${status}, body: ${JSON.stringify(body)}`);
    }
  } catch (err) {
    fail("GET /api/health", `Server not reachable: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function testAuth(): Promise<string | null> {
  console.log("\n🔐 Authentication");
  let token: string | null = null;

  try {
    const login = await fetchJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });

    if (login.status === 200 && login.body.token) {
      token = login.body.token;
      pass("Login (admin@bestbet.gh)", `JWT generated, role: ${login.body.user.roleId}`);
    } else {
      fail("Login (admin@bestbet.gh)", `${login.status}: ${JSON.stringify(login.body)}`);
      return null;
    }

    if (typeof token === "string" && token.split(".").length === 3) {
      pass("JWT format", "Valid 3-part token");
    } else {
      fail("JWT format", "Invalid token structure");
    }

    const me = await fetchJson("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (me.status === 200) pass("Protected /api/auth/me", `Balance: $${me.body.balance}`);
    else fail("Protected /api/auth/me", `Status ${me.status}`);

    const noAuth = await fetchJson("/api/auth/me");
    if (noAuth.status === 401) pass("Unauthenticated blocked", "401 returned");
    else fail("Unauthenticated blocked", `Expected 401, got ${noAuth.status}`);

    const resetReq = await fetchJson("/api/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email: ADMIN_EMAIL }),
    });
    if (resetReq.status === 200 && resetReq.body.resetToken) {
      const resetConfirm = await fetchJson("/api/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token: resetReq.body.resetToken, password: ADMIN_PASSWORD }),
      });
      if (resetConfirm.status === 200) pass("Password reset", "Reset flow completed");
      else fail("Password reset", JSON.stringify(resetConfirm.body));
    } else {
      fail("Password reset request", JSON.stringify(resetReq.body));
    }

    const regEmail = `test-${Date.now()}@bestbet.gh`;
    const reg = await fetchJson("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Test User", email: regEmail, password: "Test@123456" }),
    });
    if (reg.status === 201 && reg.body.token) pass("Registration", `User ${regEmail} created`);
    else fail("Registration", JSON.stringify(reg.body));

    const reLogin = await fetchJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    token = reLogin.body?.token ?? token;

    if (token) {
      const logout = await fetchJson("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (logout.status === 200) pass("Logout", logout.body.message);
      else fail("Logout", `Status ${logout.status}`);

      const relogin = await fetchJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      });
      token = relogin.body?.token ?? null;
    }
  } catch (err) {
    fail("Authentication", err instanceof Error ? err.message : String(err));
  }

  return token;
}

async function testBetting(token: string | null) {
  console.log("\n🎰 Betting & Payments");
  if (!token) { fail("Betting", "No auth token"); return; }

  const headers = { Authorization: `Bearer ${token}` };

  const matches = await fetchJson("/api/bets/matches");
  if (matches.status === 200 && Array.isArray(matches.body)) {
    pass("Get matches", `${matches.body.length} matches`);
  } else fail("Get matches", `Status ${matches.status}`);

  const deposit = await fetchJson("/api/wallets/deposit", {
    method: "POST",
    headers,
    body: JSON.stringify({ amount: 500, method: "Visa ****4242" }),
  });
  if (deposit.status === 201) pass("Deposit request saved", `ID: ${deposit.body.id}`);
  else fail("Deposit request saved", JSON.stringify(deposit.body));

  if (deposit.body?.id) {
    const approve = await fetchJson(`/api/wallets/deposit/${deposit.body.id}/approve`, {
      method: "POST",
      headers,
    });
    if (approve.status === 200) pass("Admin deposit approval", `Wallet +$${approve.body.amount}`);
    else fail("Admin deposit approval", JSON.stringify(approve.body));
  }

  const place = await fetchJson("/api/bets/place", {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "single",
      stake: 10,
      selections: [{ matchId: "m1", market: "Match Result", selection: "Manchester City", odds: 1.85 }],
    }),
  });
  if (place.status === 201) {
    pass("Single bet placed", `Booking: ${place.body.bookingCode}, balance: $${place.body.balance}`);
  } else fail("Single bet placed", JSON.stringify(place.body));

  const multi = await fetchJson("/api/bets/place", {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "multi",
      stake: 5,
      selections: [
        { matchId: "m1", market: "Match Result", selection: "Manchester City", odds: 1.85 },
        { matchId: "m2", market: "Match Result", selection: "Real Madrid", odds: 2.1 },
      ],
    }),
  });
  if (multi.status === 201) pass("Multi bet placed", `Potential: $${multi.body.potentialWin}`);
  else fail("Multi bet placed", JSON.stringify(multi.body));

  const saveCode = await fetchJson("/api/bets/booking-code/save", {
    method: "POST",
    headers,
    body: JSON.stringify({
      selections: [
        {
          matchId: "m1",
          matchName: "Manchester City vs Arsenal",
          market: "Match Result",
          selection: "Manchester City",
          odds: 1.85,
        },
      ],
      stake: 25,
      betType: "single",
    }),
  });
  if (saveCode.status === 200 && saveCode.body.code) {
    pass("Booking code generation", saveCode.body.code);
    const loadCode = await fetchJson(`/api/bets/booking-code/${saveCode.body.code}`);
    if (loadCode.status === 200 && loadCode.body.payload?.selections?.length) {
      pass("Booking code retrieval", "Payload loaded");
    } else fail("Booking code retrieval", `Status ${loadCode.status}`);
  } else fail("Booking code generation", JSON.stringify(saveCode.body));

  const history = await fetchJson("/api/bets/history", { headers });
  if (history.status === 200 && Array.isArray(history.body)) pass("Bet history", `${history.body.length} bets`);
  else fail("Bet history", `Status ${history.status}`);

  const withdraw = await fetchJson("/api/wallets/withdraw", {
    method: "POST",
    headers,
    body: JSON.stringify({ amount: 50, method: "Bank Transfer" }),
  });
  if (withdraw.status === 201) pass("Withdrawal request saved", `ID: ${withdraw.body.id}`);
  else fail("Withdrawal request saved", JSON.stringify(withdraw.body));

  const txs = await fetchJson("/api/wallets/transactions", { headers });
  if (txs.status === 200) pass("Transactions recorded", `${txs.body.length} transactions`);
  else fail("Transactions recorded", `Status ${txs.status}`);
}

async function testAdmin(token: string | null) {
  console.log("\n👑 Admin");
  if (!token) { fail("Admin", "No auth token"); return; }

  const headers = { Authorization: `Bearer ${token}` };

  const stats = await fetchJson("/api/admin/stats", { headers });
  if (stats.status === 200) pass("Super Admin stats", `${stats.body.totalUsers} users`);
  else fail("Super Admin stats", `Status ${stats.status}`);

  const adminList = await fetchJson("/api/admin/admins", { headers });
  if (adminList.status === 200 && Array.isArray(adminList.body)) {
    pass("List admins", `${adminList.body.length} admin(s)`);
  } else fail("List admins", `Status ${adminList.status}`);

  const subAdminEmail = `subadmin-${Date.now()}@bestbet.gh`;
  const subAdmin = await fetchJson("/api/admin/admins", {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "Sub Admin", email: subAdminEmail, password: "Sub@123456" }),
  });
  if (subAdmin.status === 201) pass("Sub Admin creation", subAdmin.body.email);
  else fail("Sub Admin creation", JSON.stringify(subAdmin.body));

  if (subAdmin.status === 201 && subAdmin.body.id) {
    const updated = await fetchJson(`/api/admin/admins/${subAdmin.body.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ name: "Sub Admin Updated", status: "active" }),
    });
    if (updated.status === 200) pass("Update admin", updated.body.name);
    else fail("Update admin", JSON.stringify(updated.body));

    const deleted = await fetchJson(`/api/admin/admins/${subAdmin.body.id}`, {
      method: "DELETE",
      headers,
    });
    if (deleted.status === 200) pass("Delete admin", "Removed");
    else fail("Delete admin", JSON.stringify(deleted.body));
  }

  const matches = await fetchJson("/api/admin/matches", { headers });
  if (matches.status === 200 && Array.isArray(matches.body)) {
    pass("List matches", `${matches.body.length} match(es)`);
  } else fail("List matches", `Status ${matches.status}`);

  const newMatch = await fetchJson("/api/admin/matches", {
    method: "POST",
    headers,
    body: JSON.stringify({
      homeTeam: "Test Home",
      awayTeam: "Test Away",
      league: "Test League",
      sport: "football",
      matchStatus: "upcoming",
      oddsHome: 1.9,
      oddsDraw: 3.2,
      oddsAway: 4.1,
    }),
  });
  if (newMatch.status === 201) pass("Create match", newMatch.body.id);
  else fail("Create match", JSON.stringify(newMatch.body));

  if (newMatch.status === 201 && newMatch.body.id) {
    const matchUpdated = await fetchJson(`/api/admin/matches/${newMatch.body.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ matchStatus: "live", oddsHome: 2.0, homeScore: 1, awayScore: 0, liveMinute: 45 }),
    });
    if (matchUpdated.status === 200) pass("Update match", matchUpdated.body.matchStatus);
    else fail("Update match", JSON.stringify(matchUpdated.body));

    const matchDeleted = await fetchJson(`/api/admin/matches/${newMatch.body.id}`, {
      method: "DELETE",
      headers,
    });
    if (matchDeleted.status === 200) pass("Delete match", "Removed");
    else fail("Delete match", JSON.stringify(matchDeleted.body));
  }

  const perms = await fetchJson("/api/admin/permissions", { headers });
  if (perms.status === 200) pass("Permissions system", `${perms.body.permissions.length} permissions`);
  else fail("Permissions system", `Status ${perms.status}`);

  const bookingCodes = await fetchJson("/api/admin/booking-codes", { headers });
  if (bookingCodes.status === 200 && Array.isArray(bookingCodes.body.codes)) {
    pass("Admin booking codes", `${bookingCodes.body.codes.length} code(s)`);
  } else fail("Admin booking codes", `Status ${bookingCodes.status}`);

  const logs = await fetchJson("/api/admin/audit-logs", { headers });
  if (logs.status === 200 && Array.isArray(logs.body) && logs.body.length > 0) {
    pass("Audit logs recorded", `${logs.body.length} entries`);
  } else fail("Audit logs recorded", `Status ${logs.status}, count: ${logs.body?.length ?? 0}`);
}

async function testWebSocket(): Promise<void> {
  console.log("\n📡 Real-Time (WebSocket)");
  return new Promise((resolve) => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://127.0.0.1:5000";
    const ws = new WebSocket(wsUrl);
    let received = false;
    const timeout = setTimeout(() => {
      ws.close();
      if (!received) fail("WebSocket messages", "No message received within 8s");
      resolve();
    }, 8000);

    ws.onopen = () => pass("WebSocket connection", "Connected");
    ws.onmessage = (evt) => {
      if (!received) {
        received = true;
        const data = JSON.parse(evt.data as string);
        pass("Live update received", `Type: ${data.type}`);
        clearTimeout(timeout);
        ws.close();
        resolve();
      }
    };
    ws.onerror = () => {
      fail("WebSocket connection", "Connection error");
      clearTimeout(timeout);
      resolve();
    };
  });
}

async function testFrontendBuild() {
  console.log("\n🖥️  Frontend Build");
  const { execSync } = await import("child_process");
  try {
    execSync("npm run build", { stdio: "pipe", cwd: process.cwd(), env: { ...process.env } });
    pass("npm run build", "Build completed successfully");
    return true;
  } catch (err) {
    const e = err as { stdout?: Buffer; stderr?: Buffer };
    const output = [e.stdout?.toString(), e.stderr?.toString()].filter(Boolean).join("\n");
    fail("npm run build", output.slice(-800) || "Build failed");
    return false;
  }
}

async function testFrontendRoutes() {
  console.log("\n🌐 Frontend Routes (via production server)");
  const { spawn } = await import("child_process");
  const PORT = 3002;

  let nextProcess: ReturnType<typeof spawn> | null = null;
  try {
    await killPort(PORT);
    await new Promise((r) => setTimeout(r, 500));

    nextProcess = spawn("npx", ["next", "start", "-p", String(PORT)], {
      cwd: process.cwd(),
      shell: true,
      stdio: "pipe",
    });

    let ready = false;
    for (let i = 0; i < 45; i++) {
      try {
        const res = await fetch(`http://localhost:${PORT}/`);
        if (res.status === 200) { ready = true; break; }
      } catch { /* wait */ }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!ready) {
      fail("Frontend server", `Could not start on port ${PORT}`);
      return;
    }

    pass("Frontend server start", `http://localhost:${PORT}`);

    const routes = ["/live", "/login", "/register", "/dashboard", "/admin", "/sports/football", "/"];
    for (const route of routes) {
      const res = await fetch(`http://localhost:${PORT}${route}`);
      if (res.status === 200) pass(`Route ${route}`, "OK");
      else fail(`Route ${route}`, `Status ${res.status}`);
    }
  } catch (err) {
    fail("Frontend routes", err instanceof Error ? err.message : String(err));
  } finally {
    if (nextProcess) nextProcess.kill();
    await killPort(PORT);
  }
}

function cleanup() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  BestBet System Verification");
  console.log("═══════════════════════════════════════");

  await testFrontendBuild();
  await testDatabase();
  await startServer();
  await testHealth();

  const token = await testAuth();
  await testBetting(token);
  await testAdmin(token);
  await testWebSocket();
  await testFrontendRoutes();

  console.log("\n═══════════════════════════════════════");
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════\n");

  cleanup();

  if (failed > 0) {
    console.log("Failed tests:");
    results.filter((r) => !r.passed).forEach((r) => console.log(`  - ${r.name}: ${r.message}`));
    process.exit(1);
  }

  console.log("✅ All verification tests passed. Project is complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Verification crashed:", err);
  cleanup();
  process.exit(1);
});
