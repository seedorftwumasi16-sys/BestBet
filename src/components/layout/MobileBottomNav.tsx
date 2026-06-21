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
      className="xl:hidden fixed bottom-0 left-0 right-0 z-50 bg-bestbet-dark/95 border-t border-[var(--border)] backdrop-blur-md safe-area-bottom"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
                isActive ? "mobile-nav-active text-bestbet-yellow" : "text-bestbet-gray-muted hover:text-bestbet-yellow"
              )}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.label === "Sports" && selections.length > 0 && (
                <span className="absolute -top-0.5 right-1 w-4 h-4 bg-bestbet-yellow text-bestbet-black text-[9px] font-bold rounded-full flex items-center justify-center">
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
