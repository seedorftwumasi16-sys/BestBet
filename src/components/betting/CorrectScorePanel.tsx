"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn, formatOdds } from "@/lib/utils";
import { CORRECT_SCORE_LABELS, CORRECT_SCORE_SCORES, CORRECT_SCORE_SPECIALS } from "@/lib/markets";
import { useBetSlip } from "@/context/BetSlipContext";
import type { Match } from "@/lib/constants";

interface CorrectScorePanelProps {
  match: Match;
}

export function CorrectScorePanel({ match }: CorrectScorePanelProps) {
  const { addSelection, removeSelection, selections } = useBetSlip();
  const [activeTab, setActiveTab] = useState<"grid" | "specials">("grid");
  const odds = match.odds.correctScore || {};

  const homeScores = CORRECT_SCORE_SCORES.filter((s) => {
    const [h, a] = s.split("-").map(Number);
    return h >= a;
  });
  const awayScores = CORRECT_SCORE_SCORES.filter((s) => {
    const [h, a] = s.split("-").map(Number);
    return a > h;
  });

  const pick = (key: string, label: string, value: number) => {
    if (match.bettingSuspended || !value) return;
    const id = `${match.id}-cs-${key}`;
    if (isSelected(label)) {
      removeSelection(id);
      return;
    }
    addSelection({
      id,
      matchId: match.id,
      matchName: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      market: "Correct Score",
      selection: label,
      odds: value,
    });
  };

  const isSelected = (label: string) =>
    selections.some((s) => s.matchId === match.id && s.market === "Correct Score" && s.selection === label);

  const ScoreBtn = ({ scoreKey, label }: { scoreKey: string; label: string }) => {
    const value = odds[scoreKey];
    if (!value) return null;
    return (
      <button
        onClick={() => pick(scoreKey, label, value)}
        disabled={match.bettingSuspended}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border px-2 py-2.5 transition-all min-h-[52px]",
          "border-white/10 bg-white/[0.03] hover:border-bestbet-yellow/40 hover:bg-bestbet-yellow/5",
          isSelected(label) && "border-bestbet-yellow bg-bestbet-yellow/15 shadow-[0_0_12px_rgba(255,215,0,0.15)]",
          match.bettingSuspended && "opacity-40 cursor-not-allowed"
        )}
      >
        <span className="text-[11px] font-bold text-bestbet-gray-muted">{label}</span>
        <span className="text-sm font-extrabold text-bestbet-yellow tabular-nums">{formatOdds(value)}</span>
      </button>
    );
  };

  if (Object.keys(odds).length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="border-t border-white/5 px-4 pb-4 pt-3"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-bestbet-yellow">Correct Score</h4>
        <div className="flex gap-1">
          {(["grid", "specials"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-2 py-1 rounded text-[10px] font-semibold uppercase",
                activeTab === tab ? "bg-bestbet-yellow text-black" : "text-bestbet-gray-muted hover:text-white"
              )}
            >
              {tab === "grid" ? "Scores" : "Specials"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "grid" ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-semibold text-bestbet-gray-muted mb-2 uppercase">{match.homeTeam.shortName}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {homeScores.map((s) => (
                <ScoreBtn key={s} scoreKey={s} label={CORRECT_SCORE_LABELS[s]} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-bestbet-gray-muted mb-2 uppercase text-right">{match.awayTeam.shortName}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {awayScores.map((s) => (
                <ScoreBtn key={s} scoreKey={s} label={CORRECT_SCORE_LABELS[s]} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {CORRECT_SCORE_SPECIALS.map((key) => (
            <ScoreBtn key={key} scoreKey={key} label={CORRECT_SCORE_LABELS[key]} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
