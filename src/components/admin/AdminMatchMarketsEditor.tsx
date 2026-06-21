"use client";

import { Input } from "@/components/ui/Input";
import {
  CORRECT_SCORE_LABELS,
  CORRECT_SCORE_SCORES,
  CORRECT_SCORE_SPECIALS,
  DOUBLE_CHANCE_LABELS,
  MARKET_TAB_LABELS,
  MARKET_TABS,
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
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-80 overflow-y-auto pr-1">
          {[...CORRECT_SCORE_SCORES, ...CORRECT_SCORE_SPECIALS].map((key) => (
            <Input
              key={key}
              label={CORRECT_SCORE_LABELS[key]}
              type="number"
              step="0.01"
              value={correctScoreOdds[key] || ""}
              onChange={(e) => setCorrectScoreOdds((prev) => ({ ...prev, [key]: e.target.value }))}
            />
          ))}
        </div>
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
    if (v) correctScore[k] = Number(v);
  }
  const doubleChance: Record<string, number> = {};
  for (const [k, v] of Object.entries(doubleChanceOdds)) {
    if (v) doubleChance[k] = Number(v);
  }
  return { correctScoreOdds: correctScore, doubleChanceOdds: doubleChance };
}

export function initCorrectScoreFromMatch(odds?: Record<string, number>) {
  const result: Record<string, string> = {};
  for (const key of [...CORRECT_SCORE_SCORES, ...CORRECT_SCORE_SPECIALS]) {
    if (odds?.[key] != null) result[key] = String(odds[key]);
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
