/**
 * Creates 3 simulated test matches on the production (or custom) API.
 * Run: API_URL=https://bestbet-api-production.up.railway.app npx tsx server/scripts/seed-production-simulated.ts
 */
const API_URL = (process.env.API_URL || "https://bestbet-api-production.up.railway.app").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@bestbet.gh";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123@";

const FIXTURES = [
  { homeTeam: "Accra Stars", awayTeam: "Kumasi United", league: "Ghana Premier League" },
  { homeTeam: "Tema City", awayTeam: "Cape Coast FC", league: "English Premier League" },
  { homeTeam: "Sunyani Rovers", awayTeam: "Tamale Warriors", league: "Simulated League" },
];

async function fetchJson(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  console.log(`API: ${API_URL}`);

  const health = await fetchJson("/api/health");
  console.log("Health:", JSON.stringify(health.body));

  const login = await fetchJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  if (login.status !== 200 || !login.body.token) {
    console.error("Login failed:", login.status, login.body);
    process.exit(1);
  }

  const token = login.body.token as string;
  console.log(`Logged in as ${ADMIN_EMAIL}`);

  const created: string[] = [];
  for (let i = 0; i < FIXTURES.length; i++) {
    const f = FIXTURES[i];
    const startTime = new Date(Date.now() + (i + 1) * 86400000).toISOString();
    const result = await fetchJson("/api/admin/matches/simulated-matches", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        homeTeam: f.homeTeam,
        awayTeam: f.awayTeam,
        league: f.league,
        sport: "football",
        startTime,
        matchStatus: i === 0 ? "live" : "upcoming",
        oddsHome: 1.85,
        oddsDraw: 3.4,
        oddsAway: 4.2,
        homeScore: i === 0 ? 1 : 0,
        awayScore: i === 0 ? 0 : 0,
        liveMinute: i === 0 ? 35 : 0,
      }),
    });

    if (result.status === 201) {
      created.push(result.body.id);
      console.log(`✅ ${i + 1}/3: ${f.homeTeam} vs ${f.awayTeam} (${result.body.id})`);
    } else {
      console.error(`❌ ${i + 1}/3 failed:`, result.status, JSON.stringify(result.body));
      process.exit(1);
    }
  }

  console.log("\nAll 3 production simulated matches created:", created.join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
