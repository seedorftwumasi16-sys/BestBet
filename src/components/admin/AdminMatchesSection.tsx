"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  Pause,
  Play,
  Radio,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { adminApi, type MatchApi } from "@/lib/api";
import { SPORTS } from "@/lib/constants";
import { formatMatchDate, formatMatchTime } from "@/lib/utils";
import { normalizeMatchApi, safeToFixed } from "@/lib/admin-utils";
import { useToast } from "@/context/ToastContext";
import {
  AdminMatchMarketsEditor,
  initCorrectScoreFromMatch,
  initDoubleChanceFromMatch,
  oddsRecordFromStrings,
} from "@/components/admin/AdminMatchMarketsEditor";
import type { MarketTab } from "@/lib/markets";

type MatchStatus = "upcoming" | "live" | "finished";

interface MatchFormState {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: string;
  startTime: string;
  matchStatus: MatchStatus;
  isFeatured: boolean;
  isSimulated: boolean;
  bettingSuspended: boolean;
  oddsHome: string;
  oddsDraw: string;
  oddsAway: string;
  oddsOver: string;
  oddsUnder: string;
  overUnderLine: string;
  oddsBttsYes: string;
  oddsBttsNo: string;
  homeScore: string;
  awayScore: string;
  liveMinute: string;
}

const emptyForm = (): MatchFormState => ({
  homeTeam: "",
  awayTeam: "",
  league: "",
  sport: "football",
  startTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  matchStatus: "upcoming",
  isFeatured: false,
  isSimulated: false,
  bettingSuspended: false,
  oddsHome: "1.85",
  oddsDraw: "3.40",
  oddsAway: "4.20",
  oddsOver: "1.90",
  oddsUnder: "1.90",
  overUnderLine: "2.5",
  oddsBttsYes: "1.75",
  oddsBttsNo: "2.05",
  homeScore: "0",
  awayScore: "0",
  liveMinute: "0",
});

function formFromMatch(match: MatchApi): MatchFormState {
  const start = new Date(match.startTime);
  const local = new Date(start.getTime() - start.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return {
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    league: match.league,
    sport: match.sport,
    startTime: local,
    matchStatus: match.matchStatus,
    isFeatured: match.isFeatured,
    isSimulated: match.isSimulated,
    bettingSuspended: match.bettingSuspended,
    oddsHome: String(match.odds.home),
    oddsDraw: match.odds.draw != null ? String(match.odds.draw) : "",
    oddsAway: String(match.odds.away),
    oddsOver: match.odds.over != null ? String(match.odds.over) : "",
    oddsUnder: match.odds.under != null ? String(match.odds.under) : "",
    overUnderLine: match.odds.overUnderLine != null ? String(match.odds.overUnderLine) : "2.5",
    oddsBttsYes: match.odds.bttsYes != null ? String(match.odds.bttsYes) : "",
    oddsBttsNo: match.odds.bttsNo != null ? String(match.odds.bttsNo) : "",
    homeScore: String(match.homeScore ?? 0),
    awayScore: String(match.awayScore ?? 0),
    liveMinute: String(match.liveMinute ?? 0),
  };
}

function formToPayload(
  form: MatchFormState,
  correctScoreOdds: Record<string, string>,
  doubleChanceOdds: Record<string, string>
) {
  return {
    homeTeam: form.homeTeam.trim(),
    awayTeam: form.awayTeam.trim(),
    league: form.league.trim(),
    sport: form.sport,
    startTime: new Date(form.startTime).toISOString(),
    matchStatus: form.matchStatus,
    isFeatured: form.isFeatured,
    isSimulated: form.isSimulated,
    bettingSuspended: form.bettingSuspended,
    oddsHome: Number(form.oddsHome),
    oddsDraw: form.oddsDraw ? Number(form.oddsDraw) : null,
    oddsAway: Number(form.oddsAway),
    oddsOver: form.oddsOver ? Number(form.oddsOver) : null,
    oddsUnder: form.oddsUnder ? Number(form.oddsUnder) : null,
    overUnderLine: Number(form.overUnderLine),
    oddsBttsYes: form.oddsBttsYes ? Number(form.oddsBttsYes) : null,
    oddsBttsNo: form.oddsBttsNo ? Number(form.oddsBttsNo) : null,
    homeScore: Number(form.homeScore),
    awayScore: Number(form.awayScore),
    liveMinute: Number(form.liveMinute),
    ...oddsRecordFromStrings(correctScoreOdds, doubleChanceOdds),
  };
}

function statusBadge(status: MatchStatus) {
  if (status === "live") return <Badge variant="live">Live</Badge>;
  if (status === "finished") return <Badge variant="default">Finished</Badge>;
  return <Badge variant="warning">Upcoming</Badge>;
}

export function AdminMatchesSection() {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [matches, setMatches] = useState<MatchApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MatchFormState>(emptyForm);
  const [filter, setFilter] = useState<"all" | MatchStatus | "simulated">("all");
  const [marketTab, setMarketTab] = useState<MarketTab>("main");
  const [correctScoreOdds, setCorrectScoreOdds] = useState<Record<string, string>>({});
  const [doubleChanceOdds, setDoubleChanceOdds] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    setLoadError("");
    adminApi
      .getMatches()
      .then((data) => setMatches(Array.isArray(data) ? data.map(normalizeMatchApi) : []))
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load matches";
        setLoadError(message);
        toastRef.current.error(message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = (simulated = false) => {
    setEditingId(null);
    setForm({
      ...emptyForm(),
      isSimulated: simulated,
      league: simulated ? "Simulated League" : "",
    });
    setCorrectScoreOdds({});
    setDoubleChanceOdds({});
    setMarketTab("main");
    setShowForm(true);
  };

  const openEdit = (match: MatchApi) => {
    const normalized = normalizeMatchApi(match);
    setEditingId(normalized.id);
    setForm(formFromMatch(normalized));
    setCorrectScoreOdds(initCorrectScoreFromMatch(normalized.odds.correctScore));
    setDoubleChanceOdds(initDoubleChanceFromMatch(normalized.odds.doubleChance));
    setMarketTab("main");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setCorrectScoreOdds({});
    setDoubleChanceOdds({});
  };

  const saveMatch = async () => {
    if (saving) return;
    if (!form.homeTeam || !form.awayTeam || !form.league) {
      toast.error("Home team, away team, and league are required");
      return;
    }

    setSaving(true);
    try {
      const payload = formToPayload(form, correctScoreOdds, doubleChanceOdds);
      if (editingId) {
        const updated = await adminApi.updateMatch(editingId, payload);
        setMatches((prev) => prev.map((m) => (m.id === editingId ? normalizeMatchApi(updated) : m)));
        toast.success("Match updated successfully");
      } else {
        const created = await adminApi.createMatch(payload);
        setMatches((prev) => [normalizeMatchApi(created), ...prev]);
        toast.success("Match created successfully");
      }
      closeForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save match");
    } finally {
      setSaving(false);
    }
  };

  const deleteMatch = async (id: string, label: string) => {
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    try {
      await adminApi.deleteMatch(id);
      setMatches((prev) => prev.filter((m) => m.id !== id));
      if (editingId === id) closeForm();
      toast.success("Match deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete match");
    }
  };

  const toggleFeatured = async (match: MatchApi) => {
    try {
      const updated = await adminApi.updateMatch(match.id, { isFeatured: !match.isFeatured });
      setMatches((prev) => prev.map((m) => (m.id === match.id ? normalizeMatchApi(updated) : m)));
      toast.success(updated.isFeatured ? "Match featured on homepage" : "Match unfeatured");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update match");
    }
  };

  const toggleBetting = async (match: MatchApi, suspended: boolean) => {
    try {
      const updated = await adminApi.updateMatch(match.id, { bettingSuspended: suspended });
      setMatches((prev) => prev.map((m) => (m.id === match.id ? normalizeMatchApi(updated) : m)));
      toast.success(suspended ? "Betting suspended" : "Betting resumed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update betting status");
    }
  };

  const setMatchStatus = async (match: MatchApi, matchStatus: MatchStatus) => {
    try {
      const payload: Record<string, unknown> = { matchStatus };
      if (matchStatus === "live") {
        payload.liveMinute = match.liveMinute && match.liveMinute > 0 ? match.liveMinute : 1;
        payload.homeScore = match.homeScore ?? 0;
        payload.awayScore = match.awayScore ?? 0;
      }
      const updated = await adminApi.updateMatch(match.id, payload);
      setMatches((prev) => prev.map((m) => (m.id === match.id ? normalizeMatchApi(updated) : m)));
      toast.success(matchStatus === "live" ? "Match is now live" : matchStatus === "finished" ? "Match stopped" : "Match set to upcoming");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update match status");
    }
  };

  const filtered = matches.filter((m) => {
    if (filter === "simulated") return m.isSimulated;
    if (filter === "all") return true;
    return m.matchStatus === filter;
  });

  const setField = <K extends keyof MatchFormState>(key: K, value: MatchFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-bestbet-yellow">Match Management</h2>
          <p className="text-sm text-bestbet-gray-muted">
            Create fixtures, manage simulated matches 24/7, set markets, control live events, and feature matches on the homepage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => openCreate(false)}>
            <Plus size={16} className="mr-1" /> New Match
          </Button>
          <Button variant="outline" size="sm" onClick={() => openCreate(true)}>
            <Radio size={16} className="mr-1" /> New Simulated
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "simulated", "upcoming", "live", "finished"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              filter === status
                ? "bg-bestbet-yellow text-black"
                : "bg-bestbet-gray/60 text-bestbet-gray-muted hover:text-bestbet-yellow"
            }`}
          >
            {status === "all" ? "All Matches" : status === "simulated" ? "Simulated" : status}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="card-premium p-5 space-y-5 border border-bestbet-yellow/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-bestbet-yellow">
              {editingId ? "Edit Match" : "Create Match"}
            </h3>
            <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-white/5" aria-label="Close form">
              <X size={18} />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Home Team" value={form.homeTeam} onChange={(e) => setField("homeTeam", e.target.value)} />
            <Input label="Away Team" value={form.awayTeam} onChange={(e) => setField("awayTeam", e.target.value)} />
            <Input label="League" value={form.league} onChange={(e) => setField("league", e.target.value)} />
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-bestbet-gray-muted">Sport</span>
              <select
                value={form.sport}
                onChange={(e) => setField("sport", e.target.value)}
                className="w-full rounded-lg bg-bestbet-gray/80 border border-bestbet-yellow/10 px-3 py-2.5 text-sm outline-none focus:border-bestbet-yellow/40"
              >
                {SPORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Kickoff Date & Time"
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => setField("startTime", e.target.value)}
            />
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-bestbet-gray-muted">Match Status</span>
              <select
                value={form.matchStatus}
                onChange={(e) => setField("matchStatus", e.target.value as MatchStatus)}
                className="w-full rounded-lg bg-bestbet-gray/80 border border-bestbet-yellow/10 px-3 py-2.5 text-sm outline-none focus:border-bestbet-yellow/40"
              >
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="finished">Finished</option>
              </select>
            </label>
          </div>

          <AdminMatchMarketsEditor
            marketTab={marketTab}
            setMarketTab={setMarketTab}
            correctScoreOdds={correctScoreOdds}
            setCorrectScoreOdds={setCorrectScoreOdds}
            doubleChanceOdds={doubleChanceOdds}
            setDoubleChanceOdds={setDoubleChanceOdds}
            oddsHome={form.oddsHome}
            setOddsHome={(v) => setField("oddsHome", v)}
            oddsDraw={form.oddsDraw}
            setOddsDraw={(v) => setField("oddsDraw", v)}
            oddsAway={form.oddsAway}
            setOddsAway={(v) => setField("oddsAway", v)}
            oddsOver={form.oddsOver}
            setOddsOver={(v) => setField("oddsOver", v)}
            oddsUnder={form.oddsUnder}
            setOddsUnder={(v) => setField("oddsUnder", v)}
            overUnderLine={form.overUnderLine}
            setOverUnderLine={(v) => setField("overUnderLine", v)}
            oddsBttsYes={form.oddsBttsYes}
            setOddsBttsYes={(v) => setField("oddsBttsYes", v)}
            oddsBttsNo={form.oddsBttsNo}
            setOddsBttsNo={(v) => setField("oddsBttsNo", v)}
          />

          {(form.matchStatus === "live" || editingId) && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-bestbet-gray-muted mb-3 flex items-center gap-2">
                <Radio size={14} /> Live Control
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Home Score" type="number" value={form.homeScore} onChange={(e) => setField("homeScore", e.target.value)} />
                <Input label="Away Score" type="number" value={form.awayScore} onChange={(e) => setField("awayScore", e.target.value)} />
                <Input label="Match Minute" type="number" value={form.liveMinute} onChange={(e) => setField("liveMinute", e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isSimulated}
                onChange={(e) => setField("isSimulated", e.target.checked)}
                className="rounded border-bestbet-yellow/30"
              />
              Simulated match (24/7 admin controlled)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setField("isFeatured", e.target.checked)}
                className="rounded border-bestbet-yellow/30"
              />
              Featured on homepage
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.bettingSuspended}
                onChange={(e) => setField("bettingSuspended", e.target.checked)}
                className="rounded border-bestbet-yellow/30"
              />
              Suspend betting
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="primary" size="sm" loading={saving} disabled={saving} onClick={saveMatch}>
              <Save size={14} className="mr-1" /> {editingId ? "Update Match" : "Create Match"}
            </Button>
            <Button variant="outline" size="sm" onClick={closeForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loadError && !loading && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center justify-between gap-3">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>Retry</Button>
        </div>
      )}

      {loading ? (
        <p className="text-bestbet-gray-muted">Loading matches...</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((match) => (
            <div
              key={match.id}
              className="card-premium p-4 border border-bestbet-yellow/10 hover:border-bestbet-yellow/25 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {statusBadge(match.matchStatus)}
                    {match.isSimulated && <Badge variant="warning">SIMULATED</Badge>}
                    {match.isFeatured && (
                      <Badge variant="warning">
                        <Star size={10} className="mr-0.5 fill-current" /> Featured
                      </Badge>
                    )}
                    {match.bettingSuspended && <Badge variant="danger">Betting Suspended</Badge>}
                  </div>
                  <p className="font-bold text-base">
                    {match.homeTeam.name}{" "}
                    <span className="text-bestbet-gray-muted font-normal">vs</span> {match.awayTeam.name}
                  </p>
                  <p className="text-xs text-bestbet-gray-muted mt-1">
                    {match.league} · {match.sport} · {formatMatchDate(new Date(match.startTime))}{" "}
                    {formatMatchTime(new Date(match.startTime))}
                  </p>
                  {match.matchStatus === "live" && (
                    <p className="text-sm font-bold text-bestbet-yellow mt-1 tabular-nums">
                      {match.homeScore ?? 0} - {match.awayScore ?? 0} · {match.liveMinute ?? 0}&apos;
                    </p>
                  )}
                  <p className="text-xs text-bestbet-gray-muted mt-2 tabular-nums">
                    1: {safeToFixed(match.odds.home)} · X: {match.odds.draw != null ? safeToFixed(match.odds.draw) : "—"} · 2:{" "}
                    {safeToFixed(match.odds.away)}
                    {match.odds.over != null && (
                      <> · O/U {match.odds.overUnderLine ?? "2.5"}: {safeToFixed(match.odds.over)}/{match.odds.under != null ? safeToFixed(match.odds.under) : "—"}</>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {match.matchStatus !== "live" && match.matchStatus !== "finished" && (
                    <Button size="sm" variant="primary" onClick={() => setMatchStatus(match, "live")} title="Start live">
                      <Play size={14} />
                    </Button>
                  )}
                  {match.matchStatus === "live" && (
                    <Button size="sm" variant="secondary" onClick={() => setMatchStatus(match, "finished")} title="Stop match">
                      <Pause size={14} />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openEdit(match)}>
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant={match.isFeatured ? "primary" : "secondary"}
                    onClick={() => toggleFeatured(match)}
                    title="Toggle featured"
                  >
                    <Star size={14} className={match.isFeatured ? "fill-current" : ""} />
                  </Button>
                  {match.bettingSuspended ? (
                    <Button size="sm" variant="primary" onClick={() => toggleBetting(match, false)} title="Resume betting">
                      <Play size={14} />
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => toggleBetting(match, true)} title="Suspend betting">
                      <Pause size={14} />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => deleteMatch(match.id, `${match.homeTeam.name} vs ${match.awayTeam.name}`)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-bestbet-gray-muted py-12">No matches in this category</p>
          )}
        </div>
      )}
    </div>
  );
}
