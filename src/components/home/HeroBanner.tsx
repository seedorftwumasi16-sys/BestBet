"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { type Promotion } from "@/lib/constants";
import { mockPromotions } from "@/lib/mock-data";
import { contentApi } from "@/lib/api";
import { DEFAULT_PROMOTION_IMAGE, resolvePromotionImage } from "@/lib/promotion-images";
import { POPULAR_LEAGUE_CHIPS } from "@/lib/sports-assets";
import { LeagueLogo } from "@/components/ui/LeagueLogo";
import { HomeHero } from "@/components/home/HomeHero";

export function HeroBanner({
  liveMatchCount = 0,
  todayFixturesCount = 0,
  featuredOdds = 2.85,
}: {
  liveMatchCount?: number;
  todayFixturesCount?: number;
  featuredOdds?: number;
}) {
  return (
    <HomeHero
      liveMatchCount={liveMatchCount}
      todayFixturesCount={todayFixturesCount}
      featuredOdds={featuredOdds}
    />
  );
}

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

const TOP_LEAGUE_CHIPS = POPULAR_LEAGUE_CHIPS;

export function PopularLeagues() {
  return (
    <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 snap-x snap-mandatory">
      {TOP_LEAGUE_CHIPS.map((comp) => (
        <Link
          key={comp.sportsdbId}
          href={`/sports/football?league=${comp.sportsdbId}`}
          className="league-chip group snap-start min-w-[132px] sm:min-w-[148px] md:min-w-[168px]"
        >
          <LeagueLogo sportsdbId={comp.sportsdbId} leagueName={comp.label} alt={comp.label} />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold whitespace-nowrap font-display group-hover:text-bestbet-yellow transition-colors">
              {comp.label}
            </p>
            <p className="text-[10px] sm:text-[11px] text-bestbet-gray-muted">{comp.country}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
