const API_BASE =
  typeof window !== "undefined"
    ? ""
    : process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bestbet_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("bestbet_token", token);
  else localStorage.removeItem("bestbet_token");
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
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
  } catch {
    throw new ApiError(0, "Unable to reach the server. Start the app with `npm run dev`.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error || "Request failed");
  }

  return res.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ token: string; user: Record<string, unknown> }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
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

export const betsApi = {
  getMatches: (sport?: string, live?: boolean) => {
    const params = new URLSearchParams();
    if (sport) params.set("sport", sport);
    if (live) params.set("live", "true");
    const q = params.toString();
    return api<MatchApi[]>(`/api/bets/matches${q ? `?${q}` : ""}`);
  },
  getHistory: () => api<BetHistoryItem[]>("/api/bets/history"),
  place: (data: { type: string; stake: number; selections: unknown[] }) =>
    api<{ id: string; bookingCode: string; stake: number; potentialWin: number; balance: number; cashoutValue: number }>(
      "/api/bets/place",
      { method: "POST", body: JSON.stringify(data) }
    ),
  cashout: (betId: string) =>
    api<{ message: string; amount: number; balance: number }>(`/api/bets/${betId}/cashout`, { method: "POST" }),
  saveBookingCode: (payload: unknown) =>
    api<{ code: string }>("/api/bets/booking-code/save", { method: "POST", body: JSON.stringify({ payload }) }),
  loadBookingCode: (code: string) => api<{ payload: unknown }>(`/api/bets/booking-code/${code}`),
};

export const walletsApi = {
  getBalance: () => api<{ balance: number; bonusBalance: number; lockedBalance: number; available: number }>("/api/wallets/balance"),
  getMomoInfo: () => api<{ number: string; provider: string; currency: string }>("/api/wallets/momo-info"),
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
};

export const contentApi = {
  getPromotions: () => api<unknown[]>("/api/content/promotions"),
  getBanners: () => api<unknown[]>("/api/content/banners"),
  getSettings: () => api<Record<string, string>>("/api/content/settings"),
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

export interface MatchApi {
  id: string;
  homeTeam: { name: string; shortName: string; logo: string };
  awayTeam: { name: string; shortName: string; logo: string };
  league: string;
  leagueId: string;
  sport: string;
  startTime: string;
  isLive: boolean;
  liveMinute?: number;
  homeScore?: number;
  awayScore?: number;
  odds: { home: number; draw?: number; away: number };
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
