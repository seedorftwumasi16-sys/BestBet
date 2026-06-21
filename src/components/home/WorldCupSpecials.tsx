"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Zap } from "lucide-react";
import { formatOdds } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface WorldCupSpecial {
  id: string;
  market: string;
  selection: string;
  boostedOdds: number;
  wasOdds: number;
  badge?: string;
}

export const WORLD_CUP_SPECIALS: WorldCupSpecial[] = [
  {
    id: "wcs1",
    market: "Outright Winner",
    selection: "Brazil — World Cup 2026",
    boostedOdds: 6.5,
    wasOdds: 7.25,
    badge: "BOOST",
  },
  {
    id: "wcs2",
    market: "To Reach Final",
    selection: "Argentina",
    boostedOdds: 3.4,
    wasOdds: 3.85,
    badge: "HOT",
  },
  {
    id: "wcs3",
    market: "Host Nation",
    selection: "USA — Semi-Finals",
    boostedOdds: 4.2,
    wasOdds: 4.75,
  },
  {
    id: "wcs4",
    market: "Golden Boot",
    selection: "Kylian Mbappé",
    boostedOdds: 8.0,
    wasOdds: 9.5,
    badge: "BOOST",
  },
  {
    id: "wcs5",
    market: "Group Winner",
    selection: "France — Group I",
    boostedOdds: 1.72,
    wasOdds: 1.95,
  },
  {
    id: "wcs6",
    market: "Both Teams to Score",
    selection: "Mexico vs Canada — Opener",
    boostedOdds: 1.88,
    wasOdds: 2.1,
    badge: "NEW",
  },
];

function SpecialCard({ special, index }: { special: WorldCupSpecial; index: number }) {
  const boostPct = Math.round(((special.wasOdds - special.boostedOdds) / special.wasOdds) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      className="wc-special-card group relative overflow-hidden rounded-2xl p-4 flex flex-col h-full"
    >
      {special.badge && (
        <span className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-md bg-bestbet-yellow px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-bestbet-black">
          <Zap size={10} />
          {special.badge}
        </span>
      )}

      <p className="text-[10px] font-bold uppercase tracking-widest text-bestbet-yellow-secondary mb-1">
        {special.market}
      </p>
      <p className="font-display text-sm font-bold leading-snug text-white flex-1 pr-8">{special.selection}</p>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] text-bestbet-gray-muted line-through">{formatOdds(special.wasOdds)}</p>
          <p className="text-2xl font-black text-bestbet-yellow tabular-nums wc-odds-glow">
            {formatOdds(special.boostedOdds)}
          </p>
        </div>
        <span className="rounded-lg bg-bestbet-success/15 border border-bestbet-success/30 px-2 py-1 text-[10px] font-bold text-bestbet-success">
          +{boostPct}%
        </span>
      </div>

      <Link
        href="/sports/football?league=4429"
        className={cn(
          "mt-4 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold",
          "bg-bestbet-yellow/10 border border-bestbet-yellow/25 text-bestbet-yellow",
          "transition-all duration-300 group-hover:bg-bestbet-yellow group-hover:text-bestbet-black group-hover:shadow-[0_0_24px_rgba(255,215,0,0.35)]"
        )}
      >
        Bet Now
        <ArrowRight size={14} />
      </Link>
    </motion.div>
  );
}

export function WorldCupSpecials() {
  return (
    <section aria-labelledby="wc-specials-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="wc-specials-heading"
          className="flex items-center gap-2.5 font-display text-base md:text-lg font-bold tracking-tight text-white"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-bestbet-yellow/15 border border-bestbet-yellow/30">
            <TrendingUp size={16} className="text-bestbet-yellow" />
          </span>
          World Cup Specials
        </h2>
        <Link
          href="/sports/football?league=4429"
          className="flex items-center gap-0.5 text-xs font-semibold text-bestbet-yellow hover:underline"
        >
          All WC Markets
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {WORLD_CUP_SPECIALS.map((special, i) => (
          <SpecialCard key={special.id} special={special} index={i} />
        ))}
      </div>
    </section>
  );
}
