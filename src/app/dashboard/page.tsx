"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { betsApi, walletsApi, type BetHistoryItem, type TransactionApi } from "@/lib/api";
import { ContactInfo } from "@/components/layout/ContactInfo";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const chartData = [
  { month: "Jan", profit: 120, bets: 45 },
  { month: "Feb", profit: 280, bets: 62 },
  { month: "Mar", profit: -50, bets: 38 },
  { month: "Apr", profit: 420, bets: 71 },
  { month: "May", profit: 350, bets: 58 },
  { month: "Jun", profit: 510, bets: 83 },
];

const tabs = ["Overview", "Active Bets", "History", "Transactions", "Booking Codes"] as const;

export default function DashboardPage() {
  const { user, isLoggedIn, notifications } = useAuth();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  const [bets, setBets] = useState<BetHistoryItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionApi[]>([]);

  useEffect(() => {
    if (isLoggedIn) {
      betsApi.getHistory().then(setBets).catch(() => {});
      walletsApi.getTransactions().then(setTransactions).catch(() => {});
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Please log in</h2>
            <p className="text-bestbet-gray-muted mb-4">Access your dashboard by logging in</p>
            <a href="/login">
              <Button variant="primary">Log In</Button>
            </a>
          </div>
        </div>
      </MainLayout>
    );
  }

  const activeBets = bets.filter((b) => b.status === "pending");
  const wonBets = bets.filter((b) => b.status === "won");

  const handleCashout = async (betId: string) => {
    await betsApi.cashout(betId);
    const updated = await betsApi.getHistory();
    setBets(updated);
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black">Dashboard</h1>
              <p className="text-sm text-bestbet-gray-muted">Welcome back, {user!.name}</p>
            </div>
            <div className="flex gap-2">
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
              { label: "Wallet Balance", value: formatCurrency(user!.balance), icon: Wallet, color: "text-bestbet-yellow" },
              { label: "Active Bets", value: activeBets.length.toString(), icon: TrendingUp, color: "text-blue-400" },
              { label: "Won Bets", value: wonBets.length.toString(), icon: Trophy, color: "text-bestbet-success" },
              { label: "Notifications", value: notifications.filter((n) => !n.read).length.toString(), icon: Bell, color: "text-orange-400" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ y: -2 }}
                className="stat-card p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <stat.icon size={20} className={stat.color} />
                </div>
                <p className="text-xl font-black">{stat.value}</p>
                <p className="text-xs text-bestbet-gray-muted mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-[var(--border)]">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab
                    ? "text-bestbet-yellow border-bestbet-yellow"
                    : "text-bestbet-gray-muted border-transparent hover:text-[var(--foreground)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </FadeIn>

        {activeTab === "Overview" && (
          <FadeIn delay={0.2}>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
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

              <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
                <h3 className="text-sm font-bold mb-4">Recent Notifications</h3>
                <div className="space-y-3">
                  {notifications.slice(0, 4).map((n) => (
                    <div key={n.id} className={`p-3 rounded-lg ${!n.read ? "bg-bestbet-yellow/5 border border-bestbet-yellow/10" : "bg-[var(--background)]"}`}>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-bestbet-gray-muted mt-0.5">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              <ContactInfo variant="card" className="md:col-span-2" />
            </div>
          </FadeIn>
        )}

        {activeTab === "Active Bets" && (
          <div className="space-y-3">
            {activeBets.map((bet) => (
              <motion.div
                key={bet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="stat-card p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{bet.type.toUpperCase()}</Badge>
                    <Badge variant="warning">{bet.status}</Badge>
                  </div>
                  {bet.bookingCode && (
                    <code className="text-xs font-bold text-bestbet-yellow">{bet.bookingCode}</code>
                  )}
                </div>
                {bet.selections.map((sel) => (
                  <div key={sel.id} className="flex justify-between text-sm py-1.5 border-b border-[var(--border)] last:border-0">
                    <div>
                      <p className="font-medium">{sel.selection}</p>
                      <p className="text-xs text-bestbet-gray-muted">{sel.market}</p>
                    </div>
                    <span className="font-bold text-bestbet-yellow">{sel.odds.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between mt-3 pt-3 border-t border-[var(--border)]">
                  <div>
                    <p className="text-xs text-bestbet-gray-muted">Stake</p>
                    <p className="font-bold">{formatCurrency(bet.stake)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-bestbet-gray-muted">Potential Win</p>
                    <p className="font-bold text-bestbet-yellow">{formatCurrency(bet.potentialWin)}</p>
                  </div>
                </div>
                {bet.cashoutAvailable && bet.cashoutValue && (
                  <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => handleCashout(bet.id)}>
                    Cash Out {formatCurrency(bet.cashoutValue)}
                  </Button>
                )}
              </motion.div>
            ))}
            {activeBets.length === 0 && <p className="text-center text-bestbet-gray-muted py-8">No active bets</p>}
          </div>
        )}

        {activeTab === "History" && (
          <div className="space-y-3">
            {bets.map((bet) => (
              <div key={bet.id} className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
                <div className="flex justify-between">
                  <Badge variant={bet.status === "won" ? "success" : bet.status === "lost" ? "danger" : "default"}>{bet.status}</Badge>
                  <span className="text-xs text-bestbet-gray-muted">{bet.placedAt}</span>
                </div>
                <p className="text-sm mt-2">Stake: {formatCurrency(bet.stake)} → Win: {formatCurrency(bet.potentialWin)}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Transactions" && (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  {tx.type === "deposit" ? (
                    <ArrowDownToLine size={18} className="text-bestbet-success" />
                  ) : (
                    <ArrowUpFromLine size={18} className="text-orange-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium capitalize">{tx.type}</p>
                    <p className="text-xs text-bestbet-gray-muted">{tx.method}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.type === "deposit" ? "text-bestbet-success" : ""}`}>
                    {tx.type === "deposit" ? "+" : "-"}{formatCurrency(tx.amount)}
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
          <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)] text-center">
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
