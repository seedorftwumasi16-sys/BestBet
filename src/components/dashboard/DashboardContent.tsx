"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  Trophy,
  ArrowDownToLine,
  ArrowUpFromLine,
  Ticket,
  Bell,
  Copy,
  Clock,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { formatCurrency, formatOdds, cn } from "@/lib/utils";
import { betsApi, walletsApi, type BetHistoryItem, type TransactionApi } from "@/lib/api";
import { ContactInfo } from "@/components/layout/ContactInfo";
import {
  DASHBOARD_TAB_SLUGS,
  dashboardTabFromSlug,
  type DashboardTab,
} from "@/lib/layout-constants";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const tabs = Object.keys(DASHBOARD_TAB_SLUGS) as DashboardTab[];

const chartData = [
  { month: "Jan", profit: 120, bets: 45 },
  { month: "Feb", profit: 280, bets: 62 },
  { month: "Mar", profit: -50, bets: 38 },
  { month: "Apr", profit: 420, bets: 71 },
  { month: "May", profit: 350, bets: 58 },
  { month: "Jun", profit: 510, bets: 83 },
];

function formatPlacedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function betStatusVariant(status: string): "success" | "danger" | "warning" | "default" | "live" {
  if (status === "won") return "success";
  if (status === "lost") return "danger";
  if (status === "pending") return "warning";
  if (status === "cashout") return "default";
  return "default";
}

function matchStatusLabel(status?: string): string {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function DashboardContent() {
  const { user, isLoggedIn, notifications } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<DashboardTab>("Overview");
  const [bets, setBets] = useState<BetHistoryItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionApi[]>([]);
  const [matchStatusMap, setMatchStatusMap] = useState<Record<string, string>>({});
  const [loadingBets, setLoadingBets] = useState(true);

  const refreshBets = useCallback(async () => {
    setLoadingBets(true);
    try {
      const [history, matches] = await Promise.all([betsApi.getHistory(), betsApi.getMatches()]);
      setBets(history);
      const map: Record<string, string> = {};
      matches.forEach((m) => {
        map[m.id] = m.matchStatus;
      });
      setMatchStatusMap(map);
    } catch {
      toast.error("Failed to load bets");
    } finally {
      setLoadingBets(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isLoggedIn) return;
    refreshBets();
    walletsApi.getTransactions().then(setTransactions).catch(() => {});
  }, [isLoggedIn, refreshBets]);

  useEffect(() => {
    const tab = dashboardTabFromSlug(searchParams.get("tab"));
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const selectTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    router.replace(`/dashboard?tab=${DASHBOARD_TAB_SLUGS[tab]}`, { scroll: false });
  };

  const activeBets = useMemo(
    () =>
      [...bets].sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (b.status === "pending" && a.status !== "pending") return 1;
        return new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime();
      }),
    [bets]
  );

  const pendingBets = bets.filter((b) => b.status === "pending");
  const wonBets = bets.filter((b) => b.status === "won");

  const handleCashout = async (betId: string) => {
    try {
      await betsApi.cashout(betId);
      await refreshBets();
      toast.success("Cash out successful");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cash out failed");
    }
  };

  const copyBookingCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Booking code copied");
    } catch {
      toast.error("Could not copy code");
    }
  };

  if (!isLoggedIn || !user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Please log in</h2>
            <p className="text-bestbet-gray-muted mb-4">Access your dashboard by logging in</p>
            <Link href="/login">
              <Button variant="primary">Log In</Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto min-w-0">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black">Dashboard</h1>
              <p className="text-sm text-bestbet-gray-muted">Welcome back, {user.name}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/dashboard/deposit">
                <Button variant="primary" size="sm">
                  <ArrowDownToLine size={16} /> Deposit
                </Button>
              </Link>
              <Link href="/dashboard/withdraw">
                <Button variant="secondary" size="sm">
                  <ArrowUpFromLine size={16} /> Withdraw
                </Button>
              </Link>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Wallet Balance", value: formatCurrency(user.balance), icon: Wallet, color: "text-bestbet-yellow", tab: null },
              { label: "Active Bets", value: pendingBets.length.toString(), icon: TrendingUp, color: "text-blue-400", tab: "Active Bets" as DashboardTab },
              { label: "Won Bets", value: wonBets.length.toString(), icon: Trophy, color: "text-bestbet-success", tab: "History" as DashboardTab },
              { label: "Notifications", value: notifications.filter((n) => !n.read).length.toString(), icon: Bell, color: "text-orange-400", tab: null },
            ].map((stat) => (
              <motion.button
                key={stat.label}
                type="button"
                whileHover={stat.tab ? { y: -2 } : undefined}
                onClick={() => stat.tab && selectTab(stat.tab)}
                className={cn(
                  "stat-card p-4 text-left w-full",
                  stat.tab && "cursor-pointer hover:border-bestbet-yellow/30 transition-colors"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <stat.icon size={20} className={stat.color} />
                </div>
                <p className="text-xl font-black">{stat.value}</p>
                <p className="text-xs text-bestbet-gray-muted mt-1">{stat.label}</p>
              </motion.button>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-[var(--border)] -mx-1 px-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => selectTab(tab)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 shrink-0",
                  activeTab === tab
                    ? "text-bestbet-yellow border-bestbet-yellow"
                    : "text-bestbet-gray-muted border-transparent hover:text-[var(--foreground)]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </FadeIn>

        {activeTab === "Overview" && (
          <FadeIn delay={0.2}>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)] min-w-0">
                <h3 className="text-sm font-bold mb-4">Betting Performance</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFD700" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#FFD700" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="profit" stroke="#FFD700" fill="url(#profitGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)] min-w-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold">Recent Bets</h3>
                  <button
                    type="button"
                    onClick={() => selectTab("Active Bets")}
                    className="text-xs font-semibold text-bestbet-yellow hover:underline"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-3">
                  {activeBets.slice(0, 3).map((bet) => (
                    <div key={bet.id} className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={betStatusVariant(bet.status)}>{bet.status}</Badge>
                        <span className="text-[11px] text-bestbet-gray-muted">{formatPlacedAt(bet.placedAt)}</span>
                      </div>
                      <p className="text-sm mt-2 font-medium">
                        {formatCurrency(bet.stake)} → {formatCurrency(bet.potentialWin)}
                      </p>
                    </div>
                  ))}
                  {activeBets.length === 0 && (
                    <p className="text-sm text-bestbet-gray-muted text-center py-4">No bets placed yet</p>
                  )}
                </div>
              </div>

              <ContactInfo variant="card" className="md:col-span-2" />
            </div>
          </FadeIn>
        )}

        {activeTab === "Active Bets" && (
          <div className="space-y-3 min-w-0">
            {loadingBets ? (
              <p className="text-center text-bestbet-gray-muted py-8">Loading bets…</p>
            ) : (
              activeBets.map((bet) => {
                const totalOdds = bet.selections.reduce((acc, s) => acc * s.odds, 1);
                return (
                  <motion.div
                    key={bet.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="stat-card p-4 min-w-0 overflow-hidden"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="default">{bet.type.toUpperCase()}</Badge>
                        <Badge variant={betStatusVariant(bet.status)}>{bet.status.toUpperCase()}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-bestbet-gray-muted">
                        <Clock size={12} />
                        {formatPlacedAt(bet.placedAt)}
                      </div>
                    </div>

                    {bet.bookingCode && (
                      <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                        <span className="text-[11px] text-bestbet-gray-muted shrink-0">Booking Code</span>
                        <code className="text-sm font-bold text-bestbet-yellow tracking-wider truncate flex-1">
                          {bet.bookingCode}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyBookingCode(bet.bookingCode!)}
                          className="p-1.5 rounded-lg hover:bg-white/5 shrink-0"
                          aria-label="Copy booking code"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    )}

                    <div className="space-y-2 mb-3">
                      {bet.selections.map((sel) => (
                        <div
                          key={sel.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 border-b border-[var(--border)] last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{sel.selection}</p>
                            <p className="text-xs text-bestbet-gray-muted">{sel.market}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-xs">
                            <Badge variant="default">{matchStatusLabel(matchStatusMap[sel.matchId])}</Badge>
                            <span className="font-bold text-bestbet-yellow tabular-nums">{formatOdds(sel.odds)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border)]">
                      <div>
                        <p className="text-[11px] text-bestbet-gray-muted">Stake</p>
                        <p className="font-bold tabular-nums">{formatCurrency(bet.stake)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-bestbet-gray-muted">Total Odds</p>
                        <p className="font-bold tabular-nums">{formatOdds(totalOdds)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-bestbet-gray-muted">Potential Win</p>
                        <p className="font-bold text-bestbet-yellow tabular-nums">{formatCurrency(bet.potentialWin)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-bestbet-gray-muted">Result</p>
                        <p className="font-bold capitalize">{bet.status}</p>
                      </div>
                    </div>

                    {bet.cashoutAvailable && bet.cashoutValue && bet.status === "pending" && (
                      <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => handleCashout(bet.id)}>
                        Cash Out {formatCurrency(bet.cashoutValue)}
                      </Button>
                    )}
                  </motion.div>
                );
              })
            )}
            {!loadingBets && activeBets.length === 0 && (
              <div className="text-center py-12 px-4">
                <Ticket size={40} className="mx-auto text-bestbet-gray-muted mb-3 opacity-50" />
                <p className="text-bestbet-gray-muted">No bets placed yet</p>
                <Link href="/sports/football" className="inline-block mt-4">
                  <Button variant="primary" size="sm">Browse Matches</Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === "History" && (
          <div className="space-y-3 min-w-0">
            {bets
              .filter((b) => b.status !== "pending")
              .map((bet) => (
                <div key={bet.id} className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="flex flex-wrap justify-between gap-2">
                    <Badge variant={betStatusVariant(bet.status)}>{bet.status}</Badge>
                    <span className="text-xs text-bestbet-gray-muted">{formatPlacedAt(bet.placedAt)}</span>
                  </div>
                  <p className="text-sm mt-2">
                    Stake: {formatCurrency(bet.stake)} → Win: {formatCurrency(bet.potentialWin)}
                  </p>
                  {bet.bookingCode && (
                    <code className="text-xs font-bold text-bestbet-yellow mt-2 inline-block">{bet.bookingCode}</code>
                  )}
                </div>
              ))}
          </div>
        )}

        {activeTab === "Transactions" && (
          <div className="space-y-2 min-w-0">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between bg-[var(--card)] rounded-xl p-4 border border-[var(--border)] gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {tx.type === "deposit" ? (
                    <ArrowDownToLine size={18} className="text-bestbet-success shrink-0" />
                  ) : (
                    <ArrowUpFromLine size={18} className="text-orange-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize">{tx.type}</p>
                    <p className="text-xs text-bestbet-gray-muted truncate">{tx.method}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold tabular-nums ${tx.type === "deposit" ? "text-bestbet-success" : ""}`}>
                    {tx.type === "deposit" ? "+" : "-"}
                    {formatCurrency(tx.amount)}
                  </p>
                  <Badge variant={tx.status === "completed" ? "success" : tx.status === "pending" ? "warning" : "live"}>
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Booking Codes" && (
          <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)] text-center min-w-0">
            <Ticket size={48} className="mx-auto text-bestbet-yellow mb-4 opacity-50" />
            <h3 className="font-bold mb-2">Booking Codes</h3>
            <p className="text-sm text-bestbet-gray-muted mb-4">Save and reload bet slips with booking codes</p>
            <Link href="/booking">
              <Button variant="primary">Load Booking Code</Button>
            </Link>
            <div className="mt-4 space-y-2">
              {bets.filter((b) => b.bookingCode).map((b) => (
                <div key={b.id} className="inline-flex items-center gap-2 bg-[var(--background)] rounded-lg px-4 py-2 mx-1">
                  <code className="font-bold text-bestbet-yellow">{b.bookingCode}</code>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
