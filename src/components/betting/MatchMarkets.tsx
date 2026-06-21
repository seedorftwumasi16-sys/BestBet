"use client";

import { cn, formatOdds } from "@/lib/utils";
import { DOUBLE_CHANCE_LABELS } from "@/lib/markets";
import { useBetSlip } from "@/context/BetSlipContext";
import type { Match } from "@/lib/constants";

interface MatchMarketsProps {
  match: Match;
}

export function MatchMarkets({ match }: MatchMarketsProps) {
  const { addSelection, removeSelection, selections } = useBetSlip();
  const suspended = match.bettingSuspended;

  const pick = (market: string, selection: string, odds: number) => {
    if (suspended || !odds) return;
    const id = `${match.id}-${market}-${selection}`;
    if (isSel(market, selection)) {
      removeSelection(id);
      return;
    }
    addSelection({
      id,
      matchId: match.id,
      matchName: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      market,
      selection,
      odds,
    });
  };

  const isSel = (market: string, selection: string) =>
    selections.some((s) => s.matchId === match.id && s.market === market && s.selection === selection);

  const MarketBtn = ({ market, selection, label, odds }: { market: string; selection: string; label: string; odds?: number }) => {
    if (!odds) return null;
    return (
      <button
        onClick={() => pick(market, selection, odds)}
        disabled={suspended}
        className={cn(
          "odds-btn flex-1",
          isSel(market, selection) && "odds-btn-selected",
          suspended && "opacity-40 cursor-not-allowed"
        )}
      >
        <span className="text-[10px] font-medium opacity-70">{label}</span>
        <span className="text-sm font-extrabold tabular-nums">{formatOdds(odds)}</span>
      </button>
    );
  };

  const line = match.odds.overUnderLine ?? 2.5;

  return (
    <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
      {(match.odds.over || match.odds.under) && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-bestbet-gray-muted mb-2">
            Over/Under {line}
          </p>
          <div className="flex gap-2">
            <MarketBtn market="Over/Under" selection={`Over ${line}`} label={`Over ${line}`} odds={match.odds.over} />
            <MarketBtn market="Over/Under" selection={`Under ${line}`} label={`Under ${line}`} odds={match.odds.under} />
          </div>
        </div>
      )}

      {(match.odds.bttsYes || match.odds.bttsNo) && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-bestbet-gray-muted mb-2">Both Teams To Score</p>
          <div className="flex gap-2">
            <MarketBtn market="Both Teams To Score" selection="Yes" label="Yes" odds={match.odds.bttsYes} />
            <MarketBtn market="Both Teams To Score" selection="No" label="No" odds={match.odds.bttsNo} />
          </div>
        </div>
      )}

      {match.odds.doubleChance && Object.keys(match.odds.doubleChance).length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-bestbet-gray-muted mb-2">Double Chance</p>
          <div className="flex gap-2">
            {Object.entries(match.odds.doubleChance).map(([key, odds]) => (
              <MarketBtn
                key={key}
                market="Double Chance"
                selection={DOUBLE_CHANCE_LABELS[key] || key}
                label={DOUBLE_CHANCE_LABELS[key] || key}
                odds={odds}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
