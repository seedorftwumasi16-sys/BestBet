"use client";



import { useCallback, useEffect, useState } from "react";

import { MainLayout } from "@/components/layout/MainLayout";

import { HeroBanner, PromotionCards, PopularLeagues } from "@/components/home/HeroBanner";

import { MatchCard, TrendingBetCard } from "@/components/betting/MatchCard";

import { MatchCardSkeleton } from "@/components/ui/Skeleton";

import { SectionHeader } from "@/components/ui/SectionHeader";

import { betsApi } from "@/lib/api";

import type { Match } from "@/lib/constants";

import { applyMatchFeed, toMatch } from "@/lib/match-utils";

import { trendingBets } from "@/lib/mock-data";

import { useLiveOdds } from "@/hooks/useLiveOdds";

import { motion } from "framer-motion";



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



  const loadMatches = useCallback(() => {

    betsApi

      .getMatches()

      .then((data) => setMatches(data.map(toMatch)))

      .catch(() => setMatches([]))

      .finally(() => setLoading(false));

  }, []);



  useEffect(() => {

    loadMatches();

  }, [loadMatches]);



  useLiveOdds({

    onMatchFeed: ({ action, match, matchId }) => {

      setMatches((prev) => applyMatchFeed(prev, action, match, matchId));

    },

    onUpdate: (update) => {

      setMatches((prev) =>

        prev.map((m) =>

          m.id === update.matchId

            ? {

                ...m,

                odds: { ...m.odds, home: update.odds.home, away: update.odds.away },

                homeScore: update.homeScore ?? m.homeScore,

                awayScore: update.awayScore ?? m.awayScore,

                liveMinute: update.liveMinute ?? m.liveMinute,

              }

            : m

        )

      );

    },

  });



  const liveMatches = matches.filter((m) => m.isLive);
  const upcomingMatches = matches
    .filter((m) => m.matchStatus === "upcoming" && !m.isLive)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, 8);
  const featuredMatches = matches.filter((m) => m.isFeatured && m.matchStatus !== "finished").slice(0, 6);



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

            <EmptyMatches message="No live matches right now. Fixtures sync from TheSportsDB every 5 minutes." />

          )}

        </section>



        <section aria-labelledby="upcoming-heading">

          <SectionHeader
            id="upcoming-heading"
            title="Upcoming Fixtures"
            actionLabel="All Sports"
            actionHref="/sports/football"
          />

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <MatchCardSkeleton key={i} />
              ))}
            </div>
          ) : upcomingMatches.length > 0 ? (
            <div className="space-y-3">
              {upcomingMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <EmptyMatches message="Upcoming fixtures will appear here after the next sports data sync." />
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

            <EmptyMatches message="No featured matches yet. Admins can mark fixtures as featured." />

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


