"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { HeroBanner, PromotionCards, PopularLeagues } from "@/components/home/HeroBanner";
import { MatchCard, TrendingBetCard } from "@/components/betting/MatchCard";
import { MatchCardSkeleton } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { betsApi, type MatchApi } from "@/lib/api";
import type { Match } from "@/lib/constants";
import { trendingBets } from "@/lib/mock-data";
import { motion } from "framer-motion";

function toMatch(m: MatchApi): Match {
  return {
    id: m.id,
    homeTeam: { id: m.id + "-h", ...m.homeTeam },
    awayTeam: { id: m.id + "-a", ...m.awayTeam },
    league: m.league,
    leagueId: m.leagueId,
    sport: m.sport,
    startTime: new Date(m.startTime),
    isLive: m.isLive,
    liveMinute: m.liveMinute,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    odds: m.odds,
  };
}

function EmptyMatches({ message }: { message: string }) {
  return (
    <div className="glass-panel rounded-2xl p-8 text-center">
      <p className="text-sm text-bestbet-gray-muted">{message}</p>
    </div>
  );
}

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    betsApi
      .getMatches()
      .then((data) => setMatches(data.map(toMatch)))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, []);

  const liveMatches = matches.filter((m) => m.isLive);
  const featuredMatches = matches.filter((m) => !m.isLive).slice(0, 6);

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="p-4 md:p-6 pb-28 xl:pb-6 space-y-8 max-w-5xl mx-auto"
      >
        <HeroBanner />

        <section aria-labelledby="promotions-heading">
          <SectionHeader id="promotions-heading" title="Promotions" />
          <PromotionCards />
        </section>

        <section aria-labelledby="live-heading">
          <SectionHeader
            id="live-heading"
            title="Live Now"
            live
            actionLabel="View All"
            actionHref="/live"
          />
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <MatchCardSkeleton key={i} />
              ))}
            </div>
          ) : liveMatches.length > 0 ? (
            <div className="space-y-3">
              {liveMatches.map((match) => (
                <MatchCard key={match.id} match={match} showStats />
              ))}
            </div>
          ) : (
            <EmptyMatches message="No live matches right now. Check back soon or browse upcoming fixtures." />
          )}
        </section>

        <section aria-labelledby="leagues-heading">
          <SectionHeader id="leagues-heading" title="Popular Leagues" />
          <PopularLeagues />
        </section>

        <section aria-labelledby="featured-heading">
          <SectionHeader
            id="featured-heading"
            title="Featured Matches"
            actionLabel="All Sports"
            actionHref="/sports/football"
          />
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <MatchCardSkeleton key={i} />
              ))}
            </div>
          ) : featuredMatches.length > 0 ? (
            <div className="space-y-3">
              {featuredMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <EmptyMatches message="No upcoming matches available at the moment." />
          )}
        </section>

        <section aria-labelledby="trending-heading">
          <SectionHeader id="trending-heading" title="Trending Bets" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {trendingBets.map((bet) => (
              <TrendingBetCard key={bet.id} {...bet} />
            ))}
          </div>
        </section>
      </motion.div>
    </MainLayout>
  );
}
