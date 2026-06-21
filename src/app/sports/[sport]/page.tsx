"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { MatchCard } from "@/components/betting/MatchCard";
import { FadeIn, Skeleton } from "@/components/ui/Skeleton";
import { betsApi } from "@/lib/api";
import type { Match } from "@/lib/constants";
import { SPORTS } from "@/lib/constants";
import { applyMatchFeed, toMatch } from "@/lib/match-utils";
import { useLiveOdds } from "@/hooks/useLiveOdds";
import { use, useCallback, useEffect, useState } from "react";

export default function SportPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = use(params);
  const sportInfo = SPORTS.find((s) => s.id === sport);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMatches = useCallback(() => {
    setLoading(true);
    const sportFilter = sport === "live" ? undefined : sport;
    const live = sport === "live";
    betsApi
      .getMatches(sportFilter, live)
      .then((data) => setMatches(data.map(toMatch)))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, [sport]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  useLiveOdds({
    onMatchFeed: ({ action, match, matchId }) => {
      setMatches((prev) => {
        const next = applyMatchFeed(prev, action, match, matchId);
        if (sport === "live") return next.filter((m) => m.isLive);
        if (sport !== "live") return next.filter((m) => m.sport === sport);
        return next;
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

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <FadeIn>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{sportInfo?.icon || "🏆"}</span>
            <div>
              <h1 className="text-2xl font-black">{sportInfo?.name || sport}</h1>
              <p className="text-sm text-bestbet-gray-muted">{matches.length} events available</p>
            </div>
          </div>
        </FadeIn>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} showStats={match.isLive} />
            ))}
            {matches.length === 0 && (
              <p className="text-center text-bestbet-gray-muted py-12">No events available for this sport</p>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
