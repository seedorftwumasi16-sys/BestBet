"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { MatchCard } from "@/components/betting/MatchCard";
import { FadeIn, Skeleton } from "@/components/ui/Skeleton";
import { betsApi, type MatchApi } from "@/lib/api";
import type { Match } from "@/lib/constants";
import { SPORTS } from "@/lib/constants";
import { use, useEffect, useState } from "react";

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

export default function SportPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = use(params);
  const sportInfo = SPORTS.find((s) => s.id === sport);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const sportFilter = sport === "live" ? undefined : sport;
    const live = sport === "live";
    betsApi
      .getMatches(sportFilter, live)
      .then((data) => setMatches(data.map(toMatch)))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, [sport]);

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
