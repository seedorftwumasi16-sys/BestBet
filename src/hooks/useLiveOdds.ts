"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getSocketUrl } from "@/lib/config";
import type { MatchApi } from "@/lib/api";

interface LiveOddsUpdate {
  matchId: string;
  odds: { home: number; away: number };
  homeScore?: number;
  awayScore?: number;
  liveMinute?: number;
  liveMinuteDisplay?: string;
  timerPaused?: boolean;
  minuteTickAt?: string | null;
  matchStatus?: "upcoming" | "live" | "finished";
  bettingSuspended?: boolean;
}

export interface MatchFeedUpdate {
  action: "created" | "updated" | "deleted";
  match?: MatchApi;
  matchId?: string;
}

interface UseLiveOddsOptions {
  enabled?: boolean;
  userId?: string;
  roleId?: string;
  onUpdate?: (update: LiveOddsUpdate) => void;
  onMatchFeed?: (update: MatchFeedUpdate) => void;
  onNotification?: (data: { title: string; message: string; type?: string }) => void;
}

export function useLiveOdds({
  enabled = true,
  userId,
  roleId,
  onUpdate,
  onMatchFeed,
  onNotification,
}: UseLiveOddsOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  const onMatchFeedRef = useRef(onMatchFeed);
  const onNotificationRef = useRef(onNotification);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onMatchFeedRef.current = onMatchFeed;
    onNotificationRef.current = onNotification;
  });

  const connect = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;

    const url = getSocketUrl();
    const socket = io(url, { path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      if (userId || roleId) socket.emit("join", { userId, role: roleId });
    });

    socket.on("disconnect", () => setConnected(false));
    socket.on("odds_update", (data: LiveOddsUpdate) => onUpdateRef.current?.(data));
    socket.on("match_updated", (data: MatchFeedUpdate) => onMatchFeedRef.current?.(data));
    socket.on("match_deleted", (data: { matchId: string }) =>
      onMatchFeedRef.current?.({ action: "deleted", matchId: data.matchId })
    );
    socket.on("notification", (data: { title: string; message: string; type?: string }) =>
      onNotificationRef.current?.(data)
    );

    return () => {
      socket.disconnect();
    };
  }, [enabled, userId, roleId]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  return { connected };
}
