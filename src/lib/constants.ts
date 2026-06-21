import { DEFAULT_CURRENCY, CURRENCY_SYMBOL } from "./currency";

export const BRAND = {
  name: "BestBet",
  slogan: "Bet Smarter. Win Bigger.",
  currency: DEFAULT_CURRENCY,
  currencySymbol: CURRENCY_SYMBOL,
  colors: {
    yellow: "#FFD700",
    yellowDark: "#E6C200",
    yellowSecondary: "#FFC107",
    white: "#FFFFFF",
    black: "#0A0A0A",
    dark: "#0A0A0A",
    darkSecondary: "#121212",
    gray: "#1A1A1A",
    grayLight: "#242424",
    grayMuted: "#BDBDBD",
    success: "#00C853",
    danger: "#FF3D00",
    live: "#FF3D00",
  },
} as const;

export const SPORTS = [
  { id: "football", name: "Football", icon: "⚽", count: 1247 },
  { id: "basketball", name: "Basketball", icon: "🏀", count: 432 },
  { id: "tennis", name: "Tennis", icon: "🎾", count: 189 },
  { id: "volleyball", name: "Volleyball", icon: "🏐", count: 76 },
  { id: "baseball", name: "Baseball", icon: "⚾", count: 98 },
  { id: "cricket", name: "Cricket", icon: "🏏", count: 54 },
  { id: "esports", name: "eSports", icon: "🎮", count: 312 },
  { id: "mma", name: "MMA", icon: "🥊", count: 45 },
  { id: "boxing", name: "Boxing", icon: "🥋", count: 38 },
  { id: "live", name: "Live Betting", icon: "🔴", count: 89 },
] as const;

export const LEAGUES = [
  { id: "epl", name: "Premier League", country: "England", sport: "football", sportsdbId: "4328", slug: "english-premier-league" },
  { id: "laliga", name: "La Liga", country: "Spain", sport: "football", sportsdbId: "4334", slug: "spanish-la-liga" },
  { id: "bundesliga", name: "Bundesliga", country: "Germany", sport: "football", sportsdbId: "4331", slug: "german-bundesliga" },
  { id: "seriea", name: "Serie A", country: "Italy", sport: "football", sportsdbId: "4332", slug: "italian-serie-a" },
  { id: "ligue1", name: "Ligue 1", country: "France", sport: "football", sportsdbId: "4335", slug: "french-ligue-1" },
  { id: "ucl", name: "Champions League", country: "Europe", sport: "football", sportsdbId: "4480", slug: "uefa-champions-league" },
  { id: "uel", name: "Europa League", country: "Europe", sport: "football", sportsdbId: "4481", slug: "uefa-europa-league" },
  { id: "clubwc", name: "Club World Cup", country: "World", sport: "football", sportsdbId: "4503", slug: "fifa-club-world-cup" },
  { id: "worldcup", name: "World Cup", country: "World", sport: "football", sportsdbId: "4429", slug: "fifa-world-cup" },
  { id: "caf", name: "CAF Champions League", country: "Africa", sport: "football", sportsdbId: "4748", slug: "caf-champions-league" },
  { id: "ghpl", name: "Ghana Premier League", country: "Ghana", sport: "football", sportsdbId: "4974", slug: "ghana-premier-league" },
  { id: "intl", name: "International", country: "World", sport: "football", sportsdbId: "4562", slug: "international-friendly" },
  { id: "nba", name: "NBA", country: "USA", sport: "basketball" },
] as const;

/** Filter options for football fixture views */
export const FOOTBALL_COMPETITIONS = [
  { id: "all", label: "All Competitions" },
  { id: "4503", label: "FIFA Club World Cup" },
  { id: "4328", label: "Premier League" },
  { id: "4334", label: "La Liga" },
  { id: "4331", label: "Bundesliga" },
  { id: "4332", label: "Serie A" },
  { id: "4335", label: "Ligue 1" },
  { id: "4480", label: "UEFA Champions League" },
  { id: "4481", label: "UEFA Europa League" },
  { id: "4748", label: "CAF Champions League" },
  { id: "4429", label: "FIFA World Cup" },
  { id: "4974", label: "Ghana Premier League" },
  { id: "4562", label: "International" },
] as const;

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  league: string;
  leagueId: string;
  leagueBadge?: string;
  sport: string;
  startTime: Date;
  matchStatus?: "upcoming" | "live" | "finished";
  isLive: boolean;
  isFeatured?: boolean;
  bettingSuspended?: boolean;
  isSimulated?: boolean;
  createdAt?: Date;
  liveMinute?: number;
  liveMinuteDisplay?: string;
  timerPaused?: boolean;
  minuteTickAt?: string | null;
  homeScore?: number;
  awayScore?: number;
  odds: {
    home: number;
    draw?: number;
    away: number;
    over?: number;
    under?: number;
    bttsYes?: number;
    bttsNo?: number;
    overUnderLine?: number;
    correctScore?: Record<string, number>;
    doubleChance?: Record<string, number>;
  };
  stats?: {
    possession: [number, number];
    shots: [number, number];
    corners: [number, number];
  };
}

export interface BetSelection {
  id: string;
  matchId: string;
  matchName: string;
  market: string;
  selection: string;
  odds: number;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  image: string;
  cta: string;
  badge?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  balance: number;
  roleId?: string;
  avatar?: string;
}

export const ADMIN_ROLE_IDS = ["super_admin", "sub_admin"] as const;

export const PROTECTED_SUPER_ADMIN_EMAIL = "admin@bestbet.gh";

export function isProtectedAdminEmail(email?: string): boolean {
  return (email || "").toLowerCase() === PROTECTED_SUPER_ADMIN_EMAIL;
}

export function isAdminRole(roleId?: string): boolean {
  return !!roleId && ADMIN_ROLE_IDS.includes(roleId as (typeof ADMIN_ROLE_IDS)[number]);
}

export function getPostLoginPath(roleId?: string): string {
  return isAdminRole(roleId) ? "/admin" : "/dashboard";
}

export interface ActiveBet {
  id: string;
  type: "single" | "multi";
  selections: BetSelection[];
  stake: number;
  potentialWin: number;
  status: "pending" | "won" | "lost" | "cashout";
  placedAt: Date;
  bookingCode?: string;
}

export interface Transaction {
  id: string;
  type: "deposit" | "withdrawal";
  amount: number;
  status: "completed" | "pending" | "failed";
  date: Date;
  method: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "promo";
  read: boolean;
  date: Date;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalBets: number;
  revenue: number;
}

export const ADMIN_SECTIONS = [
  { id: "dashboard", name: "Dashboard", icon: "LayoutDashboard" },
  { id: "users", name: "Users", icon: "Users" },
  { id: "admins", name: "Admins", icon: "Shield" },
  { id: "matches", name: "Matches", icon: "Calendar" },
  { id: "deposits", name: "Deposits", icon: "ArrowDownToLine" },
  { id: "withdrawals", name: "Withdrawals", icon: "ArrowUpFromLine" },
  { id: "betting-history", name: "Betting History", icon: "TrendingUp" },
  { id: "booking-codes", name: "Booking Codes", icon: "Ticket" },
  { id: "settings", name: "Settings", icon: "Settings" },
] as const;
