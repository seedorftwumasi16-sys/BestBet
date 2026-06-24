"use client";



import { useState, useEffect } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { motion } from "framer-motion";

import {

  LayoutDashboard,

  Users,

  Shield,

  Calendar,

  TrendingUp,

  ArrowDownToLine,

  ArrowUpFromLine,

  Settings,

  Menu,

  X,

  ChevronRight,

  Ticket,

  Wallet,

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

  AdminSettingsSection,

  useAdminStats,

} from "@/components/admin/AdminSections";

import { AdminMatchesSection } from "@/components/admin/AdminMatchesSection";

import { AdminAdminsSection } from "@/components/admin/AdminAdminsSection";

import { AdminBettingHistorySection } from "@/components/admin/AdminBettingHistorySection";
import { AdminBookingCodesSection } from "@/components/admin/AdminBookingCodesSection";
import { AdminBalanceManagementSection } from "@/components/admin/AdminBalanceManagementSection";
import { AdminSportsSyncStatus } from "@/components/admin/AdminSportsSyncStatus";
import { AdminErrorBoundary } from "@/components/admin/AdminErrorBoundary";
import { normalizeAdminStats, safeFormatCount } from "@/lib/admin-utils";



const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {

  LayoutDashboard,

  Users,

  Shield,

  Calendar,

  TrendingUp,

  ArrowDownToLine,

  ArrowUpFromLine,

  Settings,

  Ticket,

  Wallet,

};



const QUICK_ACTIONS = [

  { label: "Manage Admins", section: "admins", icon: Shield },

  { label: "Manage Matches", section: "matches", icon: Calendar },

  { label: "View Deposits", section: "deposits", icon: ArrowDownToLine },

  { label: "View Withdrawals", section: "withdrawals", icon: ArrowUpFromLine },

  { label: "Betting History", section: "betting-history", icon: TrendingUp },

  { label: "Manage Users", section: "users", icon: Users },

];



export default function AdminPage() {

  const { user, isLoggedIn, loading } = useAuth();

  const router = useRouter();

  const [activeSection, setActiveSection] = useState("dashboard");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { stats, statsLoading, statsError, refreshStats } = useAdminStats();



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



  const displayStats = normalizeAdminStats(stats);



  return (

    <div className="min-h-screen flex bg-bestbet-dark">

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

                onClick={() => {

                  setActiveSection(section.id);

                  setSidebarOpen(false);

                }}

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



      <div className="flex-1 flex flex-col min-w-0">

        <header className="h-16 border-b border-bestbet-yellow/10 flex items-center justify-between px-4 lg:px-6 bg-bestbet-dark-secondary">

          <div className="flex items-center gap-3">

            <button

              className="lg:hidden p-2 rounded-lg hover:bg-bestbet-gray"

              onClick={() => setSidebarOpen(true)}

              aria-label="Open sidebar"

            >

              <Menu size={20} />

            </button>

            <h1 className="text-lg font-bold capitalize">{activeSection.replace("-", " ")}</h1>

          </div>

          <Link href="/">

            <Button variant="outline" size="sm">View Site</Button>

          </Link>

        </header>



        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">

          {activeSection === "dashboard" && (
            <AdminErrorBoundary section="Dashboard">
            <div className="space-y-6">

              {statsError && (

                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">

                  {statsError}

                </div>

              )}

              {statsLoading && (

                <p className="text-sm text-bestbet-gray-muted">Loading dashboard stats...</p>

              )}

              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">

                {[

                  { label: "Total Matches", value: safeFormatCount(displayStats.totalMatches) },

                  { label: "Live Matches", value: safeFormatCount(displayStats.liveMatches) },

                  { label: "Total Users", value: safeFormatCount(displayStats.totalUsers) },

                  { label: "Total Bets", value: safeFormatCount(displayStats.totalBets) },

                  { label: "Total Deposits", value: formatCurrency(displayStats.totalDeposits) },

                  { label: "Withdrawals", value: formatCurrency(displayStats.totalWithdrawals) },

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

                    {stat.label.includes("Deposit") && displayStats.pendingDeposits > 0 && (

                      <p className="text-xs text-bestbet-yellow-secondary mt-1">

                        {displayStats.pendingDeposits} pending

                      </p>

                    )}

                  </motion.div>

                ))}

              </div>



              <AdminSportsSyncStatus />



              <div className="card-premium p-5">

                <h3 className="text-sm font-bold mb-4 text-bestbet-yellow">Quick Actions</h3>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">

                  {QUICK_ACTIONS.map(({ label, section, icon: Icon }) => (

                    <button

                      key={section}

                      onClick={() => setActiveSection(section)}

                      className="flex items-center justify-between p-4 rounded-xl border border-bestbet-yellow/10 bg-bestbet-gray/30 hover:border-bestbet-yellow/30 hover:bg-bestbet-yellow/5 transition-colors text-left"

                    >

                      <span className="flex items-center gap-3">

                        <Icon size={18} className="text-bestbet-yellow" />

                        <span className="text-sm font-semibold">{label}</span>

                      </span>

                      <ChevronRight size={16} className="text-bestbet-gray-muted" />

                    </button>

                  ))}

                </div>

              </div>

            </div>
            </AdminErrorBoundary>
          )}



          {activeSection === "admins" && (
            <AdminErrorBoundary section="Manage Admins">
              <AdminAdminsSection />
            </AdminErrorBoundary>
          )}

          {activeSection === "matches" && (
            <AdminErrorBoundary section="Match Management">
              <AdminMatchesSection />
            </AdminErrorBoundary>
          )}

          {activeSection === "users" && (
            <AdminErrorBoundary section="Users">
              <AdminUsersSection />
            </AdminErrorBoundary>
          )}

          {activeSection === "deposits" && (
            <AdminErrorBoundary section="Deposits">
              <AdminDepositsSection />
            </AdminErrorBoundary>
          )}

          {activeSection === "withdrawals" && (
            <AdminErrorBoundary section="Withdrawals">
              <AdminWithdrawalsSection />
            </AdminErrorBoundary>
          )}

          {activeSection === "betting-history" && (
            <AdminErrorBoundary section="Betting History">
              <AdminBettingHistorySection />
            </AdminErrorBoundary>
          )}

          {activeSection === "booking-codes" && (
            <AdminErrorBoundary section="Booking Codes">
              <AdminBookingCodesSection />
            </AdminErrorBoundary>
          )}

          {activeSection === "balance-management" && (
            <AdminErrorBoundary section="Balance Management">
              <AdminBalanceManagementSection />
            </AdminErrorBoundary>
          )}

          {activeSection === "settings" && (
            <AdminErrorBoundary section="Settings">
              <AdminSettingsSection onPlatformReset={refreshStats} />
            </AdminErrorBoundary>
          )}

        </main>

      </div>

    </div>

  );

}


