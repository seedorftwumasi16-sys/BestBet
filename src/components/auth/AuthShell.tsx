"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/brand/Logo";
import { BRAND } from "@/lib/constants";
import { Gift, Shield, Zap, Trophy } from "lucide-react";

interface AuthShellProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  footerText: string;
  footerLinkText: string;
  footerLinkHref: string;
  variant?: "login" | "register";
}

export function AuthShell({
  children,
  title,
  subtitle,
  footerText,
  footerLinkText,
  footerLinkHref,
  variant = "login",
}: AuthShellProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-x-hidden bg-bestbet-dark">
      {/* Left — promotional panel */}
      <div className="relative hidden lg:flex lg:w-[52%] xl:w-[55%] min-h-screen items-center justify-center p-10 xl:p-14 overflow-hidden bg-bestbet-dark-secondary">
        <div className="absolute inset-0 bg-gradient-to-br from-bestbet-yellow/[0.06] via-bestbet-dark to-bestbet-dark" />
        <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-bestbet-yellow/[0.08] blur-3xl" />
        <div className="absolute bottom-1/4 -right-24 h-80 w-80 rounded-full bg-bestbet-yellow-secondary/[0.06] blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#FFD700 1px, transparent 1px), linear-gradient(90deg, #FFD700 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-lg"
        >
          <Logo variant="stacked" showSlogan className="mb-10" />

          {variant === "register" ? (
            <div className="rounded-2xl border border-bestbet-yellow/15 bg-bestbet-gray/40 backdrop-blur-sm p-8 mb-8 auth-glow">
              <Gift size={40} className="text-bestbet-yellow mb-4" />
              <h2 className="text-2xl font-black text-white mb-1">Welcome Bonus</h2>
              <p className="text-3xl font-black text-bestbet-yellow">100% Match</p>
              <p className="text-bestbet-gray-muted mt-2 text-sm">Up to $500 on your first deposit</p>
            </div>
          ) : (
            <p className="text-bestbet-gray-muted text-base leading-relaxed mb-10 max-w-md">
              Join thousands of smart bettors who trust BestBet for premium odds, live betting, and instant payouts.
            </p>
          )}

          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { icon: Shield, label: "Secure", desc: "256-bit SSL" },
              { icon: Zap, label: "Fast", desc: "Instant bets" },
              { icon: Trophy, label: "Premium", desc: "Best odds" },
            ].map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="rounded-xl border border-bestbet-yellow/10 bg-bestbet-gray/30 p-4 text-center transition-colors hover:border-bestbet-yellow/30 hover:bg-bestbet-yellow/5"
              >
                <Icon size={22} className="text-bestbet-yellow mx-auto mb-2" />
                <p className="text-sm font-bold text-white">{label}</p>
                <p className="text-[10px] text-bestbet-gray-muted mt-0.5">{desc}</p>
              </div>
            ))}
          </div>

          <p className="text-lg font-semibold text-white/90">{BRAND.slogan}</p>
        </motion.div>
      </div>

      {/* Right — form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-10 bg-bestbet-dark min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="w-full max-w-full md:max-w-[440px] lg:max-w-[520px]"
        >
          {/* Mobile logo + slogan */}
          <div className="lg:hidden text-center mb-8">
            <Logo variant="stacked" showSlogan className="mx-auto" />
          </div>

          {/* Desktop: logo + slogan above form card */}
          <div className="hidden lg:block text-center mb-8">
            <Logo variant="stacked" showSlogan className="mx-auto scale-90" />
          </div>

          {/* Glassmorphism card */}
          <div className="rounded-2xl border border-bestbet-yellow/15 bg-bestbet-gray/60 backdrop-blur-xl auth-glow shadow-2xl shadow-black/40 p-6 sm:p-8 md:p-10">
            <div className="mb-8 text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{title}</h1>
              <p className="text-sm text-bestbet-gray-muted mt-2">{subtitle}</p>
            </div>

            {children}

            <p className="text-center text-sm text-bestbet-gray-muted mt-8">
              {footerText}{" "}
              <Link
                href={footerLinkHref}
                className="font-bold text-bestbet-yellow hover:underline transition-colors"
              >
                {footerLinkText}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
