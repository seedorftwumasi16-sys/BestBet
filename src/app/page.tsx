"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { HeroBanner, PopularLeagues } from "@/components/home/HeroBanner";
import { MatchCard } from "@/components/betting/MatchCard";
import { MatchCardSkeleton } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { betsApi } from "@/lib/api";
import type { Match } from "@/lib/constants";
import { applyMatchFeed, toMatch } from "@/lib/match-utils";
import { prefetchLeagueBadges } from "@/lib/sports-assets";
import {
  getLiveMatches,
  getRealFootballMatches,
  getRecentlyAddedMatches,
  getSimulatedMatches,
  getUpcomingMatches,
} from "@/lib/fixture-utils";
import { useLiveOdds } from "@/hooks/useLiveOdds";
import { motion } from "framer-motion";

function EmptyMatches({ message }: { message: string }) {
  return (
    <div className="glass-panel rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center">
      <p className="text-sm text-bestbet-gray-muted">{message}</p>
    </div>
  );
}

function MatchList({ matches, showStats }: { matches: Match[]; showStats?: boolean }) {
  if (matches.length === 0) return null;
  return (
    <div className="space-y-2 sm:space-y-3">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} showStats={showStats} />
      ))}
    </div>
  );
}

function MatchSection({
  id,
  title,
  subtitle,
  matches,
  loading,
  emptyMessage,
  showStats,
  live,
  actionLabel,
  actionHref,
  skeletonCount = 3,
}: {
  id: string;
  title: string;
  subtitle?: string;
  matches: Match[];
  loading: boolean;
  emptyMessage: string;
  showStats?: boolean;
  live?: boolean;
  actionLabel?: string;
  actionHref?: string;
  skeletonCount?: number;
}) {
  return (
    <section aria-labelledby={id}>
      <SectionHeader
        id={id}
        title={title}
        live={live}
        actionLabel={actionLabel}
        actionHref={actionHref}
      />
      {subtitle && <p className="text-xs sm:text-sm text-bestbet-gray-muted -mt-1 sm:-mt-2 mb-3 sm:mb-4">{subtitle}</p>}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: skeletonCount }, (_, i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      ) : matches.length > 0 ? (
        <MatchList matches={matches} showStats={showStats} />
      ) : (
        <EmptyMatches message={emptyMessage} />
      )}
    </section>
  );
}

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

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
    void prefetchLeagueBadges();
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

  const realFootball = useMemo(() => getRealFootballMatches(matches), [matches]);
  const simulatedMatches = useMemo(() => getSimulatedMatches(matches), [matches]);
  const liveMatches = useMemo(() => getLiveMatches(realFootball), [realFootball]);
  const upcomingMatches = useMemo(() => getUpcomingMatches(realFootball).slice(0, 12), [realFootball]);
  const recentlyAdded = useMemo(() => getRecentlyAddedMatches(realFootball, 8), [realFootball]);
  const liveSimulated = useMemo(
    () => simulatedMatches.filter((m) => m.isLive || m.matchStatus === "live"),
    [simulatedMatches]
  );
  const upcomingSimulated = useMemo(
    () => simulatedMatches.filter((m) => m.matchStatus === "upcoming" && !m.isLive),
    [simulatedMatches]
  );
  const simulatedDisplay = useMemo(
    () => [...liveSimulated, ...upcomingSimulated].slice(0, 12),
    [liveSimulated, upcomingSimulated]
  );
  const allLiveCount = useMemo(
    () => getLiveMatches(matches).length,
    [matches]
  );

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="p-3 sm:p-4 md:p-6 pb-20 sm:pb-24 xl:pb-6 space-y-4 sm:space-y-5 md:space-y-6 max-w-5xl mx-auto w-full min-w-0"
      >
        <HeroBanner liveMatchCount={allLiveCount} />

        <MatchSection
          id="live-heading"
          title="Live Football Matches"
          matches={liveMatches}
          loading={loading}
          showStats
          live
          actionLabel="View All"
          actionHref="/live"
          emptyMessage="No live football matches right now. Fixtures sync from top leagues every 5 minutes."
          skeletonCount={2}
        />

        <MatchSection
          id="upcoming-heading"
          title="Upcoming Football Matches"
          matches={upcomingMatches}
          loading={loading}
          actionLabel="All Football"
          actionHref="/sports/football"
          emptyMessage="Upcoming fixtures for the next 7 days will appear after the next sports data sync."
          skeletonCount={4}
        />

        <section aria-labelledby="leagues-heading">
          <SectionHeader
            id="leagues-heading"
            title="Popular Leagues"
            actionLabel="All Football"
            actionHref="/sports/football"
          />
          <PopularLeagues />
        </section>

        <MatchSection
          id="recent-heading"
          title="Recently Added Matches"
          matches={recentlyAdded}
          loading={loading}
          emptyMessage="New fixtures from synced leagues will appear here shortly."
          skeletonCount={3}
        />

        <MatchSection
          id="simulated-heading"
          title="Simulated Matches"
          subtitle="Available 24/7 · Admin controlled · Clearly labeled for practice and demo betting"
          matches={simulatedDisplay}
          loading={loading}
          showStats
          live={liveSimulated.length > 0}
          emptyMessage="No simulated matches are live right now. Admins can create and activate simulated fixtures from the admin panel."
          skeletonCount={2}
        />
      </motion.div>
    </MainLayout>
  );
}
