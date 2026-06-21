"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight, Radio } from "lucide-react";
import { heroSlides } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface HomeHeroProps {
  liveMatchCount?: number;
}

function HeroSlide({ slide, liveMatchCount }: { slide: (typeof heroSlides)[number]; liveMatchCount: number }) {
  return (
    <div className="relative z-10 flex h-full flex-col justify-center px-6 sm:px-10 md:px-12">
      {slide.badge && (
        <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-bestbet-yellow/30 bg-bestbet-yellow/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-bestbet-yellow">
          {slide.badge}
        </span>
      )}
      <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight max-w-xl">
        {slide.title}
      </h2>
      <p className="mt-3 max-w-lg text-sm sm:text-base text-white/75 leading-relaxed">{slide.subtitle}</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href={slide.href || "/sports/football"} className="wc-hero-cta group inline-flex w-fit items-center gap-2">
          {slide.cta}
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Link>
        {liveMatchCount > 0 && (
          <Link
            href="/live"
            className="inline-flex items-center gap-2 rounded-xl border border-bestbet-live/40 bg-bestbet-live/10 px-4 py-2.5 text-xs font-bold text-bestbet-live transition-colors hover:bg-bestbet-live/20"
          >
            <Radio size={14} className="animate-pulse" />
            {liveMatchCount} Live Now
          </Link>
        )}
      </div>
    </div>
  );
}

export function HomeHero({ liveMatchCount = 0 }: HomeHeroProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % heroSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const slide = heroSlides[current];

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
            style={{ backgroundImage: `url(${slide.background})` }}
          />
          <div className="wc-hero-overlay absolute inset-0" />
          <div className="wc-stadium-lights absolute inset-0 pointer-events-none" />
          <div className="wc-hero-vignette absolute inset-0 pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      <div className="relative min-h-[320px] sm:min-h-[360px] md:min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`slide-${current}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0"
          >
            <HeroSlide slide={slide} liveMatchCount={liveMatchCount} />
          </motion.div>
        </AnimatePresence>
      </div>

      {heroSlides.length > 1 && (
        <>
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
        </>
      )}
    </div>
  );
}
