"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, BarChart3, Clock, ChevronDown } from "lucide-react";
import { CorrectScorePanel } from "@/components/betting/CorrectScorePanel";
import { MatchMarkets } from "@/components/betting/MatchMarkets";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { useBetSlip } from "@/context/BetSlipContext";
import { formatOdds, formatMatchTime, formatMatchDate, cn } from "@/lib/utils";
import { getLeagueBadgeUrl } from "@/lib/sports-assets";
import type { Match } from "@/lib/constants";

interface MatchCardProps {
  match: Match;
  compact?: boolean;
  showStats?: boolean;
}

export function MatchCard({ match, showStats = false }: MatchCardProps) {
  const { addSelection, selections } = useBetSlip();
  const [favorited, setFavorited] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [flashOdds, setFlashOdds] = useState<Record<string, "up" | "down" | null>>({});
  const leagueBadge = getLeagueBadgeUrl(match.leagueId, match.league);

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
    if (match.bettingSuspended) return;
    addSelection({
      id: `${match.id}-${type}`,
      matchId: match.id,
      matchName: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      market: "Match Result",
      selection: label,
      odds,
    });
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
      disabled={match.bettingSuspended}
      className={cn(
        "odds-btn",
        isSelected(label) && "odds-btn-selected",
        flashOdds[type] === "up" && "odds-flash-up",
        flashOdds[type] === "down" && "odds-flash-down",
        match.bettingSuspended && "opacity-40 cursor-not-allowed"
      )}
      aria-label={`${label} at ${formatOdds(odds)}`}
    >
      <span className="text-[10px] font-medium opacity-70">{shortLabel}</span>
      <span className="text-sm font-extrabold tabular-nums">{formatOdds(odds)}</span>
    </button>
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="match-card-premium group"
    >
      {/* Header */}
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-6 h-6 shrink-0">
            <Image src={leagueBadge} alt={match.league} fill unoptimized className="object-contain" />
          </div>
          <span className="text-xs font-semibold text-bestbet-gray-muted truncate">{match.league}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {match.bettingSuspended && (
            <Badge variant="danger">Suspended</Badge>
          )}
          {match.isLive ? (
            <Badge variant="live">
              <Clock size={10} className="mr-0.5" />
              {match.liveMinute}&apos;
            </Badge>
          ) : (
            <span className="text-[11px] font-medium text-bestbet-gray-muted">
              {formatMatchDate(match.startTime)} · {formatMatchTime(match.startTime)}
            </span>
          )}
          <button
            onClick={() => setFavorited(!favorited)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              size={15}
              className={favorited ? "fill-bestbet-yellow text-bestbet-yellow" : "text-bestbet-gray-muted"}
            />
          </button>
          {showStats && match.isLive && (
            <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" aria-label="Match stats">
              <BarChart3 size={15} className="text-bestbet-gray-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Teams & score */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <TeamLogo name={match.homeTeam.name} shortName={match.homeTeam.shortName} logo={match.homeTeam.logo} size="lg" />
            <span className="text-sm font-bold truncate leading-tight">{match.homeTeam.name}</span>
          </div>

          <div className="text-center shrink-0 px-2">
            {match.isLive && match.homeScore !== undefined ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
                <span className="text-xl font-black tabular-nums">{match.homeScore}</span>
                <span className="text-bestbet-gray-muted text-xs font-bold">:</span>
                <span className="text-xl font-black tabular-nums">{match.awayScore}</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-bestbet-yellow/80 tracking-widest">VS</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 min-w-0 justify-end">
            <span className="text-sm font-bold truncate text-right leading-tight">{match.awayTeam.name}</span>
            <TeamLogo name={match.awayTeam.name} shortName={match.awayTeam.shortName} logo={match.awayTeam.logo} size="lg" />
          </div>
        </div>
      </div>

      {showStats && match.stats && match.isLive && (
        <div className="px-4 pb-3 grid grid-cols-3 gap-2">
          {[
            { label: "Possession", values: match.stats.possession, suffix: "%" },
            { label: "Shots", values: match.stats.shots },
            { label: "Corners", values: match.stats.corners },
          ].map((stat) => (
            <div key={stat.label} className="text-center py-2 rounded-lg bg-white/[0.03] border border-white/5">
              <p className="text-[10px] text-bestbet-gray-muted mb-0.5 uppercase tracking-wide">{stat.label}</p>
              <p className="text-xs font-bold tabular-nums">
                {stat.values[0]}{stat.suffix || ""} - {stat.values[1]}{stat.suffix || ""}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Odds */}
      <div className="px-4 pb-2 flex gap-2">
        <OddsButton label={match.homeTeam.name} odds={match.odds.home} type="home" shortLabel="1" />
        {match.odds.draw && (
          <OddsButton label="Draw" odds={match.odds.draw} type="draw" shortLabel="X" />
        )}
        <OddsButton label={match.awayTeam.name} odds={match.odds.away} type="away" shortLabel="2" />
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 pb-3 flex items-center justify-center gap-1 text-[11px] font-semibold text-bestbet-yellow/80 hover:text-bestbet-yellow transition-colors"
      >
        {expanded ? "Hide Markets" : "More Markets"}
        <ChevronDown size={14} className={cn("transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <>
          <MatchMarkets match={match} />
          {match.sport === "football" && <CorrectScorePanel match={match} />}
        </>
      )}
    </motion.article>
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
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="promo-card-premium cursor-pointer">
      <p className="relative text-sm font-bold truncate">{selection}</p>
      <p className="relative text-xs text-bestbet-gray-muted truncate mt-1">{match}</p>
      <div className="relative flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <span className="text-base font-extrabold text-bestbet-yellow tabular-nums">{formatOdds(odds)}</span>
        <span className="text-[10px] text-bestbet-gray-muted">{bets.toLocaleString()} bets</span>
      </div>
    </motion.div>
  );
}
