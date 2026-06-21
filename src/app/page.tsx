"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { HeroBanner, PromotionCards, PopularLeagues } from "@/components/home/HeroBanner";
import { MatchCard, TrendingBetCard } from "@/components/betting/MatchCard";
import { MatchCardSkeleton } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FixturesToolbar } from "@/components/fixtures/FixturesToolbar";
import { betsApi } from "@/lib/api";
import type { Match } from "@/lib/constants";
import { applyMatchFeed, toMatch } from "@/lib/match-utils";
import {
  filterMatchesByLeague,
  filterMatchesBySearch,
  getLiveMatches,
  getTodayMatches,
  getTomorrowMatches,
  getUpcomingMatches,
} from "@/lib/fixture-utils";
import { trendingBets } from "@/lib/mock-data";
import { useLiveOdds } from "@/hooks/useLiveOdds";
import { WorldCupSpecials } from "@/components/home/WorldCupSpecials";
import { motion } from "framer-motion";

function EmptyMatches({ message }: { message: string }) {
  return (
    <div className="glass-panel rounded-2xl p-8 text-center">
      <p className="text-sm text-bestbet-gray-muted">{message}</p>
    </div>
  );
}

function MatchList({ matches, showStats }: { matches: Match[]; showStats?: boolean }) {
  if (matches.length === 0) return null;
  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} showStats={showStats} />
      ))}
    </div>
  );
}

function isWorldCupOrInternational(match: Match): boolean {
  const league = match.league.toLowerCase();
  return (
    league.includes("world cup") ||
    league.includes("international") ||
    league.includes("fifa") ||
    match.leagueId.includes("world-cup") ||
    match.leagueId.includes("international")
  );
}

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState("all");
  const [search, setSearch] = useState("");

  const loadMatches = useCallback(() => {
    setLoading(true);
    betsApi
      .getMatches({ sport: "football" })
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

  const filtered = useMemo(() => {
    let list = filterMatchesByLeague(matches, league);
    list = filterMatchesBySearch(list, search);
    return list;
  }, [matches, league, search]);

  const liveMatches = useMemo(() => getLiveMatches(filtered), [filtered]);
  const todayMatches = useMemo(() => getTodayMatches(filtered), [filtered]);
  const tomorrowMatches = useMemo(() => getTomorrowMatches(filtered), [filtered]);
  const upcomingMatches = useMemo(() => getUpcomingMatches(filtered), [filtered]);
  const featuredMatches = useMemo(
    () => filtered.filter((m) => m.isFeatured && m.matchStatus !== "finished").slice(0, 8),
    [filtered]
  );

  const worldCupMatches = useMemo(
    () =>
      matches
        .filter(isWorldCupOrInternational)
        .filter((m) => m.matchStatus !== "finished")
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
        .slice(0, 12),
    [matches]
  );

  const allLiveCount = useMemo(() => getLiveMatches(matches).length, [matches]);

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="p-4 md:p-6 pb-28 xl:pb-6 space-y-8 max-w-5xl mx-auto"
      >
        <HeroBanner liveMatchCount={allLiveCount} />

        <section aria-labelledby="wc-fixtures-heading">
          <SectionHeader
            id="wc-fixtures-heading"
            title="World Cup & International Matches"
            actionLabel="All WC Markets"
            actionHref="/sports/football?league=4429"
          />
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <MatchCardSkeleton key={i} />
              ))}
            </div>
          ) : worldCupMatches.length > 0 ? (
            <MatchList matches={worldCupMatches} showStats />
          ) : (
            <EmptyMatches message="World Cup qualifiers and international fixtures will appear here after the next sync." />
          )}
        </section>

        <WorldCupSpecials />

        <section aria-labelledby="promotions-heading">
          <SectionHeader id="promotions-heading" title="Promotions" />
          <PromotionCards />
        </section>

        <FixturesToolbar
          league={league}
          search={search}
          totalCount={filtered.length}
          onLeagueChange={setLeague}
          onSearchChange={setSearch}
        />

        <section aria-labelledby="live-heading">
          <SectionHeader id="live-heading" title="Live Now" live actionLabel="View All" actionHref="/live" />
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <MatchCardSkeleton key={i} />
              ))}
            </div>
          ) : liveMatches.length > 0 ? (
            <MatchList matches={liveMatches} showStats />
          ) : (
            <EmptyMatches message="No live matches right now. Fixtures sync from multiple competitions every 5 minutes." />
          )}
        </section>

        <section aria-labelledby="today-heading">
          <SectionHeader id="today-heading" title="Today's Matches" />
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <MatchCardSkeleton key={i} />
              ))}
            </div>
          ) : todayMatches.length > 0 ? (
            <MatchList matches={todayMatches} />
          ) : (
            <EmptyMatches message="No matches scheduled for today in the selected competition." />
          )}
        </section>

        <section aria-labelledby="tomorrow-heading">
          <SectionHeader id="tomorrow-heading" title="Tomorrow's Matches" />
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <MatchCardSkeleton key={i} />
              ))}
            </div>
          ) : tomorrowMatches.length > 0 ? (
            <MatchList matches={tomorrowMatches} />
          ) : (
            <EmptyMatches message="No matches scheduled for tomorrow in the selected competition." />
          )}
        </section>

        <section aria-labelledby="upcoming-heading">
          <SectionHeader
            id="upcoming-heading"
            title="Upcoming Matches"
            actionLabel="All Football"
            actionHref="/sports/football"
          />
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <MatchCardSkeleton key={i} />
              ))}
            </div>
          ) : upcomingMatches.length > 0 ? (
            <MatchList matches={upcomingMatches} />
          ) : (
            <EmptyMatches message="Upcoming fixtures for the next 7 days will appear after the next sports data sync." />
          )}
        </section>

        <section aria-labelledby="leagues-heading">
          <SectionHeader id="leagues-heading" title="Popular Leagues" />
          <PopularLeagues />
        </section>

        {featuredMatches.length > 0 && (
          <section aria-labelledby="featured-heading">
            <SectionHeader id="featured-heading" title="Featured Matches" actionLabel="All Sports" actionHref="/sports/football" />
            <MatchList matches={featuredMatches} />
          </section>
        )}

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
