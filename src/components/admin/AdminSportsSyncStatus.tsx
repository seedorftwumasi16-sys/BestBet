"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Database } from "lucide-react";
import { sportsApi, type SportsSyncStatus } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";

export function AdminSportsSyncStatus() {
  const [status, setStatus] = useState<SportsSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    sportsApi
      .getStatus()
      .then(setStatus)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sync status"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card-premium p-5">
        <p className="text-sm text-bestbet-gray-muted">Loading fixture import status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {error}
      </div>
    );
  }

  const last = status?.lastSync;
  const imported = last?.eventsSynced ?? status?.cached.syncedMatches ?? 0;
  const success = last?.status === "success";

  return (
    <div className="card-premium p-5 border border-bestbet-yellow/20">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-bestbet-yellow" />
          <h3 className="text-sm font-bold text-bestbet-yellow">Fixture Import Status</h3>
        </div>
        <Badge variant={success ? "success" : "warning"}>
          {success ? "Synced" : last?.status ?? "Unknown"}
        </Badge>
      </div>

      <p className="text-2xl font-black text-white">
        {imported} <span className="text-base font-semibold text-bestbet-gray-muted">fixtures imported</span>
      </p>

      {last?.message && (
        <p className="mt-2 text-sm text-bestbet-gray-muted leading-relaxed">{last.message}</p>
      )}

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-lg bg-black/30 p-3">
          <p className="text-bestbet-gray-muted">Competitions</p>
          <p className="font-bold text-white mt-1">{last?.leaguesSynced ?? "—"}</p>
        </div>
        <div className="rounded-lg bg-black/30 p-3">
          <p className="text-bestbet-gray-muted">Teams cached</p>
          <p className="font-bold text-white mt-1">{last?.teamsSynced ?? status?.cached.teams ?? "—"}</p>
        </div>
        <div className="rounded-lg bg-black/30 p-3">
          <p className="text-bestbet-gray-muted">In database</p>
          <p className="font-bold text-white mt-1">{status?.cached.syncedMatches ?? "—"}</p>
        </div>
        <div className="rounded-lg bg-black/30 p-3">
          <p className="text-bestbet-gray-muted">API</p>
          <p className="font-bold text-white mt-1 flex items-center gap-1">
            <RefreshCw size={12} className={status?.apiReachable ? "text-bestbet-success" : "text-bestbet-danger"} />
            {status?.apiReachable ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {last?.at && (
        <p className="mt-3 text-[11px] text-bestbet-gray-muted">
          Last sync: {new Date(last.at).toLocaleString()} · Auto-sync every 5 minutes
        </p>
      )}

      {imported < 50 && (
        <p className="mt-3 text-xs text-bestbet-yellow-secondary">
          Target is 50+ fixtures. If counts stay low, upgrade `SPORTS_API_KEY` on Railway for fuller TheSportsDB data.
        </p>
      )}
    </div>
  );
}
