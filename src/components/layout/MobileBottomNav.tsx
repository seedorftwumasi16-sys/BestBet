"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radio, Ticket, User, Dices } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBetSlip } from "@/context/BetSlipContext";

const navItems = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/live", label: "Live", icon: Radio, match: (p: string) => p === "/live" },
  { href: "/sports/football", label: "Sports", icon: Ticket, match: (p: string) => p.startsWith("/sports") },
  { href: "/casino", label: "Casino", icon: Dices, match: (p: string) => p === "/casino" || p === "/virtual" },
  { href: "/dashboard", label: "Account", icon: User, match: (p: string) => p.startsWith("/dashboard") },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { selections } = useBetSlip();

  return (
    <nav
      className="xl:hidden fixed bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 z-50 safe-area-bottom"
      aria-label="Mobile navigation"
    >
      <div className="floating-nav flex items-center justify-around h-14 sm:h-[3.75rem] px-1 sm:px-2">
        {navItems.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1 rounded-lg transition-all duration-200",
                isActive ? "nav-tab-active" : "text-bestbet-gray-muted hover:text-white"
              )}
            >
              <span
                className={cn(
                  "nav-tab-icon flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-all duration-200",
                  isActive && "nav-tab-icon"
                )}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold font-display leading-none truncate max-w-full px-0.5">
                {item.label}
              </span>
              {item.label === "Sports" && selections.length > 0 && (
                <span className="absolute top-0 right-0.5 sm:right-1 min-w-[14px] h-3.5 px-1 bg-bestbet-yellow text-bestbet-black text-[8px] font-extrabold rounded-full flex items-center justify-center">
                  {selections.length}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
