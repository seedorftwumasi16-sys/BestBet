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
  Radio,
  Gamepad2,
  Dices,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useBetSlip } from "@/context/BetSlipContext";
import { formatCurrency, cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/sports/football", label: "Football", match: (p: string) => p.startsWith("/sports/football") },
  { href: "/sports/basketball", label: "Basketball", match: (p: string) => p.startsWith("/sports/basketball") },
  { href: "/live", label: "Live", match: (p: string) => p === "/live", live: true },
  { href: "/virtual", label: "Virtual", match: (p: string) => p === "/virtual" },
  { href: "/casino", label: "Casino", match: (p: string) => p === "/casino" },
];

export function Header() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, isLoggedIn, notifications, unreadCount, logout } = useAuth();
  const { selections } = useBetSlip();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-header">
      <div className="max-w-[1920px] mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-16 gap-3">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-white/5 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Logo />
          </div>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Sports navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "nav-link font-display text-[13px]",
                  link.match(pathname) && "nav-link-active",
                  link.live && !link.match(pathname) && "text-bestbet-live hover:text-bestbet-live"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
              aria-label="Search"
            >
              <Search size={18} />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl glass-panel hover:border-bestbet-yellow/30 transition-all"
                >
                  <Wallet size={15} className="text-bestbet-yellow" />
                  <span className="text-sm font-bold tabular-nums">{formatCurrency(user!.balance)}</span>
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="relative p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                    aria-label="Notifications"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-bestbet-yellow text-bestbet-black text-[9px] font-extrabold rounded-full flex items-center justify-center">
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
                        className="absolute right-0 top-full mt-2 w-80 glass-panel rounded-2xl shadow-2xl overflow-hidden z-50"
                      >
                        <div className="p-3.5 border-b border-white/5 font-display font-semibold text-sm">
                          Notifications
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <p className="p-4 text-sm text-bestbet-gray-muted text-center">No notifications</p>
                          ) : (
                            notifications.map((n) => (
                              <div
                                key={n.id}
                                className={cn(
                                  "p-3.5 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors",
                                  !n.read && "bg-bestbet-yellow/5"
                                )}
                              >
                                <p className="text-sm font-medium">{n.title}</p>
                                <p className="text-xs text-bestbet-gray-muted mt-0.5">{n.message}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center p-1 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-bestbet-yellow to-bestbet-yellow-secondary flex items-center justify-center text-bestbet-black font-extrabold text-sm ring-2 ring-bestbet-yellow/30 shadow-[0_0_16px_rgba(255,215,0,0.3)]">
                      {user!.name.charAt(0)}
                    </div>
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 top-full mt-2 w-52 glass-panel rounded-2xl shadow-2xl overflow-hidden z-50"
                      >
                        <div className="p-3.5 border-b border-white/5">
                          <p className="text-sm font-semibold truncate">{user!.name}</p>
                          <p className="text-xs text-bestbet-gray-muted truncate">{user!.email}</p>
                        </div>
                        <Link href="/dashboard" className="flex items-center gap-2 px-3.5 py-2.5 text-sm hover:bg-white/5 transition-colors">
                          <User size={16} /> Dashboard
                        </Link>
                        <Link href="/dashboard/settings" className="flex items-center gap-2 px-3.5 py-2.5 text-sm hover:bg-white/5 transition-colors">
                          <Settings size={16} /> Settings
                        </Link>
                        <button
                          onClick={logout}
                          className="flex items-center gap-2 px-3.5 py-2.5 text-sm hover:bg-white/5 w-full text-bestbet-danger transition-colors"
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
              <span className="lg:hidden min-w-[20px] h-5 px-1.5 bg-bestbet-yellow text-bestbet-black text-[10px] font-extrabold rounded-full flex items-center justify-center">
                {selections.length}
              </span>
            )}
          </div>
        </div>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/5"
            >
              <div className="py-3">
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bestbet-gray-muted" />
                  <input
                    type="search"
                    placeholder="Search teams, leagues, matches..."
                    className="w-full pl-11 pr-4 py-3 glass-panel rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-bestbet-yellow/40 placeholder:text-bestbet-gray-muted"
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
            className="lg:hidden border-t border-white/5 overflow-hidden"
            aria-label="Mobile sports navigation"
          >
            <div className="px-4 py-3 grid grid-cols-2 gap-2">
              {[
                { href: "/sports/football", label: "Football", icon: null },
                { href: "/live", label: "Live", icon: Radio },
                { href: "/virtual", label: "Virtual", icon: Gamepad2 },
                { href: "/casino", label: "Casino", icon: Dices },
              ].map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-3 text-sm font-medium rounded-xl transition-all",
                      active
                        ? "bg-bestbet-yellow/15 text-bestbet-yellow border border-bestbet-yellow/30"
                        : "glass-panel hover:border-bestbet-yellow/20"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {Icon && <Icon size={16} />}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
