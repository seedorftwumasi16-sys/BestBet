"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LEAGUES, FOOTBALL_COMPETITIONS, type Promotion } from "@/lib/constants";
import { heroSlides, mockPromotions } from "@/lib/mock-data";
import { contentApi } from "@/lib/api";
import { DEFAULT_PROMOTION_IMAGE, resolvePromotionImage } from "@/lib/promotion-images";
import { getLeagueBadgeUrl } from "@/lib/sports-assets";
import { cn } from "@/lib/utils";

function PromotionCard({ promo }: { promo: Promotion }) {
  const [imgSrc, setImgSrc] = useState(promo.image);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="promo-card-premium flex flex-col h-full min-h-[200px]"
    >
      {promo.badge && (
        <span className="absolute top-3 right-3 z-10 text-[10px] font-extrabold uppercase tracking-wide bg-bestbet-yellow text-bestbet-black px-2 py-0.5 rounded-md shadow-lg">
          {promo.badge}
        </span>
      )}
      <div className="relative z-10 w-14 h-14 mb-3">
        <Image
          src={imgSrc}
          alt={promo.title}
          fill
          unoptimized
          className="object-contain drop-shadow-lg"
          onError={() => setImgSrc(DEFAULT_PROMOTION_IMAGE)}
        />
      </div>
      <h3 className="relative z-10 font-display text-sm font-bold mb-1.5 leading-snug">{promo.title}</h3>
      <p className="relative z-10 text-xs text-bestbet-gray-muted line-clamp-2 flex-1 leading-relaxed">
        {promo.description}
      </p>
      <Button variant="outline" size="sm" className="relative z-10 mt-4 w-full justify-center gap-1">
        {promo.cta}
        <ArrowRight size={14} />
      </Button>
    </motion.div>
  );
}

export function HeroBanner() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = heroSlides[current];

  return (
    <div className="relative rounded-2xl overflow-hidden h-[220px] sm:h-[260px] md:h-[300px] border border-bestbet-yellow/15 shadow-2xl shadow-black/50">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <div
            className="hero-slide"
            style={{ backgroundImage: `url(${slide.background})` }}
          />
          <div className="hero-overlay" />
          <div className="hero-gold-accent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 h-full flex items-center px-6 md:px-10">
        <motion.div
          key={`content-${current}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-md"
        >
          {slide.badge && (
            <span className="inline-block mb-2 text-[10px] font-bold uppercase tracking-widest text-bestbet-yellow bg-bestbet-yellow/10 border border-bestbet-yellow/30 px-2.5 py-1 rounded-full">
              {slide.badge}
            </span>
          )}
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 leading-tight">
            {slide.title}
          </h1>
          <p className="text-sm md:text-base text-white/75 mb-5 max-w-sm leading-relaxed">{slide.subtitle}</p>
          <Link href={slide.href || "/live"}>
            <Button variant="primary" size="md" className="shadow-lg shadow-bestbet-yellow/20">
              {slide.cta}
            </Button>
          </Link>
        </motion.div>
      </div>

      <button
        onClick={() => setCurrent((c) => (c - 1 + heroSlides.length) % heroSlides.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full glass-panel text-white hover:border-bestbet-yellow/40 transition-all"
        aria-label="Previous slide"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => setCurrent((c) => (c + 1) % heroSlides.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full glass-panel text-white hover:border-bestbet-yellow/40 transition-all"
        aria-label="Next slide"
      >
        <ChevronRight size={18} />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === current ? "w-8 bg-bestbet-yellow shadow-[0_0_12px_rgba(255,215,0,0.6)]" : "w-1.5 bg-white/30 hover:bg-white/50"
            )}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export function PromotionCards() {
  const [promotions, setPromotions] = useState<Promotion[]>(mockPromotions);

  useEffect(() => {
    contentApi
      .getPromotions()
      .then((data) => {
        if (data.length) {
          setPromotions(
            data.map((p) => ({
              id: String((p as { id: string }).id),
              title: String((p as { title: string }).title),
              description: String((p as { description: string }).description),
              image: resolvePromotionImage(String((p as { id: string }).id), (p as { image?: string }).image),
              cta: String((p as { cta?: string }).cta || "Claim"),
              badge: (p as { badge?: string }).badge,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {promotions.slice(0, 3).map((promo) => (
        <PromotionCard key={promo.id} promo={promo} />
      ))}
    </div>
  );
}

export function PopularLeagues() {
  const chips = FOOTBALL_COMPETITIONS.filter((c) => c.id !== "all").slice(0, 8);

  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
      {chips.map((comp) => {
        const meta = LEAGUES.find((l) => "sportsdbId" in l && l.sportsdbId === comp.id);
        return (
          <Link
            key={comp.id}
            href={`/sports/football?league=${comp.id}`}
            className="league-chip group"
          >
            <div className="relative w-10 h-10 shrink-0">
              <Image
                src={getLeagueBadgeUrl(meta?.id ?? comp.id)}
                alt={comp.label}
                fill
                unoptimized
                className="object-contain group-hover:scale-110 transition-transform"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold whitespace-nowrap font-display">{comp.label}</p>
              <p className="text-[11px] text-bestbet-gray-muted">{meta?.country ?? "Football"}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
