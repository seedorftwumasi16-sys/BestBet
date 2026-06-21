"use client";

import { motion } from "framer-motion";
import { cn, formatOdds } from "@/lib/utils";
import { formatCorrectScoreLabel } from "@/lib/markets";
import { useBetSlip } from "@/context/BetSlipContext";
import type { Match } from "@/lib/constants";

interface CorrectScorePanelProps {
  match: Match;
}

export function CorrectScorePanel({ match }: CorrectScorePanelProps) {
  const { addSelection, removeSelection, selections } = useBetSlip();
  const odds = match.odds.correctScore || {};
  const entries = Object.entries(odds).filter(([, value]) => Number(value) > 0);

  const pick = (key: string, label: string, value: number) => {
    if (match.bettingSuspended || match.matchStatus === "finished" || !value) return;
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

  if (entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="border-t border-white/5 px-3 sm:px-4 pb-4 pt-3"
    >
      <h4 className="text-xs font-bold uppercase tracking-wider text-bestbet-yellow mb-3">Correct Score</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto overscroll-contain pr-1">
        {entries.map(([key, value]) => {
          const label = formatCorrectScoreLabel(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => pick(key, label, value)}
              disabled={match.bettingSuspended || match.matchStatus === "finished"}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border px-2 py-2.5 transition-all min-h-[52px]",
                "border-white/10 bg-white/[0.03] hover:border-bestbet-yellow/40 hover:bg-bestbet-yellow/5",
                isSelected(label) && "border-bestbet-yellow bg-bestbet-yellow/15 shadow-[0_0_12px_rgba(255,215,0,0.15)]",
                match.bettingSuspended && "opacity-40 cursor-not-allowed"
              )}
            >
              <span className="text-[11px] font-bold text-bestbet-gray-muted text-center leading-tight">{label}</span>
              <span className="text-sm font-extrabold text-bestbet-yellow tabular-nums">{formatOdds(value)}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
