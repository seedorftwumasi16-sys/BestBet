"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Radio, TrendingUp, CalendarDays, Zap } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { LeagueLogo } from "@/components/ui/LeagueLogo";
import { formatOdds } from "@/lib/utils";
import { HERO_STADIUM_IMAGE } from "@/lib/hero-assets";
import { POPULAR_LEAGUE_CHIPS } from "@/lib/sports-assets";

export interface HomeHeroProps {
  liveMatchCount?: number;
  todayFixturesCount?: number;
  featuredOdds?: number;
}

function useAnimatedCounter(target: number, durationMs = 1400) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const safeTarget = Math.max(0, Math.floor(target));

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(safeTarget * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

function useAnimatedDecimal(target: number, durationMs = 1400) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const safeTarget = Math.max(0, Number(target) || 0);
    if (safeTarget === 0) {
      setValue(0);
      return;
    }

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(safeTarget * eased * 100) / 100);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

function FloatingOddsCard({
  home,
  away,
  homeOdds,
  drawOdds,
  awayOdds,
  className,
  delay = 0,
}: {
  home: string;
  away: string;
  homeOdds: number;
  drawOdds?: number;
  awayOdds: number;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: [0, -8, 0] }}
      transition={{
        opacity: { duration: 0.5, delay },
        y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay },
      }}
      className={`bb-hero-odds-card pointer-events-none select-none ${className ?? ""}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-bestbet-yellow/90 mb-2">Live Odds</p>
      <p className="text-xs font-semibold text-white truncate mb-2">
        {home} <span className="text-white/40">vs</span> {away}
      </p>
      <div className="flex gap-1.5">
        <span className="bb-hero-odds-pill">1 {formatOdds(homeOdds)}</span>
        {drawOdds != null && <span className="bb-hero-odds-pill">X {formatOdds(drawOdds)}</span>}
        <span className="bb-hero-odds-pill">2 {formatOdds(awayOdds)}</span>
      </div>
    </motion.div>
  );
}

const FLOATING_LEAGUES = POPULAR_LEAGUE_CHIPS.slice(0, 5);

export function HomeHero({
  liveMatchCount = 0,
  todayFixturesCount = 0,
  featuredOdds = 2.85,
}: HomeHeroProps) {
  const liveCount = useAnimatedCounter(liveMatchCount);
  const fixturesCount = useAnimatedCounter(todayFixturesCount);
  const oddsDisplay = useAnimatedDecimal(featuredOdds);

  return (
    <section className="bb-hero relative w-full overflow-hidden" aria-label="BestBet homepage hero">
      <div className="bb-hero-media absolute inset-0">
        <div className="bb-hero-image absolute inset-0 overflow-hidden" aria-hidden>
          <Image
            src={HERO_STADIUM_IMAGE}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_35%]"
            quality={85}
          />
        </div>
      </div>

      <div className="bb-hero-overlay absolute inset-0" aria-hidden />
      <div className="bb-hero-gold-wash absolute inset-0" aria-hidden />
      <div className="bb-hero-lights absolute inset-0 pointer-events-none" aria-hidden />
      <div className="bb-hero-grid absolute inset-0 pointer-events-none opacity-40" aria-hidden />

      {/* Floating decorative elements — desktop / tablet */}
      <div className="absolute inset-0 hidden md:block pointer-events-none overflow-hidden" aria-hidden>
        <FloatingOddsCard
          home="Arsenal"
          away="Chelsea"
          homeOdds={2.1}
          drawOdds={3.4}
          awayOdds={3.2}
          className="absolute right-[8%] top-[18%] w-[168px]"
          delay={0.2}
        />
        <FloatingOddsCard
          home="Real Madrid"
          away="Barcelona"
          homeOdds={2.45}
          drawOdds={3.5}
          awayOdds={2.75}
          className="absolute right-[4%] bottom-[22%] w-[172px] hidden lg:block"
          delay={0.6}
        />

        {FLOATING_LEAGUES.map((league, index) => (
          <motion.div
            key={league.sportsdbId}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.85, y: [0, -6, 0] }}
            transition={{
              opacity: { delay: 0.3 + index * 0.1, duration: 0.5 },
              y: { duration: 4 + index * 0.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.4 },
            }}
            className="bb-hero-league-float absolute"
            style={{
              top: `${14 + index * 12}%`,
              right: `${22 + (index % 2) * 8}%`,
            }}
          >
            <LeagueLogo sportsdbId={league.sportsdbId} leagueName={league.label} alt="" className="w-9 h-9" compact />
          </motion.div>
        ))}

        <motion.span
          animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[6%] top-[20%] text-3xl opacity-20"
        >
          ⚽
        </motion.span>
        <motion.span
          animate={{ y: [0, 10, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute left-[12%] bottom-[28%] text-2xl opacity-15"
        >
          ⚽
        </motion.span>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 md:py-16 lg:py-20">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="mb-4 sm:mb-5"
          >
            <Logo variant="horizontal" className="h-8 sm:h-10 md:h-11 w-auto [&_span]:text-white" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-black text-white leading-[1.08] tracking-tight"
          >
            Bet Smarter.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-bestbet-yellow via-[#ffe566] to-bestbet-yellow-secondary">
              Win Bigger.
            </span>
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-3 sm:mt-4 text-sm sm:text-base text-white/75 max-w-md leading-relaxed"
          >
            Premium football betting with live odds, instant MoMo deposits, and a bet slip built for speed.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-3"
          >
            <Link href="/sports/football" className="bb-hero-cta-primary group inline-flex items-center justify-center gap-2">
              Bet Now
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/live"
              className="bb-hero-cta-secondary inline-flex items-center justify-center gap-2 min-h-[48px]"
            >
              <Radio size={16} className={liveMatchCount > 0 ? "text-bestbet-live animate-pulse" : ""} />
              View Live Matches
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3 }}
            className="mt-8 sm:mt-10 grid grid-cols-3 gap-2 sm:gap-3 max-w-lg"
          >
            <div className="bb-hero-stat">
              <Radio size={16} className="text-bestbet-live mb-1.5" />
              <p className="bb-hero-stat-value tabular-nums">{liveCount}</p>
              <p className="bb-hero-stat-label">Live Matches</p>
            </div>
            <div className="bb-hero-stat">
              <CalendarDays size={16} className="text-bestbet-yellow mb-1.5" />
              <p className="bb-hero-stat-value tabular-nums">{fixturesCount}</p>
              <p className="bb-hero-stat-label">Today&apos;s Fixtures</p>
            </div>
            <div className="bb-hero-stat">
              <TrendingUp size={16} className="text-bestbet-yellow-secondary mb-1.5" />
              <p className="bb-hero-stat-value tabular-nums">{formatOdds(oddsDisplay || featuredOdds)}</p>
              <p className="bb-hero-stat-label">Winning Odds</p>
            </div>
          </motion.div>
        </div>

        {/* Mobile floating odds strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="md:hidden mt-8 flex gap-2 overflow-x-auto no-scrollbar pb-1"
        >
          <div className="bb-hero-odds-card shrink-0 w-[200px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-bestbet-yellow/90 mb-1.5 flex items-center gap-1">
              <Zap size={12} /> Hot Market
            </p>
            <p className="text-xs text-white/90 mb-2">Man City vs Liverpool</p>
            <div className="flex gap-1.5">
              <span className="bb-hero-odds-pill">1 2.05</span>
              <span className="bb-hero-odds-pill">X 3.60</span>
              <span className="bb-hero-odds-pill">2 3.40</span>
            </div>
          </div>
          <div className="bb-hero-odds-card shrink-0 w-[180px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-bestbet-yellow/90 mb-1.5">Featured</p>
            <p className="text-xs text-white/90 mb-2">Top odds up to</p>
            <p className="text-xl font-black text-bestbet-yellow tabular-nums">{formatOdds(featuredOdds)}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
