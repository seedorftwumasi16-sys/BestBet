export interface SportsDbLeague {
  idLeague: string;
  strLeague: string;
  strSport: string;
  strLeagueAlternate?: string;
}

export interface SportsDbTeam {
  idTeam: string;
  strTeam: string;
  strTeamShort?: string;
  strBadge?: string;
  strLeague?: string;
  idLeague?: string;
  strCountry?: string;
  strSport?: string;
}

export interface SportsDbEvent {
  idEvent: string;
  strSport: string;
  idLeague: string;
  strLeague: string;
  strLeagueBadge?: string;
  strHomeTeam: string;
  strAwayTeam: string;
  idHomeTeam?: string;
  idAwayTeam?: string;
  strHomeTeamBadge?: string;
  strAwayTeamBadge?: string;
  dateEvent: string;
  strTime?: string;
  strTimestamp?: string;
  intHomeScore?: string | number | null;
  intAwayScore?: string | number | null;
  strStatus?: string;
  strProgress?: string;
}

export interface SportsSyncResult {
  ok: boolean;
  leaguesSynced: number;
  teamsSynced: number;
  eventsSynced: number;
  liveUpdated: number;
  message: string;
  usedFallback: boolean;
  fetchLogs?: string[];
  fixturesImported?: number;
}
