"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BRAND, LEAGUES, type Promotion } from "@/lib/constants";
import { heroSlides, mockPromotions } from "@/lib/mock-data";
import { contentApi } from "@/lib/api";

export function HeroBanner() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = heroSlides[current];

  return (
    <div className="relative rounded-2xl overflow-hidden h-48 md:h-56 lg:h-64 border border-bestbet-yellow/10 yellow-glow">
      <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} flex items-center transition-opacity duration-500`}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-bestbet-yellow/10 to-transparent" />
        <div className="relative z-10 px-6 md:px-10 max-w-lg">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2">{slide.title}</h2>
          <p className="text-sm md:text-base text-white/80 mb-4">{slide.subtitle}</p>
          <Button variant="primary" size="md">{slide.cta}</Button>
        </div>
      </div>

      <button
        onClick={() => setCurrent((c) => (c - 1 + heroSlides.length) % heroSlides.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        aria-label="Previous slide"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => setCurrent((c) => (c + 1) % heroSlides.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        aria-label="Next slide"
      >
        <ChevronRight size={20} />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-bestbet-yellow w-6" : "bg-white/40"}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      <div className="absolute bottom-4 right-6 z-20 hidden md:block">
        <p className="text-xs text-white/60 font-medium">{BRAND.slogan}</p>
      </div>
    </div>
  );
}

export function PromotionCards() {
  const [promotions, setPromotions] = useState<Promotion[]>(mockPromotions);

  useEffect(() => {
    contentApi.getPromotions().then((data) => {
      if (data.length) {
        setPromotions(
          data.map((p) => ({
            id: String((p as { id: string }).id),
            title: String((p as { title: string }).title),
            description: String((p as { description: string }).description),
            image: String((p as { image?: string }).image || "🎁"),
            cta: String((p as { cta?: string }).cta || "Claim"),
            badge: (p as { badge?: string }).badge,
          }))
        );
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {promotions.map((promo) => (
        <div
          key={promo.id}
          className="card-premium p-4 cursor-pointer hover:-translate-y-1 group relative overflow-hidden"
        >
          {promo.badge && (
            <span className="absolute top-2 right-2 text-[10px] font-bold bg-bestbet-yellow text-bestbet-black px-1.5 py-0.5 rounded">
              {promo.badge}
            </span>
          )}
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{promo.image}</div>
          <h3 className="text-sm font-bold mb-1">{promo.title}</h3>
          <p className="text-xs text-bestbet-gray-muted line-clamp-2">{promo.description}</p>
          <span className="text-xs font-bold text-bestbet-yellow mt-2 inline-block group-hover:underline">
            {promo.cta} →
          </span>
        </div>
      ))}
    </div>
  );
}

export function PopularLeagues() {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
      {LEAGUES.map((league) => (
        <a
          key={league.id}
          href={`/leagues/${league.id}`}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 card-premium hover:border-bestbet-yellow/40 transition-colors"
        >
          <span className="text-lg">
            {league.sport === "football" ? "⚽" : league.sport === "basketball" ? "🏀" : "🏆"}
          </span>
          <div>
            <p className="text-sm font-semibold whitespace-nowrap">{league.name}</p>
            <p className="text-[10px] text-bestbet-gray-muted">{league.country}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
