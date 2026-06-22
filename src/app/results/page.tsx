"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ResultMatchRow } from "@/components/results/ResultMatchRow";
import { ResultsToolbar } from "@/components/results/ResultsToolbar";
import { MatchCardSkeleton } from "@/components/ui/Skeleton";
import { FadeIn } from "@/components/ui/Skeleton";
import { betsApi } from "@/lib/api";
import type { Match } from "@/lib/constants";
import { toMatch } from "@/lib/match-utils";
import { loadCachedMatches, saveCachedMatches } from "@/lib/match-cache";
import { useMatchPolling } from "@/hooks/useMatchPolling";
import {
  filterResultsByTab,
  getFinishedMatches,
  groupResultsByDate,
  type ResultsTab,
} from "@/lib/results-utils";

const RESULTS_CACHE_KEY = "results:football";
const RESULTS_POLL_MS = 3 * 60 * 1000;

export default function ResultsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<ResultsTab>("week");

  useEffect(() => {
    const cached = getFinishedMatches(loadCachedMatches(RESULTS_CACHE_KEY));
    if (cached.length > 0) {
      setMatches(cached);
      setLoading(false);
    }
    setHydrated(true);
  }, []);

  const loadResults = useCallback(async ({ silent }: { silent: boolean }) => {
    if (!silent) setLoading(true);
    try {
      const data = await betsApi.getMatches({ sport: "football", status: "finished" });
      const incoming = getFinishedMatches(data.map(toMatch));
      setMatches(incoming);
      saveCachedMatches(RESULTS_CACHE_KEY, incoming);
    } catch (err) {
      console.error("[results] failed to load matches:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useMatchPolling(loadResults, [loadResults], {
    enabled: hydrated,
    intervalMs: RESULTS_POLL_MS,
  });

  const filtered = useMemo(() => filterResultsByTab(matches, tab), [matches, tab]);
  const grouped = useMemo(() => groupResultsByDate(filtered), [filtered]);
  const showSkeleton = loading && matches.length === 0;

  return (
    <MainLayout>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6 max-w-5xl mx-auto pb-20 sm:pb-24 xl:pb-6 w-full min-w-0">
        <FadeIn>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">Match Results</h1>
            <p className="text-sm text-bestbet-gray-muted mt-1">
              Full-time scores from the last 30 days. Finished matches leave Live automatically.
            </p>
          </div>
        </FadeIn>

        <ResultsToolbar active={tab} onChange={setTab} count={filtered.length} />

        {showSkeleton ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <MatchCardSkeleton key={i} />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="glass-panel rounded-xl sm:rounded-2xl p-8 text-center">
            <p className="text-sm text-bestbet-gray-muted">
              No finished matches for this period yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <section key={group.label} aria-labelledby={`results-${group.label}`}>
                <h2
                  id={`results-${group.label}`}
                  className="text-xs sm:text-sm font-bold uppercase tracking-wider text-bestbet-yellow mb-3"
                >
                  {group.label}
                </h2>
                <div className="space-y-2 sm:space-y-3">
                  {group.matches.map((match) => (
                    <ResultMatchRow key={match.id} match={match} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
