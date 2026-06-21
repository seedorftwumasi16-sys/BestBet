"use client";

import { useEffect, useState, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { HeroBanner, PromotionCards, PopularLeagues } from "@/components/home/HeroBanner";
import { MatchCard, TrendingBetCard } from "@/components/betting/MatchCard";
import { betsApi, contentApi, type MatchApi } from "@/lib/api";
import type { Match } from "@/lib/constants";
import { trendingBets } from "@/lib/mock-data";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";

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
  const featuredMatches = matches.filter((m) => !m.isLive);

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <HeroBanner />
        <section aria-labelledby="promotions-heading" className="mt-6">
          <h2 id="promotions-heading" className="section-heading mb-3">
            Promotions
          </h2>
          <PromotionCards />
        </section>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {liveMatches.length > 0 && (
              <section aria-labelledby="live-heading" className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 id="live-heading" className="section-heading text-bestbet-live">
                    <span className="w-2 h-2 rounded-full bg-bestbet-live live-pulse" /> Live Now
                  </h2>
                  <Link href="/live" className="text-xs font-bold text-bestbet-yellow hover:underline">
                    View All →
                  </Link>
                </div>
                <div className="space-y-3">
                  {liveMatches.map((match) => (
                    <MatchCard key={match.id} match={match} showStats />
                  ))}
                </div>
              </section>
            )}
            <section aria-labelledby="leagues-heading" className="mt-6">
              <h2 id="leagues-heading" className="section-heading mb-3">
                Popular Leagues
              </h2>
              <PopularLeagues />
            </section>
            <section aria-labelledby="featured-heading" className="mt-6">
              <h2 id="featured-heading" className="section-heading mb-3">
                Featured Matches
              </h2>
              <div className="space-y-3">
                {featuredMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </section>
          </>
        )}
        <section aria-labelledby="trending-heading" className="mt-6">
          <h2 id="trending-heading" className="section-heading mb-3">
            Trending Bets
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {trendingBets.map((bet) => (
              <TrendingBetCard key={bet.id} {...bet} />
            ))}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
