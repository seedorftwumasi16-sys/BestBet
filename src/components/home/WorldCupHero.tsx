"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight, Radio, Trophy } from "lucide-react";
import { heroSlides } from "@/lib/mock-data";
import { padCount, useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";

/** FIFA World Cup 2026 opening match — June 11, 2026 */
const WORLD_CUP_2026_KICKOFF = new Date("2026-06-11T19:00:00Z");

const STADIUM_BG =
  "https://images.unsplash.com/photo-1459865269847-fa384af0a7f3?w=1600&q=80&auto=format&fit=crop";

interface WorldCupHeroProps {
  liveMatchCount?: number;
}

function GoldenTrophy() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
      className="relative flex items-center justify-center"
      aria-hidden="true"
    >
      <div className="wc-trophy-glow absolute inset-0 rounded-full blur-3xl" />
      <div className="wc-trophy-ring absolute h-[85%] w-[85%] rounded-full border border-bestbet-yellow/20" />
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10"
      >
        <svg viewBox="0 0 120 160" className="h-36 w-28 sm:h-44 sm:w-32 md:h-52 md:w-40 drop-shadow-2xl" fill="none">
          <defs>
            <linearGradient id="trophyGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF3A0" />
              <stop offset="35%" stopColor="#FFD700" />
              <stop offset="70%" stopColor="#FFC107" />
              <stop offset="100%" stopColor="#E6A800" />
            </linearGradient>
            <linearGradient id="trophyShine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M38 18 C38 8 82 8 82 18 L82 52 C82 72 62 88 60 88 C58 88 38 72 38 52 Z"
            fill="url(#trophyGold)"
            stroke="#E6C200"
            strokeWidth="1.5"
          />
          <path d="M38 28 C28 28 22 36 22 46 C22 56 30 62 38 58" fill="url(#trophyGold)" stroke="#E6C200" strokeWidth="1" />
          <path d="M82 28 C92 28 98 36 98 46 C98 56 90 62 82 58" fill="url(#trophyGold)" stroke="#E6C200" strokeWidth="1" />
          <rect x="48" y="88" width="24" height="14" rx="2" fill="url(#trophyGold)" />
          <path d="M40 102 H80 L76 118 H44 Z" fill="url(#trophyGold)" stroke="#E6C200" strokeWidth="1" />
          <rect x="34" y="118" width="52" height="10" rx="3" fill="#B8860B" stroke="#FFD700" strokeWidth="1" />
          <ellipse cx="52" cy="40" rx="8" ry="14" fill="url(#trophyShine)" opacity="0.6" />
          <text x="60" y="68" textAnchor="middle" fill="#0A0A0A" fontSize="11" fontWeight="900" fontFamily="Arial,sans-serif">
            26
          </text>
        </svg>
      </motion.div>
    </motion.div>
  );
}

function CountdownUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="wc-countdown-unit flex flex-col items-center min-w-[3rem] sm:min-w-[3.5rem]">
      <span className="text-xl sm:text-2xl md:text-3xl font-black tabular-nums text-bestbet-yellow wc-odds-glow">
        {value}
      </span>
      <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-bestbet-gray-muted mt-0.5">
        {label}
      </span>
    </div>
  );
}

function WorldCup2026Slide({ liveMatchCount }: { liveMatchCount: number }) {
  const countdown = useCountdown(WORLD_CUP_2026_KICKOFF);

  return (
    <div className="relative z-10 flex h-full flex-col justify-between px-5 py-6 sm:px-8 md:px-10 md:py-8 lg:flex-row lg:items-center lg:gap-6">
      <div className="flex-1 max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 flex items-center gap-3"
        >
          <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0">
            <Image
              src="/images/worldcup/wc2026-badge.svg"
              alt="FIFA World Cup 2026"
              fill
              unoptimized
              className="object-contain drop-shadow-[0_0_20px_rgba(255,215,0,0.45)]"
              priority
            />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-bestbet-yellow/30 bg-bestbet-yellow/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-bestbet-yellow">
            <span className="h-1.5 w-1.5 rounded-full bg-bestbet-yellow animate-pulse" />
            Official Host Event
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-black leading-[1.05] tracking-tight text-white"
        >
          <span className="bg-gradient-to-r from-white via-white to-bestbet-yellow/90 bg-clip-text text-transparent">
            FIFA WORLD CUP 2026
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-2 text-sm sm:text-base font-bold tracking-[0.25em] text-bestbet-yellow uppercase"
        >
          USA • CANADA • MEXICO
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-3 max-w-md text-sm sm:text-base leading-relaxed text-white/75"
        >
          The biggest football event in the world is coming.
          <span className="block mt-1 text-white/90 font-medium">
            Bet on every match live only on BestBet.
          </span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-5 flex flex-wrap items-center gap-3"
        >
          <Link href="/sports/football?league=4429" className="wc-hero-cta group inline-flex items-center gap-2">
            Bet Now
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/live"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all hover:border-bestbet-yellow/40 hover:bg-bestbet-yellow/5"
          >
            <Radio size={16} className="text-bestbet-live" />
            {liveMatchCount} Live Now
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="mt-6 wc-countdown-bar rounded-2xl px-4 py-3 sm:px-5 sm:py-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-bestbet-gray-muted mb-2">
            Countdown to Kickoff
          </p>
          <div className="flex items-center gap-2 sm:gap-4">
            <CountdownUnit value={String(countdown.days)} label="Days" />
            <span className="text-bestbet-yellow/50 font-bold">:</span>
            <CountdownUnit value={padCount(countdown.hours)} label="Hours" />
            <span className="text-bestbet-yellow/50 font-bold">:</span>
            <CountdownUnit value={padCount(countdown.minutes)} label="Mins" />
            <span className="text-bestbet-yellow/50 font-bold hidden sm:inline">:</span>
            <span className="hidden sm:contents">
              <CountdownUnit value={padCount(countdown.seconds)} label="Secs" />
            </span>
          </div>
        </motion.div>
      </div>

      <div className="hidden md:flex flex-1 items-center justify-center lg:justify-end pr-4 lg:pr-8">
        <GoldenTrophy />
      </div>

      <div className="flex md:hidden justify-center mt-4 -mb-2">
        <div className="scale-75 origin-center">
          <GoldenTrophy />
        </div>
      </div>
    </div>
  );
}

function SecondarySlide({ slide }: { slide: (typeof heroSlides)[number] }) {
  return (
    <div className="relative z-10 flex h-full flex-col justify-center px-6 sm:px-10 md:px-12">
      {slide.badge && (
        <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-bestbet-yellow/30 bg-bestbet-yellow/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-bestbet-yellow">
          {slide.badge}
        </span>
      )}
      <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight max-w-lg">
        {slide.title}
      </h2>
      <p className="mt-3 max-w-md text-sm sm:text-base text-white/75 leading-relaxed">{slide.subtitle}</p>
      <Link href={slide.href || "/sports/football?league=4429"} className="wc-hero-cta group mt-6 inline-flex w-fit items-center gap-2">
        {slide.cta}
        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}

export function WorldCupHero({ liveMatchCount = 0 }: WorldCupHeroProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % heroSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const slide = heroSlides[current];
  const isWorldCupSlide = slide.id === "wc2026";

  return (
    <div className="wc-hero-shell relative overflow-hidden rounded-2xl border border-bestbet-yellow/20 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{ backgroundImage: `url(${isWorldCupSlide ? STADIUM_BG : slide.background})` }}
          />
          <div className="wc-hero-overlay absolute inset-0" />
          <div className="wc-stadium-lights absolute inset-0 pointer-events-none" />
          <div className="wc-hero-vignette absolute inset-0 pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      <div
        className={cn(
          "relative min-h-[420px] sm:min-h-[460px] md:min-h-[400px] lg:min-h-[420px]",
          isWorldCupSlide ? "md:min-h-[440px]" : "min-h-[320px] sm:min-h-[360px]"
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`slide-${current}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0"
          >
            {isWorldCupSlide ? (
              <WorldCup2026Slide liveMatchCount={liveMatchCount} />
            ) : (
              <SecondarySlide slide={slide} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => setCurrent((c) => (c - 1 + heroSlides.length) % heroSlides.length)}
        className="absolute left-3 top-1/2 z-30 -translate-y-1/2 rounded-full glass-panel p-2.5 text-white transition-all hover:border-bestbet-yellow/50 hover:shadow-[0_0_20px_rgba(255,215,0,0.25)] sm:left-4 sm:p-3"
        aria-label="Previous slide"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => setCurrent((c) => (c + 1) % heroSlides.length)}
        className="absolute right-3 top-1/2 z-30 -translate-y-1/2 rounded-full glass-panel p-2.5 text-white transition-all hover:border-bestbet-yellow/50 hover:shadow-[0_0_20px_rgba(255,215,0,0.25)] sm:right-4 sm:p-3"
        aria-label="Next slide"
      >
        <ChevronRight size={18} />
      </button>

      <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-2">
        {heroSlides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setCurrent(i)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === current
                ? "w-8 bg-bestbet-yellow shadow-[0_0_14px_rgba(255,215,0,0.7)]"
                : "w-1.5 bg-white/30 hover:bg-white/55"
            )}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      <div className="absolute top-4 right-4 z-30 hidden sm:flex items-center gap-2 rounded-full border border-bestbet-yellow/20 bg-black/40 px-3 py-1.5 backdrop-blur-md">
        <Trophy size={14} className="text-bestbet-yellow" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">WC 2026</span>
      </div>
    </div>
  );
}

export { WORLD_CUP_2026_KICKOFF };
