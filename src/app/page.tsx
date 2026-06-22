"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import { MainLayout } from "@/components/layout/MainLayout";

import { HeroBanner, PopularLeagues } from "@/components/home/HeroBanner";

import { MatchCard } from "@/components/betting/MatchCard";

import { MatchCardSkeleton } from "@/components/ui/Skeleton";

import { SectionHeader } from "@/components/ui/SectionHeader";

import { LeagueLogo } from "@/components/ui/LeagueLogo";

import { betsApi } from "@/lib/api";

import type { Match } from "@/lib/constants";

import { applyMatchFeed, mergeApiMatches, mergeMatchLists, applyOddsUpdate, toMatch } from "@/lib/match-utils";

import { logLiveMatchPayload } from "@/lib/live-score-utils";

import { HOMEPAGE_MATCH_CACHE_KEY, loadCachedMatches, saveCachedMatches } from "@/lib/match-cache";

import { prefetchLeagueBadges } from "@/lib/sports-assets";

import { useMatchPolling } from "@/hooks/useMatchPolling";

import {

  getLiveMatches,

  getRealFootballMatches,

  getRecentlyAddedMatches,

  getSimulatedMatches,

  getUpcomingMatches,

} from "@/lib/fixture-utils";

import { isMatchInPlay, isFinishedMatch, isMatchUpcoming } from "@/lib/match-status";

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

  headerLeading,

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

  headerLeading?: React.ReactNode;

}) {

  const showSkeleton = loading && matches.length === 0;



  return (

    <section aria-labelledby={id}>

      <SectionHeader

        id={id}

        title={title}

        live={live}

        actionLabel={actionLabel}

        actionHref={actionHref}

        leading={headerLeading}

      />

      {subtitle && <p className="text-xs sm:text-sm text-bestbet-gray-muted -mt-1 sm:-mt-2 mb-3 sm:mb-4">{subtitle}</p>}

      {showSkeleton ? (

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

  const [hydrated, setHydrated] = useState(false);



  useEffect(() => {

    const cached = loadCachedMatches(HOMEPAGE_MATCH_CACHE_KEY);

    if (cached.length > 0) {

      setMatches(cached);

      setLoading(false);

    }

    setHydrated(true);

  }, []);



  const loadMatches = useCallback(async ({ silent }: { silent: boolean }) => {
    if (!silent) setLoading(true);

    try {
      const [all, live] = await Promise.all([
        betsApi.getMatches({ sport: "football" }),
        betsApi.getMatches({ sport: "football", live: true }),
      ]);
      const incoming = mergeApiMatches(all, live)
        .map(toMatch)
        .filter((m) => !isFinishedMatch(m));

      setMatches((prev) => {
        if (incoming.length === 0 && prev.length > 0) {
          console.warn("[homepage] API returned no matches; keeping cached data");
          return prev;
        }
        const next = silent && prev.length > 0 ? mergeMatchLists(prev, incoming) : incoming;
        const active = next.filter((m) => !isFinishedMatch(m));
        saveCachedMatches(HOMEPAGE_MATCH_CACHE_KEY, active);
        return active;
      });
      logLiveMatchPayload(silent ? "homepage-poll" : "homepage-load", incoming);
    } catch (err) {
      console.error("[homepage] failed to load matches, using cache:", err);
    } finally {
      setLoading(false);
    }
  }, []);



  useEffect(() => {

    void prefetchLeagueBadges();

  }, []);



  useMatchPolling(loadMatches, [loadMatches], { enabled: hydrated, intervalMs: 30_000 });



  useLiveOdds({

    onMatchFeed: ({ action, match, matchId }) => {

      setMatches((prev) => {

        const next = applyMatchFeed(prev, action, match, matchId).filter((m) => !isFinishedMatch(m));

        saveCachedMatches(HOMEPAGE_MATCH_CACHE_KEY, next);

        return next;

      });

    },

    onUpdate: (update) => {

      setMatches((prev) => {

        const next = prev
          .map((m) => (m.id === update.matchId ? applyOddsUpdate(m, update) : m))
          .filter((m) => !isFinishedMatch(m));

        saveCachedMatches(HOMEPAGE_MATCH_CACHE_KEY, next);

        return next;

      });

    },

  });



  const realFootball = useMemo(() => getRealFootballMatches(matches), [matches]);

  const simulatedMatches = useMemo(() => getSimulatedMatches(matches), [matches]);

  const liveMatches = useMemo(() => getLiveMatches(matches), [matches]);

  const upcomingMatches = useMemo(() => getUpcomingMatches(realFootball).slice(0, 12), [realFootball]);

  const recentlyAdded = useMemo(() => getRecentlyAddedMatches(realFootball, 8), [realFootball]);

  const liveSimulated = useMemo(

    () => simulatedMatches.filter((m) => isMatchInPlay(m) && !liveMatches.some((l) => l.id === m.id)),

    [simulatedMatches, liveMatches]

  );

  const upcomingSimulated = useMemo(

    () => simulatedMatches.filter((m) => isMatchUpcoming(m)),

    [simulatedMatches]

  );

  const simulatedDisplay = useMemo(

    () => [...liveSimulated, ...upcomingSimulated].slice(0, 12),

    [liveSimulated, upcomingSimulated]

  );

  const allLiveCount = useMemo(() => getLiveMatches(matches).length, [matches]);

  const todayFixturesCount = useMemo(() => {
    const now = new Date();
    return realFootball.filter((m) => {
      const start = new Date(m.startTime);
      return (
        start.getFullYear() === now.getFullYear() &&
        start.getMonth() === now.getMonth() &&
        start.getDate() === now.getDate()
      );
    }).length;
  }, [realFootball]);

  const featuredOdds = useMemo(() => {
    const pool = [...liveMatches, ...upcomingMatches].slice(0, 16);
    if (pool.length === 0) return 2.85;
    const best = Math.max(...pool.map((m) => Math.max(m.odds.home, m.odds.away, m.odds.draw ?? 0)));
    return Math.round(best * 100) / 100;
  }, [liveMatches, upcomingMatches]);

  const sectionLoading = loading && matches.length === 0;



  return (

    <MainLayout>

      <HeroBanner
        liveMatchCount={allLiveCount}
        todayFixturesCount={todayFixturesCount}
        featuredOdds={featuredOdds}
      />

      <motion.div

        initial={{ opacity: 0 }}

        animate={{ opacity: 1 }}

        transition={{ duration: 0.4 }}

        className="p-3 sm:p-4 md:p-6 pb-20 sm:pb-24 xl:pb-6 space-y-4 sm:space-y-5 md:space-y-6 max-w-5xl mx-auto w-full min-w-0"

      >

        <MatchSection

          id="live-heading"

          title="Live Matches"

          matches={liveMatches}

          loading={sectionLoading}

          showStats

          live

          actionLabel="View All"

          actionHref="/live"

          emptyMessage="No live matches right now. Admin-started fixtures appear here instantly."

          skeletonCount={2}

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

          id="upcoming-heading"

          title="Upcoming Football Matches"

          matches={upcomingMatches}

          loading={sectionLoading}

          actionLabel="All Football"

          actionHref="/sports/football"

          emptyMessage="Upcoming fixtures for the next 7 days will appear after the next sports data sync."

          skeletonCount={4}

        />



        <MatchSection

          id="recent-heading"

          title="Recently Added Matches"

          matches={recentlyAdded}

          loading={sectionLoading}

          emptyMessage="New fixtures from synced leagues will appear here shortly."

          skeletonCount={3}

        />



        <MatchSection

          id="simulated-heading"

          title="Simulated League"

          subtitle="BestBet Simulated League · Available 24/7 · Admin controlled · Clearly labeled for practice and demo betting"

          headerLeading={

            <LeagueLogo

              leagueName="Simulated League"

              isSimulated

              showSimulatedBadge

              compact

              className="!w-7 !h-7 md:!w-8 md:!h-8"

            />

          }

          matches={simulatedDisplay}

          loading={sectionLoading}

          showStats

          live={liveSimulated.length > 0}

          emptyMessage="No simulated matches are live right now. Admins can create and activate simulated fixtures from the admin panel."

          skeletonCount={2}

        />

      </motion.div>

    </MainLayout>

  );

}


