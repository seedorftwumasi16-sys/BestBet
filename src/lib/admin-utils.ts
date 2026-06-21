import type { AdminStatsApi, MatchApi } from "@/lib/api";

const DEFAULT_STATS: AdminStatsApi = {
  totalUsers: 0,
  activeUsers: 0,
  totalBets: 0,
  totalMatches: 0,
  liveMatches: 0,
  totalDeposits: 0,
  totalWithdrawals: 0,
  revenue: 0,
  pendingDeposits: 0,
  pendingWithdrawals: 0,
};

export function normalizeAdminStats(stats: Partial<AdminStatsApi> | null | undefined): AdminStatsApi {
  if (!stats) return { ...DEFAULT_STATS };
  return {
    totalUsers: Number(stats.totalUsers ?? 0),
    activeUsers: Number(stats.activeUsers ?? stats.totalUsers ?? 0),
    totalBets: Number(stats.totalBets ?? 0),
    totalMatches: Number(stats.totalMatches ?? 0),
    liveMatches: Number(stats.liveMatches ?? 0),
    totalDeposits: Number(stats.totalDeposits ?? 0),
    totalWithdrawals: Number(stats.totalWithdrawals ?? 0),
    revenue: Number(stats.revenue ?? 0),
    pendingDeposits: Number(stats.pendingDeposits ?? 0),
    pendingWithdrawals: Number(stats.pendingWithdrawals ?? 0),
  };
}

export function normalizeMatchApi(match: MatchApi): MatchApi {
  const odds = match.odds ?? ({} as MatchApi["odds"]);
  return {
    ...match,
    homeTeam: match.homeTeam ?? { name: "Home", shortName: "HOM", logo: "⚽" },
    awayTeam: match.awayTeam ?? { name: "Away", shortName: "AWY", logo: "⚽" },
    league: match.league ?? "",
    sport: match.sport ?? "football",
    startTime: match.startTime ?? new Date().toISOString(),
    matchStatus: match.matchStatus ?? "upcoming",
    isLive: Boolean(match.isLive),
    isFeatured: Boolean(match.isFeatured),
    bettingSuspended: Boolean(match.bettingSuspended),
    odds: {
      home: Number(odds.home ?? 0),
      draw: odds.draw != null ? Number(odds.draw) : undefined,
      away: Number(odds.away ?? 0),
      over: odds.over != null ? Number(odds.over) : undefined,
      under: odds.under != null ? Number(odds.under) : undefined,
      bttsYes: odds.bttsYes != null ? Number(odds.bttsYes) : undefined,
      bttsNo: odds.bttsNo != null ? Number(odds.bttsNo) : undefined,
      overUnderLine: odds.overUnderLine != null ? Number(odds.overUnderLine) : undefined,
      correctScore: odds.correctScore,
      doubleChance: odds.doubleChance,
    },
  };
}

export function safeToFixed(value: unknown, digits = 2, fallback = "—"): string {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(digits) : fallback;
}

export function safeFormatCount(value: unknown): string {
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString() : "0";
}

export function safeFormatCurrency(value: unknown, formatter: (n: number) => string): string {
  const num = Number(value);
  return Number.isFinite(num) ? formatter(num) : formatter(0);
}
