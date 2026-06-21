"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ContactInfo } from "@/components/layout/ContactInfo";
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
    { label: "Contact Us", href: "/contact" },
    { label: "Help Center", href: "/dashboard" },
    { label: "Responsible Gaming", href: "#" },
    { label: "Terms & Conditions", href: "#" },
    { label: "Privacy Policy", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-bestbet-dark-secondary">
      <div className="max-w-[1920px] mx-auto px-3 sm:px-4 py-6 sm:py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          <div className="lg:col-span-2 space-y-5">
            <Logo showSlogan />
            <p className="text-sm text-bestbet-gray-muted max-w-sm leading-relaxed">
              Premium sportsbook experience with live odds, virtual games, and instant wallet payouts.
            </p>
            <span className="inline-flex items-center gap-2 rounded-full border border-bestbet-yellow/20 bg-bestbet-yellow/5 px-3 py-1.5 text-xs text-bestbet-gray-muted">
              <Shield size={14} className="text-bestbet-yellow shrink-0" />
              Licensed & Secure
            </span>
            <ContactInfo variant="footer" />
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-bestbet-yellow mb-3">{title}</h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
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
          <p className="text-xs text-bestbet-gray-muted text-center sm:text-left">
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved. 18+ only. Gamble responsibly.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
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
