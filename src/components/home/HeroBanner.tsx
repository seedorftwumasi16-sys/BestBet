"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LEAGUES, FOOTBALL_COMPETITIONS, type Promotion } from "@/lib/constants";
import { mockPromotions } from "@/lib/mock-data";
import { contentApi } from "@/lib/api";
import { DEFAULT_PROMOTION_IMAGE, resolvePromotionImage } from "@/lib/promotion-images";
import { getLeagueBadgeUrl } from "@/lib/sports-assets";
import { WorldCupHero } from "@/components/home/WorldCupHero";

export { WorldCupHero };

export function HeroBanner({ liveMatchCount = 0 }: { liveMatchCount?: number }) {
  return <WorldCupHero liveMatchCount={liveMatchCount} />;
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
