"use client";

import { Suspense, use, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { MatchCard } from "@/components/betting/MatchCard";
import { FixturesToolbar } from "@/components/fixtures/FixturesToolbar";
import { FadeIn, Skeleton } from "@/components/ui/Skeleton";
import { betsApi } from "@/lib/api";
import type { Match } from "@/lib/constants";
import { SPORTS } from "@/lib/constants";
import { applyMatchFeed, toMatch } from "@/lib/match-utils";
import { filterMatchesByLeague, filterMatchesBySearch } from "@/lib/fixture-utils";
import { useLiveOdds } from "@/hooks/useLiveOdds";

function SportPageContent({ sport }: { sport: string }) {
  const searchParams = useSearchParams();
  const sportInfo = SPORTS.find((s) => s.id === sport);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState(searchParams.get("league") || "all");
  const [search, setSearch] = useState("");

  const loadMatches = useCallback(() => {
    setLoading(true);
    const sportFilter = sport === "live" ? undefined : sport;
    const live = sport === "live";
    betsApi
      .getMatches({
        sport: sportFilter,
        live,
        league: league !== "all" ? league : undefined,
        search: search || undefined,
      })
      .then((data) => setMatches(data.map(toMatch)))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, [sport, league, search]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    const fromUrl = searchParams.get("league");
    if (fromUrl) setLeague(fromUrl);
  }, [searchParams]);

  useLiveOdds({
    onMatchFeed: ({ action, match, matchId }) => {
      setMatches((prev) => {
        const next = applyMatchFeed(prev, action, match, matchId);
        if (sport === "live") return next.filter((m) => m.isLive);
        return next.filter((m) => m.sport === sport);
      });
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

  const displayed = useMemo(() => {
    let list = filterMatchesByLeague(matches, league);
    list = filterMatchesBySearch(list, search);
    return list;
  }, [matches, league, search]);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6 max-w-5xl mx-auto pb-20 sm:pb-24 xl:pb-6 w-full min-w-0">
      <FadeIn>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{sportInfo?.icon || "🏆"}</span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">{sportInfo?.name || sport}</h1>
            <p className="text-sm text-bestbet-gray-muted">{displayed.length} events available</p>
          </div>
        </div>
      </FadeIn>

      {sport === "football" && (
        <FixturesToolbar
          league={league}
          search={search}
          totalCount={displayed.length}
          onLeagueChange={setLeague}
          onSearchChange={setSearch}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((match) => (
            <MatchCard key={match.id} match={match} showStats={match.isLive} />
          ))}
          {displayed.length === 0 && (
            <p className="text-center text-bestbet-gray-muted py-12">
              No events available for this sport or filter. Try another competition or wait for the next sync.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SportPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = use(params);

  return (
    <MainLayout>
      <Suspense
        fallback={
          <div className="p-6 space-y-3 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        }
      >
        <SportPageContent sport={sport} />
      </Suspense>
    </MainLayout>
  );
}
