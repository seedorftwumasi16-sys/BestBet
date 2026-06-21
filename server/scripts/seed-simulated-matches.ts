/**
 * Creates 5 simulated test matches via the match service layer.
 * Run: npm run db:seed-simulated
 */
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { migrate } from "../db/migrate";
import { createMatchRecord, listMatches } from "../lib/matches";

dotenv.config();

const FIXTURES = [
  { home: "Accra Stars", away: "Kumasi United", league: "Simulated League" },
  { home: "Tema City", away: "Cape Coast FC", league: "Simulated League" },
  { home: "Tamale Warriors", away: "Sunyani Rovers", league: "Simulated League" },
  { home: "Ho Dynamos", away: "Bolga City", league: "Simulated League" },
  { home: "Sekondi Eleven", away: "Wa Rangers", league: "Simulated League" },
];

async function main() {
  await migrate();

  const before = (await listMatches()).filter((m) => m.isSimulated).length;
  console.log(`Simulated matches before seed: ${before}`);

  const createdIds: string[] = [];

  for (let i = 0; i < FIXTURES.length; i++) {
    const fixture = FIXTURES[i];
    const id = uuidv4();
    const kickoff = new Date(Date.now() + (i + 1) * 3600000).toISOString();

    try {
      await createMatchRecord(id, {
        homeTeam: fixture.home,
        awayTeam: fixture.away,
        league: fixture.league,
        sport: "football",
        startTime: kickoff,
        matchStatus: i === 0 ? "live" : "upcoming",
        isSimulated: true,
        oddsHome: 1.85 + i * 0.05,
        oddsDraw: 3.2,
        oddsAway: 3.8 + i * 0.1,
        oddsOver: 1.9,
        oddsUnder: 1.85,
        oddsBttsYes: 1.75,
        oddsBttsNo: 2.0,
        overUnderLine: 2.5,
        homeScore: i === 0 ? 1 : 0,
        awayScore: i === 0 ? 0 : 0,
        liveMinute: i === 0 ? 23 : 0,
      });
      createdIds.push(id);
      console.log(`✅ Created simulated match ${i + 1}/5: ${fixture.home} vs ${fixture.away} (${id})`);
    } catch (err) {
      console.error(`❌ Failed simulated match ${i + 1}/5:`, err instanceof Error ? err.message : err);
      process.exit(1);
    }
  }

  const after = (await listMatches()).filter((m) => m.isSimulated);
  console.log(`\nSimulated matches after seed: ${after.length}`);
  console.log("Created IDs:", createdIds.join(", "));
  console.log("\nAll 5 simulated test matches saved successfully.");
}

main().catch((err) => {
  console.error("Seed simulated matches failed:", err);
  process.exit(1);
});
