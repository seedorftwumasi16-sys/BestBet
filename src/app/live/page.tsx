"use client";



import { useState, useCallback, useEffect } from "react";

import { MainLayout } from "@/components/layout/MainLayout";

import { MatchCard } from "@/components/betting/MatchCard";

import { MatchCardSkeleton } from "@/components/ui/Skeleton";

import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Skeleton";

import { Badge } from "@/components/ui/Badge";

import { betsApi } from "@/lib/api";

import type { Match } from "@/lib/constants";

import { applyMatchFeed, mergeMatchLists, applyOddsUpdate, toMatch } from "@/lib/match-utils";

import { logLiveMatchPayload } from "@/lib/live-score-utils";

import { loadCachedMatches, saveCachedMatches } from "@/lib/match-cache";

import { getLiveMatches } from "@/lib/fixture-utils";
import { isFinishedMatch } from "@/lib/match-status";

import { useLiveOdds } from "@/hooks/useLiveOdds";

import { useMatchPolling } from "@/hooks/useMatchPolling";

import { useAuth } from "@/context/AuthContext";



const LIVE_CACHE_KEY = "live:football";



export default function LivePage() {

  const { user } = useAuth();

  const [liveMatches, setLiveMatches] = useState<Match[]>([]);

  const [loading, setLoading] = useState(true);

  const [hydrated, setHydrated] = useState(false);



  useEffect(() => {

    const cached = getLiveMatches(loadCachedMatches(LIVE_CACHE_KEY));

    if (cached.length > 0) {

      setLiveMatches(cached);

      setLoading(false);

    }

    setHydrated(true);

  }, []);



  const loadMatches = useCallback(async ({ silent }: { silent: boolean }) => {

    if (!silent) setLoading(true);



    try {

      const data = await betsApi.getMatches({ live: true, sport: "football" });

      const incoming = data.map(toMatch).filter((m) => !isFinishedMatch(m));

      setLiveMatches((prev) => {
        const next = silent && prev.length > 0 ? mergeMatchLists(prev, incoming) : incoming;
        const live = getLiveMatches(next.length > 0 ? next : prev);
        saveCachedMatches(LIVE_CACHE_KEY, live);
        return live;
      });

      logLiveMatchPayload(silent ? "live-poll" : "live-load", incoming);

    } catch (err) {

      console.error("[live] failed to load matches, using cache:", err);

    } finally {

      setLoading(false);

    }

  }, []);



  useMatchPolling(loadMatches, [loadMatches], { enabled: hydrated, intervalMs: 30_000 });



  const { connected } = useLiveOdds({

    userId: user?.id,

    onMatchFeed: ({ action, match, matchId }) => {

      setLiveMatches((prev) => {

        const next = applyMatchFeed(prev, action, match, matchId);

        const live = getLiveMatches(next);

        saveCachedMatches(LIVE_CACHE_KEY, live);

        return live;

      });

    },

    onUpdate: (update) => {

      setLiveMatches((prev) => {

        const next = prev.map((m) => (m.id === update.matchId ? applyOddsUpdate(m, update) : m));

        const live = getLiveMatches(next);

        saveCachedMatches(LIVE_CACHE_KEY, live);

        return live;

      });

    },

  });



  const showSkeleton = loading && liveMatches.length === 0;



  return (

    <MainLayout>

      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6 max-w-5xl mx-auto pb-20 sm:pb-24 xl:pb-6 w-full min-w-0">

        <FadeIn>

          <div className="flex items-center justify-between">

            <div>

              <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2 sm:gap-3">

                <span className="w-3 h-3 rounded-full bg-bestbet-live live-pulse" />

                Live Betting

              </h1>

              <p className="text-sm text-bestbet-gray-muted mt-1">

                Real-time odds on {liveMatches.length} live events

              </p>

            </div>

            <Badge variant={connected ? "success" : "warning"}>{connected ? "Live" : "Connecting..."}</Badge>

          </div>

        </FadeIn>



        {showSkeleton ? (

          <div className="space-y-3">

            {Array.from({ length: 3 }, (_, i) => (

              <MatchCardSkeleton key={i} />

            ))}

          </div>

        ) : (

          <StaggerContainer className="space-y-4">

            {liveMatches.map((match) => (

              <StaggerItem key={match.id}>

                <MatchCard match={match} showStats />

              </StaggerItem>

            ))}

            {liveMatches.length === 0 && (

              <p className="text-center text-bestbet-gray-muted py-12">

                No live events right now. Live scores and odds update in the background without reloading the page.

              </p>

            )}

          </StaggerContainer>

        )}

      </div>

    </MainLayout>

  );

}


