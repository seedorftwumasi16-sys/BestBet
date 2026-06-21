"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useBetSlip } from "@/context/BetSlipContext";
import { formatOdds, formatMatchTime, formatMatchDate, cn } from "@/lib/utils";
import type { Match } from "@/lib/constants";

interface MatchCardProps {
  match: Match;
  compact?: boolean;
  showStats?: boolean;
}

export function MatchCard({ match, compact = false, showStats = false }: MatchCardProps) {
  const { addSelection, selections } = useBetSlip();
  const [favorited, setFavorited] = useState(false);
  const [flashOdds, setFlashOdds] = useState<Record<string, "up" | "down" | null>>({});

  useEffect(() => {
    if (!match.isLive) return;
    const interval = setInterval(() => {
      const keys = ["home", ...(match.odds.draw ? ["draw"] : []), "away"];
      const key = keys[Math.floor(Math.random() * keys.length)];
      const direction = Math.random() > 0.5 ? "up" : "down";
      setFlashOdds((prev) => ({ ...prev, [key]: direction as "up" | "down" }));
      setTimeout(() => setFlashOdds((prev) => ({ ...prev, [key]: null })), 850);
    }, 3500);
    return () => clearInterval(interval);
  }, [match.isLive, match.odds.draw]);

  const isSelected = (type: string) =>
    selections.some((s) => s.matchId === match.id && s.selection === type);

  const handleOddsClick = (type: string, odds: number, label: string) => {
    addSelection({
      id: `${match.id}-${type}`,
      matchId: match.id,
      matchName: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      market: "Match Result",
      selection: label,
      odds,
    });
  };

  const simulateOddsChange = (key: string) => {
    const direction = Math.random() > 0.5 ? "up" : "down";
    setFlashOdds((prev) => ({ ...prev, [key]: direction }));
    setTimeout(() => setFlashOdds((prev) => ({ ...prev, [key]: null })), 800);
  };

  const OddsButton = ({
    label,
    odds,
    type,
    shortLabel,
  }: {
    label: string;
    odds: number;
    type: string;
    shortLabel: string;
  }) => (
    <button
      onClick={() => handleOddsClick(type, odds, label)}
      className={cn(
        "flex-1 flex flex-col items-center justify-center py-2.5 px-2 rounded-lg transition-all duration-200",
        "hover:bg-bestbet-yellow hover:text-bestbet-black active:scale-95",
        isSelected(label)
          ? "bg-bestbet-yellow text-bestbet-black ring-2 ring-bestbet-yellow/50"
          : "bg-[var(--odds-bg)] text-[var(--odds-text)]",
        flashOdds[type] === "up" && "odds-flash-up",
        flashOdds[type] === "down" && "odds-flash-down"
      )}
      aria-label={`${label} at ${formatOdds(odds)}`}
    >
      <span className="text-[10px] text-bestbet-gray-muted mb-0.5">{shortLabel}</span>
      <span className="text-sm font-bold">{formatOdds(odds)}</span>
    </button>
  );

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="card-premium overflow-hidden group"
    >
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {match.isLive ? (
            <Badge variant="live">Live {match.liveMinute}&apos;</Badge>
          ) : (
            <span className="text-xs text-bestbet-gray-muted">
              {formatMatchDate(match.startTime)} · {formatMatchTime(match.startTime)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-bestbet-gray-muted">{match.league}</span>
          <button
            onClick={() => setFavorited(!favorited)}
            className="p-1 rounded hover:bg-[var(--card-hover)] transition-colors"
            aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              size={14}
              className={favorited ? "fill-bestbet-yellow text-bestbet-yellow" : "text-bestbet-gray-muted"}
            />
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <span className="text-2xl shrink-0">{match.homeTeam.logo}</span>
            <span className="text-sm font-semibold truncate">{match.homeTeam.name}</span>
          </div>

          <div className="text-center shrink-0 px-2">
            {match.isLive && match.homeScore !== undefined ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-black">{match.homeScore}</span>
                <span className="text-bestbet-gray-muted text-xs">-</span>
                <span className="text-lg font-black">{match.awayScore}</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-bestbet-gray-muted">VS</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
            <span className="text-sm font-semibold truncate text-right">{match.awayTeam.name}</span>
            <span className="text-2xl shrink-0">{match.awayTeam.logo}</span>
          </div>
        </div>
      </div>

      {showStats && match.stats && match.isLive && (
        <div className="px-4 pb-2 grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Possession", values: match.stats.possession, suffix: "%" },
            { label: "Shots", values: match.stats.shots },
            { label: "Corners", values: match.stats.corners },
          ].map((stat) => (
            <div key={stat.label} className="text-[10px]">
              <p className="text-bestbet-gray-muted mb-0.5">{stat.label}</p>
              <p className="font-bold">
                {stat.values[0]}{stat.suffix || ""} - {stat.values[1]}{stat.suffix || ""}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 pb-3 flex gap-2">
        <OddsButton label={match.homeTeam.name} odds={match.odds.home} type="home" shortLabel="1" />
        {match.odds.draw && (
          <OddsButton label="Draw" odds={match.odds.draw} type="draw" shortLabel="X" />
        )}
        <OddsButton label={match.awayTeam.name} odds={match.odds.away} type="away" shortLabel="2" />
      </div>
    </motion.div>
  );
}

export function TrendingBetCard({
  selection,
  match,
  odds,
  bets,
}: {
  selection: string;
  match: string;
  odds: number;
  bets: number;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="card-premium p-3 cursor-pointer"
    >
      <p className="text-sm font-semibold truncate">{selection}</p>
      <p className="text-xs text-bestbet-gray-muted truncate mt-0.5">{match}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm font-bold text-bestbet-yellow">{formatOdds(odds)}</span>
        <span className="text-[10px] text-bestbet-gray-muted flex items-center gap-1">
          <TrendingUp size={10} /> {bets.toLocaleString()} bets
        </span>
      </div>
    </motion.div>
  );
}
