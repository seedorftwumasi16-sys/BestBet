"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Shield,
  Key,
  Users2,
  Trophy,
  Calendar,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  Gift,
  Bell,
  BarChart3,
  FileText,
  Settings,
  Menu,
  X,
  Search,
  ChevronRight,
  Gamepad2,
  MessageSquare,
  Image,
  UserCog,
  Ticket,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ADMIN_SECTIONS, isAdminRole } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";
import {
  AdminUsersSection,
  AdminDepositsSection,
  AdminWithdrawalsSection,
  AdminAuditSection,
  AdminBookingsSection,
  AdminVirtualSection,
  AdminSettingsSection,
  useAdminStats,
} from "@/components/admin/AdminSections";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard, Users, Shield, Key, Users2, Trophy, Calendar,
  TrendingUp, ArrowDownToLine, ArrowUpFromLine, Wallet, Gift,
  Bell, BarChart3, FileText, Settings, Gamepad2, MessageSquare, Image, UserCog, Ticket,
};

const revenueData = [
  { day: "Mon", revenue: 42000, bets: 1200 },
  { day: "Tue", revenue: 38000, bets: 1100 },
  { day: "Wed", revenue: 51000, bets: 1450 },
  { day: "Thu", revenue: 47000, bets: 1300 },
  { day: "Fri", revenue: 62000, bets: 1800 },
  { day: "Sat", revenue: 78000, bets: 2200 },
  { day: "Sun", revenue: 71000, bets: 2000 },
];

const recentActivity = [
  { action: "New user registered", user: "sarah.k@email.com", time: "2 min ago", type: "user" },
  { action: "Large deposit", user: "mike.j@email.com", time: "5 min ago", type: "deposit" },
  { action: "Odds updated", user: "System", time: "8 min ago", type: "odds" },
  { action: "Withdrawal approved", user: "alex.p@email.com", time: "12 min ago", type: "withdrawal" },
  { action: "Match created", user: "Admin", time: "15 min ago", type: "match" },
];

export default function AdminPage() {
  const { user, isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const stats = useAdminStats();

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (!isAdminRole(user?.roleId)) {
      router.replace("/dashboard");
    }
  }, [loading, isLoggedIn, user?.roleId, router]);

  if (loading || !isLoggedIn || !isAdminRole(user?.roleId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bestbet-dark text-bestbet-gray-muted">
        Loading admin panel...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-bestbet-dark">
      {/* Sidebar */}
      <aside
        className={`admin-sidebar fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-bestbet-yellow/10 flex items-center justify-between">
          <Logo variant="horizontal" />
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <X size={20} />
          </button>
        </div>
        <nav className="p-3 space-y-0.5 overflow-y-auto h-[calc(100vh-4rem)]" aria-label="Admin navigation">
          {ADMIN_SECTIONS.map((section) => {
            const Icon = iconMap[section.icon] || LayoutDashboard;
            return (
              <button
                key={section.id}
                onClick={() => { setActiveSection(section.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? "admin-nav-active"
                    : "text-bestbet-gray-muted hover:bg-bestbet-gray/50 hover:text-bestbet-yellow"
                }`}
              >
                <Icon size={18} />
                {section.name}
              </button>
            );
          })}
        </nav>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-bestbet-yellow/10 flex items-center justify-between px-4 lg:px-6 bg-bestbet-dark-secondary">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg hover:bg-bestbet-gray" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-bold capitalize">{activeSection.replace("-", " ")}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-bestbet-gray/80 border border-bestbet-yellow/10 rounded-lg px-3 py-2 focus-within:border-bestbet-yellow/30">
              <Search size={16} className="text-bestbet-gray-muted" />
              <input placeholder="Search..." className="bg-transparent text-sm outline-none w-40" />
            </div>
            <Link href="/">
              <Button variant="outline" size="sm">View Site</Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {activeSection === "dashboard" && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                {[
                  { label: "Total Users", value: stats.totalUsers.toLocaleString() },
                  { label: "Active Users", value: stats.activeUsers.toLocaleString() },
                  { label: "Total Deposits", value: formatCurrency(stats.totalDeposits) },
                  { label: "Withdrawals", value: formatCurrency(stats.totalWithdrawals) },
                  { label: "Total Bets", value: stats.totalBets.toLocaleString() },
                  { label: "Revenue", value: formatCurrency(stats.revenue) },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="stat-card p-4"
                  >
                    <p className="text-xs text-bestbet-gray-muted uppercase tracking-wide">{stat.label}</p>
                    <p className="text-xl font-black mt-1 stat-value">{stat.value}</p>
                    {stat.label.includes("Deposit") && stats.pendingDeposits > 0 && (
                      <p className="text-xs text-bestbet-yellow-secondary mt-1">{stats.pendingDeposits} pending</p>
                    )}
                  </motion.div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="card-premium p-4">
                  <h3 className="text-sm font-bold mb-4 text-bestbet-yellow">Weekly Revenue</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#BDBDBD" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#BDBDBD" }} />
                      <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="revenue" fill="#FFD700" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="card-premium p-4">
                  <h3 className="text-sm font-bold mb-4 text-bestbet-yellow">Daily Bets</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#BDBDBD" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#BDBDBD" }} />
                      <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="bets" stroke="#FFD700" strokeWidth={2} dot={{ fill: "#FFC107" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card-premium">
                <div className="p-4 border-b border-bestbet-yellow/10 flex items-center justify-between">
                  <h3 className="text-sm font-bold">Recent Activity</h3>
                  <button className="text-xs text-bestbet-yellow hover:underline">View All</button>
                </div>
                <div className="divide-y divide-bestbet-yellow/5">
                  {recentActivity.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 hover:bg-bestbet-yellow/5 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{item.action}</p>
                        <p className="text-xs text-bestbet-gray-muted">{item.user}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-bestbet-gray-muted">{item.time}</span>
                        <Badge variant="default">{item.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "users" && <AdminUsersSection />}
          {activeSection === "deposits" && <AdminDepositsSection />}
          {activeSection === "withdrawals" && <AdminWithdrawalsSection />}
          {activeSection === "audit-logs" && <AdminAuditSection />}
          {activeSection === "bookings" && <AdminBookingsSection />}
          {activeSection === "virtual" && <AdminVirtualSection />}
          {activeSection === "settings" && <AdminSettingsSection />}

          {!["dashboard", "users", "deposits", "withdrawals", "audit-logs", "bookings", "virtual", "settings"].includes(activeSection) && (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                {(() => {
                  const section = ADMIN_SECTIONS.find((s) => s.id === activeSection);
                  const Icon = section ? iconMap[section.icon] : LayoutDashboard;
                  return Icon ? <Icon size={48} className="mx-auto text-bestbet-yellow/30 mb-4" /> : null;
                })()}
                <h2 className="text-xl font-bold capitalize mb-2">{activeSection.replace("-", " ")}</h2>
                <p className="text-bestbet-gray-muted text-sm max-w-md">
                  Enterprise {activeSection.replace("-", " ")} management panel. Full CRUD operations, filtering, and export capabilities.
                </p>
                <Button variant="primary" className="mt-4" size="sm">
                  Manage {activeSection.replace("-", " ")} <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
