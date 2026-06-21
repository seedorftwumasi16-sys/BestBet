import { getApiBaseUrl } from "./config";
import {
  clearStoredAuth,
  getStoredToken,
  normalizeLoginEmail,
  normalizeLoginPassword,
  setStoredToken,
} from "./auth-storage";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return getStoredToken();
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  setStoredToken(token);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  const apiBase = getApiBaseUrl();
  try {
    res = await fetch(`${apiBase}${path}`, { ...options, headers, credentials: "include" });
  } catch {
    throw new ApiError(
      0,
      apiBase
        ? `Unable to reach the BestBet API at ${apiBase}. Check your connection and try again.`
        : "Unable to reach the BestBet API. Check your connection and try again."
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const serverMessage = typeof body.error === "string" ? body.error : undefined;
    const authBuild = typeof body.authBuild === "string" ? body.authBuild : res.headers.get("X-Auth-Build");
    let message = serverMessage || "Request failed";
    if (res.status === 401) {
      message = serverMessage || "Invalid email or password";
      if (typeof window !== "undefined" && token) {
        clearStoredAuth();
      }
    } else if (res.status === 403) message = serverMessage || "Access denied";
    else if (res.status === 429) {
      message = serverMessage || "Too many attempts. Please wait a few minutes and try again.";
    }
    if (path.includes("/auth/login") && typeof window !== "undefined") {
      console.error("[api/login]", {
        status: res.status,
        message,
        reason: body.reason,
        authBuild,
      });
    }
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ token: string; user: Record<string, unknown> }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: normalizeLoginEmail(email),
        password: normalizeLoginPassword(password),
      }),
    }),
  register: (data: { name: string; email: string; password: string; phone?: string; referralCode?: string }) =>
    api<{ token: string; user: Record<string, unknown> }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  logout: () => api<{ message: string }>("/api/auth/logout", { method: "POST" }),
  me: () => api<Record<string, unknown>>("/api/auth/me"),
  sendOtp: (phone: string) =>
    api<{ message: string; debugCode?: string }>("/api/auth/phone/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
  verifyPhone: (code: string) =>
    api<{ message: string }>("/api/auth/phone/verify", { method: "POST", body: JSON.stringify({ code }) }),
  getReferrals: () => api<{ referralCode: string; referred: unknown[]; rewards: unknown[] }>("/api/auth/referrals"),
  getResponsibleGaming: () => api<Record<string, unknown>>("/api/auth/responsible-gaming"),
  updateResponsibleGaming: (data: Record<string, unknown>) =>
    api<{ message: string }>("/api/auth/responsible-gaming", { method: "PUT", body: JSON.stringify(data) }),
  requestPasswordReset: (email: string) =>
    api<{ message: string; resetToken?: string }>("/api/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  confirmPasswordReset: (token: string, password: string) =>
    api<{ message: string }>("/api/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
};

export type FixtureWindow = "live" | "today" | "tomorrow" | "upcoming" | "week";

export interface MatchQueryOptions {
  sport?: string;
  live?: boolean;
  featured?: boolean;
  league?: string;
  search?: string;
  window?: FixtureWindow;
}

export const betsApi = {
  getMatches: (opts?: MatchQueryOptions | string, live?: boolean, featured?: boolean) => {
    const options: MatchQueryOptions =
      typeof opts === "string" || opts === undefined
        ? { sport: typeof opts === "string" ? opts : undefined, live, featured }
        : opts;
    const params = new URLSearchParams();
    if (options.sport) params.set("sport", options.sport);
    if (options.live) params.set("live", "true");
    if (options.featured) params.set("featured", "true");
    if (options.league && options.league !== "all") params.set("league", options.league);
    if (options.search) params.set("search", options.search);
    if (options.window) params.set("window", options.window);
    const q = params.toString();
    return api<MatchApi[]>(`/api/bets/matches${q ? `?${q}` : ""}`);
  },
  getHistory: () => api<BetHistoryItem[]>("/api/bets/history"),
  place: (data: { type: string; stake: number; selections: unknown[]; savedBookingCode?: string }) =>
    api<{ id: string; bookingCode: string; stake: number; potentialWin: number; balance: number; cashoutValue: number }>(
      "/api/bets/place",
      { method: "POST", body: JSON.stringify(data) }
    ),
  cashout: (betId: string) =>
    api<{ message: string; amount: number; balance: number }>(`/api/bets/${betId}/cashout`, { method: "POST" }),
  saveBookingCode: (data: { selections: unknown[]; stake: number; betType: "single" | "multi" }) =>
    api<BookingCodeApi>("/api/bets/booking-code/save", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  loadBookingCode: (code: string) =>
    api<{
      code: string;
      payload: {
        selections: BetHistoryItem["selections"];
        stake: number;
        betType: "single" | "multi";
        totalOdds: number;
        potentialWin: number;
      };
      createdAt?: string;
      expiresAt?: string;
      status?: string;
    }>(`/api/bets/booking-code/${encodeURIComponent(code)}`),
};

export const walletsApi = {
  getBalance: () => api<{ balance: number; bonusBalance: number; lockedBalance: number; available: number }>("/api/wallets/balance"),
  getMomoInfo: () => api<{ number: string; recipientName: string; provider: string; currency: string }>("/api/wallets/momo-info"),
  deposit: (formData: FormData) =>
    api<{ id: string; amount: number; status: string }>("/api/wallets/deposit", { method: "POST", body: formData }),
  withdraw: (amount: number, method: string, accountDetails: string) =>
    api<{ id: string; amount: number; status: string }>("/api/wallets/withdraw", {
      method: "POST",
      body: JSON.stringify({ amount, method, accountDetails }),
    }),
  getTransactions: () => api<TransactionApi[]>("/api/wallets/transactions"),
};

export const adminApi = {
  getStats: () => api<AdminStatsApi>("/api/admin/stats"),
  getUsers: () => api<UserAdminApi[]>("/api/admin/users"),
  updateUserStatus: (id: string, status: string) =>
    api<{ message: string }>(`/api/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  adjustBalance: (id: string, amount: number, type: "add" | "deduct", reason?: string) =>
    api<{ balance: number }>(`/api/admin/users/${id}/balance`, {
      method: "PATCH",
      body: JSON.stringify({ amount, type, reason }),
    }),
  getDeposits: () => api<DepositAdminApi[]>("/api/admin/deposits"),
  getWithdrawals: () => api<WithdrawalAdminApi[]>("/api/admin/withdrawals"),
  getBets: () => api<unknown[]>("/api/admin/bets"),
  getBookings: () => api<{ codes: unknown[]; logs: unknown[] }>("/api/admin/bookings"),
  getAuditLogs: () => api<unknown[]>("/api/admin/audit-logs"),
  approveDeposit: (id: string) => api<{ message: string }>(`/api/wallets/deposit/${id}/approve`, { method: "POST" }),
  rejectDeposit: (id: string, adminNote?: string) =>
    api<{ message: string }>(`/api/wallets/deposit/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ adminNote }),
    }),
  requestDepositInfo: (id: string, adminNote: string) =>
    api<{ message: string }>(`/api/wallets/deposit/${id}/request-info`, {
      method: "POST",
      body: JSON.stringify({ adminNote }),
    }),
  approveWithdrawal: (id: string) => api<{ message: string }>(`/api/wallets/withdraw/${id}/approve`, { method: "POST" }),
  rejectWithdrawal: (id: string, adminNote?: string) =>
    api<{ message: string }>(`/api/wallets/withdraw/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ adminNote }),
    }),
  broadcastNotification: (title: string, message: string, type?: string) =>
    api<{ message: string }>("/api/admin/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify({ title, message, type }),
    }),
  getMatches: () => api<MatchApi[]>("/api/admin/matches"),
  createMatch: (data: AdminMatchInput) =>
    api<MatchApi>("/api/admin/matches", { method: "POST", body: JSON.stringify(data) }),
  createSimulatedMatch: (data: AdminMatchInput) =>
    api<MatchApi>("/api/admin/matches/simulated-matches", {
      method: "POST",
      body: JSON.stringify({ ...data, isSimulated: true }),
    }),
  updateMatch: (id: string, data: Partial<AdminMatchInput>) =>
    api<MatchApi>(`/api/admin/matches/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteMatch: (id: string) =>
    api<{ message: string }>(`/api/admin/matches/${id}`, { method: "DELETE" }),
  getAdmins: () => api<AdminAccountApi[]>("/api/admin/admins"),
  createAdmin: (data: AdminAccountInput) =>
    api<AdminAccountApi>("/api/admin/admins", { method: "POST", body: JSON.stringify(data) }),
  updateAdmin: (id: string, data: Partial<AdminAccountInput>) =>
    api<AdminAccountApi>(`/api/admin/admins/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAdmin: (id: string) =>
    api<{ message: string }>(`/api/admin/admins/${id}`, { method: "DELETE" }),
  getBookingCodes: (search?: string) => {
    const q = search ? `?q=${encodeURIComponent(search)}` : "";
    return api<{ codes: BookingCodeAdminApi[]; logs: unknown[] }>(`/api/admin/booking-codes${q}`);
  },
  deleteBookingCode: (id: string) =>
    api<{ message: string }>(`/api/admin/booking-codes/${id}`, { method: "DELETE" }),
};

export const contentApi = {
  getPromotions: () => api<unknown[]>("/api/content/promotions"),
  getBanners: () => api<unknown[]>("/api/content/banners"),
  getSettings: () => api<Record<string, string>>("/api/content/settings"),
  updateSettings: (data: Record<string, string>) =>
    api<{ message: string }>("/api/content/settings", { method: "PUT", body: JSON.stringify(data) }),
  getVirtualGames: () => api<VirtualGameApi[]>("/api/content/virtual-games"),
};

export const notificationsApi = {
  getAll: () => api<NotificationApi[]>("/api/notifications"),
  markRead: (id: string) => api<{ message: string }>(`/api/notifications/${id}/read`, { method: "PATCH" }),
};

export const supportApi = {
  getTickets: () => api<unknown[]>("/api/support"),
  createTicket: (subject: string, message: string) =>
    api<{ id: string }>("/api/support", { method: "POST", body: JSON.stringify({ subject, message }) }),
  getAllTickets: () => api<unknown[]>("/api/support/admin/all"),
  updateTicket: (id: string, data: { status?: string; adminReply?: string }) =>
    api<{ message: string }>(`/api/support/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

export const healthApi = {
  check: () => api<{ status: string }>("/api/health"),
};

export interface SportsSyncStatus {
  provider: string;
  apiReachable: boolean;
  lastSync: {
    status: string;
    message: string;
    leaguesSynced: number;
    teamsSynced: number;
    eventsSynced: number;
    at: string;
  } | null;
  cached: {
    leagues: number;
    teams: number;
    syncedMatches: number;
  };
}

export const sportsApi = {
  getStatus: () => api<SportsSyncStatus>("/api/sports/status"),
  getLeagues: () =>
    api<Array<{ id: string; external_id: string; name: string; sport: string; badge_url?: string }>>(
      "/api/sports/leagues"
    ),
  getBadges: () => api<Record<string, string>>("/api/sports/badges"),
};

export interface MatchApi {
  id: string;
  homeTeam: { name: string; shortName: string; logo: string };
  awayTeam: { name: string; shortName: string; logo: string };
  league: string;
  leagueId: string;
  leagueBadge: string;
  sport: string;
  startTime: string;
  matchStatus: "upcoming" | "live" | "finished";
  isLive: boolean;
  isFeatured: boolean;
  bettingSuspended: boolean;
  isSimulated: boolean;
  createdAt: string;
  liveMinute?: number;
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
}

export interface BookingCodeApi {
  id: string;
  code: string;
  stake: number;
  totalOdds: number;
  potentialWin: number;
  betType: "single" | "multi";
  selections: unknown[];
  createdAt: string;
  expiresAt: string;
  status: string;
}

export interface BookingCodeAdminApi {
  id: string;
  code: string;
  userId: string;
  creatorEmail?: string;
  creatorName?: string;
  stake: number;
  totalOdds: number;
  potentialWin: number;
  betType: string;
  status: string;
  createdAt: string;
  expiresAt?: string;
  usedBy?: string;
  usedByEmail?: string;
  usedByName?: string;
  usedAt?: string;
  selectionCount: number;
}

export interface AdminAccountInput {
  name: string;
  email: string;
  password?: string;
  role?: "super_admin" | "sub_admin";
  status?: "active" | "suspended";
}

export interface AdminAccountApi {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "super_admin" | "sub_admin";
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMatchInput {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: string;
  startTime?: string;
  matchStatus?: "upcoming" | "live" | "finished";
  isFeatured?: boolean;
  bettingSuspended?: boolean;
  isSimulated?: boolean;
  oddsHome?: number;
  oddsDraw?: number | null;
  oddsAway?: number;
  oddsOver?: number | null;
  oddsUnder?: number | null;
  oddsBttsYes?: number | null;
  oddsBttsNo?: number | null;
  overUnderLine?: number;
  homeScore?: number;
  awayScore?: number;
  liveMinute?: number;
  correctScoreOdds?: Record<string, number>;
  doubleChanceOdds?: Record<string, number>;
}

export interface BetHistoryItem {
  id: string;
  type: string;
  stake: number;
  potentialWin: number;
  status: string;
  bookingCode?: string;
  cashoutValue?: number;
  cashoutAvailable?: boolean;
  placedAt: string;
  selections: { id: string; matchId: string; market: string; selection: string; odds: number }[];
}

export interface TransactionApi {
  id: string;
  type: string;
  amount: number;
  status: string;
  method: string;
  date: string;
  payment_reference?: string;
  screenshot_url?: string;
  admin_note?: string;
}

export interface AdminStatsApi {
  totalUsers: number;
  activeUsers: number;
  totalBets: number;
  totalMatches: number;
  liveMatches: number;
  totalDeposits: number;
  totalWithdrawals: number;
  revenue: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
}

export interface UserAdminApi {
  id: string;
  email: string;
  name: string;
  phone?: string;
  status: string;
  roleId: string;
  balance: number;
  bonusBalance: number;
}

export interface DepositAdminApi {
  id: string;
  user_id: string;
  amount: number;
  amount_sent?: number;
  status: string;
  payment_reference?: string;
  screenshot_url?: string;
  email?: string;
  name?: string;
  created_at: string;
}

export interface WithdrawalAdminApi {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  account_details?: string;
  email?: string;
  name?: string;
  created_at: string;
}

export interface VirtualGameApi {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  active: boolean;
}

export interface NotificationApi {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean | number;
  created_at: string;
}
