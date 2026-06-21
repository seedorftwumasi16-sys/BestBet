"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, BarChart3, Clock, ChevronDown } from "lucide-react";
import { CorrectScorePanel } from "@/components/betting/CorrectScorePanel";
import { MatchMarkets } from "@/components/betting/MatchMarkets";
import { Badge } from "@/components/ui/Badge";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { LeagueLogo } from "@/components/ui/LeagueLogo";
import { useBetSlip } from "@/context/BetSlipContext";
import { formatOdds, formatMatchTime, formatMatchDate, cn } from "@/lib/utils";
import { useLiveMatchMinute } from "@/hooks/useLiveMatchMinute";
import type { Match } from "@/lib/constants";

interface MatchCardProps {
  match: Match;
  compact?: boolean;
  showStats?: boolean;
}

export function MatchCard({ match, showStats = false }: MatchCardProps) {
  const { addSelection, removeSelection, selections } = useBetSlip();
  const [favorited, setFavorited] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [flashOdds, setFlashOdds] = useState<Record<string, "up" | "down" | null>>({});
  const liveTimer = useLiveMatchMinute(match);
  const finished = match.matchStatus === "finished";

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
    if (match.bettingSuspended || finished) return;
    const id = `${match.id}-${type}`;
    if (isSelected(label)) {
      removeSelection(id);
      return;
    }
    addSelection({
      id,
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
      disabled={match.bettingSuspended || finished}
      className={cn(
        "odds-btn",
        isSelected(label) && "odds-btn-selected",
        flashOdds[type] === "up" && "odds-flash-up",
        flashOdds[type] === "down" && "odds-flash-down",
        match.bettingSuspended && "opacity-40 cursor-not-allowed",
        finished && "opacity-40 cursor-not-allowed"
      )}
      aria-label={`${label} at ${formatOdds(odds)}`}
    >
      <span className="text-[10px] font-medium opacity-70">{shortLabel}</span>
      <span className="text-xs sm:text-sm font-extrabold tabular-nums">{formatOdds(odds)}</span>
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
      <div className="px-3 sm:px-4 pt-2.5 sm:pt-3 pb-1.5 sm:pb-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <LeagueLogo
            leagueId={match.leagueId}
            leagueName={match.league}
            badgeUrl={match.leagueBadge}
            alt={match.league}
            className="!w-6 !h-6 md:!w-7 md:!h-7 !rounded-md"
          />
          <span className="text-[11px] sm:text-xs font-semibold text-bestbet-gray-muted truncate">{match.league}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto flex-wrap justify-end">
          {match.isSimulated && (
            <Badge variant="warning" className="uppercase tracking-wide text-[8px] sm:text-[9px] px-1.5 py-0">
              Simulated
            </Badge>
          )}
          {match.bettingSuspended && (
            <Badge variant="danger" className="text-[10px] px-1.5 py-0">Suspended</Badge>
          )}
          {match.isLive ? (
            <Badge variant="live" className="text-[10px] px-1.5 py-0">
              <Clock size={9} className="mr-0.5" />
              {liveTimer.display}
            </Badge>
          ) : finished ? (
            <Badge variant="default" className="text-[10px] px-1.5 py-0">
              FT
            </Badge>
          ) : (
            <span className="text-[10px] sm:text-[11px] font-medium text-bestbet-gray-muted whitespace-nowrap">
              {formatMatchDate(match.startTime)} · {formatMatchTime(match.startTime)}
            </span>
          )}
          <button
            onClick={() => setFavorited(!favorited)}
            className="hidden sm:block p-1 rounded-lg hover:bg-white/5 transition-colors"
            aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              size={14}
              className={favorited ? "fill-bestbet-yellow text-bestbet-yellow" : "text-bestbet-gray-muted"}
            />
          </button>
          {showStats && match.isLive && (
            <button className="hidden sm:block p-1 rounded-lg hover:bg-white/5 transition-colors" aria-label="Match stats">
              <BarChart3 size={14} className="text-bestbet-gray-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Teams & score */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <TeamLogo name={match.homeTeam.name} shortName={match.homeTeam.shortName} logo={match.homeTeam.logo} size="card" />
            <span className="text-xs sm:text-sm font-bold truncate leading-tight">{match.homeTeam.name}</span>
          </div>

          <div className="text-center shrink-0 px-1 sm:px-2">
            {match.isLive && match.homeScore !== undefined ? (
              <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-black/40 border border-white/10">
                <span className="text-base sm:text-xl font-black tabular-nums">{match.homeScore}</span>
                <span className="text-bestbet-gray-muted text-[10px] sm:text-xs font-bold">:</span>
                <span className="text-base sm:text-xl font-black tabular-nums">{match.awayScore}</span>
              </div>
            ) : (
              <span className="text-[10px] sm:text-xs font-bold text-bestbet-yellow/80 tracking-widest">VS</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 justify-end">
            <span className="text-xs sm:text-sm font-bold truncate text-right leading-tight">{match.awayTeam.name}</span>
            <TeamLogo name={match.awayTeam.name} shortName={match.awayTeam.shortName} logo={match.awayTeam.logo} size="card" />
          </div>
        </div>
      </div>

      {showStats && match.stats && match.isLive && (
        <div className="px-3 sm:px-4 pb-2 sm:pb-3 grid grid-cols-3 gap-1.5 sm:gap-2">
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
      <div className="px-3 sm:px-4 pb-1.5 sm:pb-2 flex gap-1.5 sm:gap-2">
        <OddsButton label={match.homeTeam.name} odds={match.odds.home} type="home" shortLabel="1" />
        {match.odds.draw && (
          <OddsButton label="Draw" odds={match.odds.draw} type="draw" shortLabel="X" />
        )}
        <OddsButton label={match.awayTeam.name} odds={match.odds.away} type="away" shortLabel="2" />
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 sm:px-4 pb-2 sm:pb-3 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-semibold text-bestbet-yellow/80 hover:text-bestbet-yellow transition-colors min-h-[32px]"
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
