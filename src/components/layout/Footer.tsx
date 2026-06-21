"use client";

import Link from "next/link";
import { Shield, Mail, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { BRAND, SPORTS } from "@/lib/constants";

const footerLinks = {
  Sports: [
    { label: "Football", href: "/sports/football" },
    { label: "Live Betting", href: "/live" },
    { label: "Virtual Games", href: "/virtual" },
    { label: "Casino", href: "/casino" },
  ],
  Account: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Deposit", href: "/dashboard/deposit" },
    { label: "Withdraw", href: "/dashboard/withdraw" },
    { label: "Register", href: "/register" },
  ],
  Support: [
    { label: "Help Center", href: "#" },
    { label: "Responsible Gaming", href: "#" },
    { label: "Terms & Conditions", href: "#" },
    { label: "Privacy Policy", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-bestbet-dark-secondary">
      <div className="max-w-[1920px] mx-auto px-4 py-10 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Logo showSlogan />
            <p className="text-sm text-bestbet-gray-muted max-w-sm leading-relaxed">
              Premium sportsbook experience with live odds, virtual games, and instant wallet payouts.
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-bestbet-gray-muted">
              <span className="flex items-center gap-1.5">
                <Shield size={14} className="text-bestbet-yellow" /> Licensed & Secure
              </span>
              <span className="flex items-center gap-1.5">
                <Mail size={14} className="text-bestbet-yellow" /> support@bestbet.gh
              </span>
              <span className="flex items-center gap-1.5">
                <Phone size={14} className="text-bestbet-yellow" /> +233 24 568 0115
              </span>
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-bestbet-yellow mb-3">{title}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-bestbet-gray-muted hover:text-bestbet-yellow transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-bestbet-gray-muted">
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved. 18+ only. Gamble responsibly.
          </p>
          <div className="flex flex-wrap gap-2">
            {SPORTS.slice(0, 4).map((sport) => (
              <Link
                key={sport.id}
                href={`/sports/${sport.id}`}
                className="text-lg p-2 rounded-lg bg-bestbet-gray/50 hover:bg-bestbet-yellow/10 hover:scale-110 transition-all"
                aria-label={sport.name}
              >
                {sport.icon}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
