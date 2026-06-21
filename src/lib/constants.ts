export const BRAND = {
  name: "BestBet",
  slogan: "Bet Smarter. Win Bigger.",
  colors: {
    red: "#FF0000",
    redDark: "#CC0000",
    redLight: "#FF3333",
    white: "#FFFFFF",
    black: "#000000",
    dark: "#000000",
    darkSecondary: "#0A0A0A",
    gray: "#1A1A1A",
    grayLight: "#2A2A2A",
    grayMuted: "#888888",
    success: "#00C853",
    danger: "#FF0000",
    live: "#FF0000",
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
  { id: "epl", name: "Premier League", country: "England", sport: "football" },
  { id: "laliga", name: "La Liga", country: "Spain", sport: "football" },
  { id: "nba", name: "NBA", country: "USA", sport: "basketball" },
  { id: "ucl", name: "Champions League", country: "Europe", sport: "football" },
  { id: "seriea", name: "Serie A", country: "Italy", sport: "football" },
  { id: "bundesliga", name: "Bundesliga", country: "Germany", sport: "football" },
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
  sport: string;
  startTime: Date;
  isLive: boolean;
  liveMinute?: number;
  homeScore?: number;
  awayScore?: number;
  odds: {
    home: number;
    draw?: number;
    away: number;
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
  { id: "agents", name: "Agents", icon: "UserCog" },
  { id: "permissions", name: "Permissions", icon: "Key" },
  { id: "matches", name: "Matches", icon: "Calendar" },
  { id: "deposits", name: "Deposits", icon: "ArrowDownToLine" },
  { id: "withdrawals", name: "Withdrawals", icon: "ArrowUpFromLine" },
  { id: "bookings", name: "Bookings", icon: "Ticket" },
  { id: "promotions", name: "Promotions", icon: "Gift" },
  { id: "banners", name: "Banners", icon: "Image" },
  { id: "virtual", name: "Virtual Games", icon: "Gamepad2" },
  { id: "support", name: "Support", icon: "MessageSquare" },
  { id: "notifications", name: "Notifications", icon: "Bell" },
  { id: "reports", name: "Reports", icon: "BarChart3" },
  { id: "audit-logs", name: "Audit Logs", icon: "FileText" },
  { id: "settings", name: "Settings", icon: "Settings" },
] as const;
