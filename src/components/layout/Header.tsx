"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  Sun,
  Moon,
  Wallet,
  Menu,
  X,
  LogOut,
  User,
  Settings,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useBetSlip } from "@/context/BetSlipContext";
import { formatCurrency, cn } from "@/lib/utils";
import { SPORTS } from "@/lib/constants";

export function Header() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, isLoggedIn, notifications, unreadCount, logout } = useAuth();
  const { selections } = useBetSlip();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navLinks = [
    ...SPORTS.slice(0, 5).map((sport) => ({
      href: `/sports/${sport.id}`,
      label: sport.name,
      icon: sport.icon,
      active: pathname.startsWith(`/sports/${sport.id}`),
    })),
    { href: "/live", label: "Live", icon: "🔴", active: pathname === "/live", live: true },
    { href: "/virtual", label: "Virtual", icon: "🎮", active: pathname === "/virtual" },
    { href: "/casino", label: "Casino", icon: "🎰", active: pathname === "/casino" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[var(--header-bg)]/95 border-b border-[var(--border)] backdrop-blur-md">
      <div className="max-w-[1920px] mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Logo showSlogan />
          </div>

          <nav className="hidden lg:flex items-center gap-0.5" aria-label="Sports navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "nav-link",
                  link.active && "nav-link-active",
                  link.live && !link.active && "text-bestbet-live font-bold hover:text-bestbet-live"
                )}
              >
                <span className="mr-1">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
              aria-label="Search"
            >
              <Search size={20} />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--card)] hover:bg-[var(--card-hover)] transition-colors"
                >
                  <Wallet size={16} className="text-bestbet-yellow" />
                  <span className="text-sm font-bold">{formatCurrency(user!.balance)}</span>
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="relative p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-bestbet-yellow text-bestbet-black text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {notifOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-80 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden z-50"
                      >
                        <div className="p-3 border-b border-[var(--border)] font-semibold text-sm">
                          Notifications
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                          {notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`p-3 border-b border-[var(--border)] hover:bg-[var(--card-hover)] cursor-pointer ${!n.read ? "bg-bestbet-yellow/5" : ""}`}
                            >
                              <p className="text-sm font-medium">{n.title}</p>
                              <p className="text-xs text-bestbet-gray-muted mt-0.5">{n.message}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--card)] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-bestbet-yellow flex items-center justify-center text-bestbet-black font-bold text-sm">
                      {user!.name.charAt(0)}
                    </div>
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden z-50"
                      >
                        <div className="p-3 border-b border-[var(--border)]">
                          <p className="text-sm font-semibold">{user!.name}</p>
                          <p className="text-xs text-bestbet-gray-muted">{user!.email}</p>
                        </div>
                        <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--card-hover)]">
                          <User size={16} /> Dashboard
                        </Link>
                        <Link href="/dashboard/settings" className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--card-hover)]">
                          <Settings size={16} /> Settings
                        </Link>
                        <button
                          onClick={logout}
                          className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--card-hover)] w-full text-bestbet-danger"
                        >
                          <LogOut size={16} /> Log Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">Log In</Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">Register</Button>
                </Link>
              </div>
            )}

            {selections.length > 0 && (
              <Link href="/" className="lg:hidden relative p-2">
                <Badge variant="new">{selections.length}</Badge>
              </Link>
            )}
          </div>
        </div>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-[var(--border)]"
            >
              <div className="py-3">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-bestbet-gray-muted" />
                  <input
                    type="search"
                    placeholder="Search teams, leagues, matches..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bestbet-yellow/50"
                    autoFocus
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden border-t border-[var(--border)] overflow-hidden"
            aria-label="Mobile sports navigation"
          >
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {[...SPORTS.map((sport) => ({ href: `/sports/${sport.id}`, label: `${sport.icon} ${sport.name}` })),
                { href: "/live", label: "🔴 Live" },
                { href: "/virtual", label: "🎮 Virtual" },
                { href: "/casino", label: "🎰 Casino" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 text-sm rounded-lg transition-colors",
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "bg-bestbet-yellow/15 text-bestbet-yellow border border-bestbet-yellow/30"
                      : "bg-[var(--card)] hover:bg-bestbet-yellow/10 hover:text-bestbet-yellow"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
