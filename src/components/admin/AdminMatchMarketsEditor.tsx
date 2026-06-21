"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  CORRECT_SCORE_LABELS,
  CORRECT_SCORE_PRESET_ODDS,
  CORRECT_SCORE_SCORES,
  CORRECT_SCORE_SPECIALS,
  DOUBLE_CHANCE_LABELS,
  MARKET_TAB_LABELS,
  MARKET_TABS,
  formatCorrectScoreLabel,
  normalizeCorrectScoreKey,
  type MarketTab,
} from "@/lib/markets";

interface AdminMatchMarketsEditorProps {
  marketTab: MarketTab;
  setMarketTab: (tab: MarketTab) => void;
  correctScoreOdds: Record<string, string>;
  setCorrectScoreOdds: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  doubleChanceOdds: Record<string, string>;
  setDoubleChanceOdds: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  oddsOver: string;
  setOddsOver: (v: string) => void;
  oddsUnder: string;
  setOddsUnder: (v: string) => void;
  overUnderLine: string;
  setOverUnderLine: (v: string) => void;
  oddsBttsYes: string;
  setOddsBttsYes: (v: string) => void;
  oddsBttsNo: string;
  setOddsBttsNo: (v: string) => void;
  oddsHome: string;
  setOddsHome: (v: string) => void;
  oddsDraw: string;
  setOddsDraw: (v: string) => void;
  oddsAway: string;
  setOddsAway: (v: string) => void;
}

function CorrectScoreMarketsEditor({
  correctScoreOdds,
  setCorrectScoreOdds,
}: {
  correctScoreOdds: Record<string, string>;
  setCorrectScoreOdds: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [newScore, setNewScore] = useState("");
  const [newOdds, setNewOdds] = useState("");

  const entries = useMemo(
    () =>
      Object.entries(correctScoreOdds).filter(([_, v]) => v !== "").sort(([a], [b]) => a.localeCompare(b)),
    [correctScoreOdds]
  );

  const loadPresets = () => {
    const next: Record<string, string> = { ...correctScoreOdds };
    for (const [key, value] of Object.entries(CORRECT_SCORE_PRESET_ODDS)) {
      next[key] = String(value);
    }
    setCorrectScoreOdds(next);
  };

  const addRow = () => {
    const key = normalizeCorrectScoreKey(newScore);
    if (!key || !newOdds) return;
    setCorrectScoreOdds((prev) => ({ ...prev, [key]: newOdds }));
    setNewScore("");
    setNewOdds("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-bestbet-yellow">Correct Score Markets</h4>
          <p className="text-xs text-bestbet-gray-muted mt-0.5">
            Add unlimited score lines (e.g. 2-1 = 7.80). Stored separately from Match Result markets.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={loadPresets}>
          Load Presets
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-2 items-end">
        <Input
          label="Score (e.g. 2-1 or Any Other Home Win)"
          value={newScore}
          onChange={(e) => setNewScore(e.target.value)}
          placeholder="2-1"
        />
        <Input
          label="Odds"
          type="number"
          step="0.01"
          value={newOdds}
          onChange={(e) => setNewOdds(e.target.value)}
          placeholder="7.80"
        />
        <Button type="button" variant="secondary" size="sm" className="mb-0.5" onClick={addRow}>
          <Plus size={14} /> Add
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-80 overflow-y-auto pr-1">
        {entries.map(([key, value]) => (
          <div key={key} className="relative">
            <Input
              label={formatCorrectScoreLabel(key)}
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setCorrectScoreOdds((prev) => ({ ...prev, [key]: e.target.value }))}
            />
            <button
              type="button"
              onClick={() =>
                setCorrectScoreOdds((prev) => {
                  const next = { ...prev };
                  delete next[key];
                  return next;
                })
              }
              className="absolute top-0 right-0 p-1 text-bestbet-danger hover:bg-white/5 rounded"
              aria-label={`Remove ${key}`}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <p className="text-xs text-bestbet-gray-muted text-center py-4 border border-dashed border-white/10 rounded-lg">
          No correct score markets yet. Load presets or add custom score lines.
        </p>
      )}
    </div>
  );
}

export function AdminMatchMarketsEditor(props: AdminMatchMarketsEditorProps) {
  const {
    marketTab,
    setMarketTab,
    correctScoreOdds,
    setCorrectScoreOdds,
    doubleChanceOdds,
    setDoubleChanceOdds,
    oddsOver,
    setOddsOver,
    oddsUnder,
    setOddsUnder,
    overUnderLine,
    setOverUnderLine,
    oddsBttsYes,
    setOddsBttsYes,
    oddsBttsNo,
    setOddsBttsNo,
    oddsHome,
    setOddsHome,
    oddsDraw,
    setOddsDraw,
    oddsAway,
    setOddsAway,
  } = props;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {MARKET_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMarketTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              marketTab === tab
                ? "bg-bestbet-yellow text-black"
                : "bg-bestbet-gray/50 text-bestbet-gray-muted hover:text-bestbet-yellow"
            }`}
          >
            {MARKET_TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {marketTab === "main" && (
        <div className="grid grid-cols-3 gap-3">
          <Input label="Home Win" type="number" step="0.01" value={oddsHome} onChange={(e) => setOddsHome(e.target.value)} />
          <Input label="Draw" type="number" step="0.01" value={oddsDraw} onChange={(e) => setOddsDraw(e.target.value)} />
          <Input label="Away Win" type="number" step="0.01" value={oddsAway} onChange={(e) => setOddsAway(e.target.value)} />
        </div>
      )}

      {marketTab === "over_under" && (
        <div className="grid grid-cols-3 gap-3">
          <Input label="Line" type="number" step="0.5" value={overUnderLine} onChange={(e) => setOverUnderLine(e.target.value)} />
          <Input label="Over Odds" type="number" step="0.01" value={oddsOver} onChange={(e) => setOddsOver(e.target.value)} />
          <Input label="Under Odds" type="number" step="0.01" value={oddsUnder} onChange={(e) => setOddsUnder(e.target.value)} />
        </div>
      )}

      {marketTab === "btts" && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="BTTS Yes" type="number" step="0.01" value={oddsBttsYes} onChange={(e) => setOddsBttsYes(e.target.value)} />
          <Input label="BTTS No" type="number" step="0.01" value={oddsBttsNo} onChange={(e) => setOddsBttsNo(e.target.value)} />
        </div>
      )}

      {marketTab === "double_chance" && (
        <div className="grid grid-cols-3 gap-3">
          {Object.keys(DOUBLE_CHANCE_LABELS).map((key) => (
            <Input
              key={key}
              label={DOUBLE_CHANCE_LABELS[key]}
              type="number"
              step="0.01"
              value={doubleChanceOdds[key] || ""}
              onChange={(e) => setDoubleChanceOdds((prev) => ({ ...prev, [key]: e.target.value }))}
            />
          ))}
        </div>
      )}

      {marketTab === "correct_score" && (
        <CorrectScoreMarketsEditor correctScoreOdds={correctScoreOdds} setCorrectScoreOdds={setCorrectScoreOdds} />
      )}
    </div>
  );
}

export function oddsRecordFromStrings(
  correctScoreOdds: Record<string, string>,
  doubleChanceOdds: Record<string, string>
) {
  const correctScore: Record<string, number> = {};
  for (const [k, v] of Object.entries(correctScoreOdds)) {
    if (v) correctScore[normalizeCorrectScoreKey(k)] = Number(v);
  }
  const doubleChance: Record<string, number> = {};
  for (const [k, v] of Object.entries(doubleChanceOdds)) {
    if (v) doubleChance[k] = Number(v);
  }
  return { correctScoreOdds: correctScore, doubleChanceOdds: doubleChance };
}

export function initCorrectScoreFromMatch(odds?: Record<string, number>) {
  const result: Record<string, string> = {};
  if (odds) {
    for (const [key, value] of Object.entries(odds)) {
      if (value != null) result[key] = String(value);
    }
  }
  if (Object.keys(result).length === 0) {
    for (const key of [...CORRECT_SCORE_SCORES, ...CORRECT_SCORE_SPECIALS]) {
      if (CORRECT_SCORE_PRESET_ODDS[key] != null) result[key] = String(CORRECT_SCORE_PRESET_ODDS[key]);
    }
  }
  return result;
}

export function initDoubleChanceFromMatch(odds?: Record<string, number>) {
  const result: Record<string, string> = {};
  for (const key of Object.keys(DOUBLE_CHANCE_LABELS)) {
    if (odds?.[key] != null) result[key] = String(odds[key]);
  }
  return result;
}
