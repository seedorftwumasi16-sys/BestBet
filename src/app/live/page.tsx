"use client";

import { useEffect, useState, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MatchCard } from "@/components/betting/MatchCard";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { betsApi } from "@/lib/api";
import type { Match } from "@/lib/constants";
import { applyMatchFeed, applyOddsUpdate, toMatch } from "@/lib/match-utils";
import { getLiveMatches } from "@/lib/fixture-utils";
import { useLiveOdds } from "@/hooks/useLiveOdds";
import { useAuth } from "@/context/AuthContext";

export default function LivePage() {
  const { user } = useAuth();
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);

  const loadMatches = useCallback(() => {
    betsApi
      .getMatches({ live: true, sport: "football" })
      .then((data) => setLiveMatches(data.map(toMatch)))
      .catch((err) => console.error("[live] failed to load matches", err));
  }, []);

  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, 30_000);
    return () => clearInterval(interval);
  }, [loadMatches]);

  const { connected } = useLiveOdds({
    userId: user?.id,
    onMatchFeed: ({ action, match, matchId }) => {
      setLiveMatches((prev) => {
        const next = applyMatchFeed(prev, action, match, matchId);
        return getLiveMatches(next);
      });
    },
    onUpdate: (update) => {
      setLiveMatches((prev) =>
        prev.map((m) => (m.id === update.matchId ? applyOddsUpdate(m, update) : m))
      );
    },
  });

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

        <StaggerContainer className="space-y-4">
          {liveMatches.map((match) => (
            <StaggerItem key={match.id}>
              <MatchCard match={match} showStats />
            </StaggerItem>
          ))}
          {liveMatches.length === 0 && (
            <p className="text-center text-bestbet-gray-muted py-12">
              No live events right now. Live scores sync from TheSportsDB every 5 minutes.
            </p>
          )}
        </StaggerContainer>
      </div>
    </MainLayout>
  );
}
