"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

interface LiveOddsUpdate {
  matchId: string;
  odds: { home: number; away: number };
  homeScore?: number;
  awayScore?: number;
  liveMinute?: number;
}

interface UseLiveOddsOptions {
  enabled?: boolean;
  userId?: string;
  roleId?: string;
  onUpdate?: (update: LiveOddsUpdate) => void;
  onNotification?: (data: { title: string; message: string; type?: string }) => void;
}

export function useLiveOdds({ enabled = true, userId, roleId, onUpdate, onNotification }: UseLiveOddsOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;

    const url = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
    const socket = io(url, { path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      if (userId || roleId) socket.emit("join", { userId, role: roleId });
    });

    socket.on("disconnect", () => setConnected(false));
    socket.on("odds_update", (data: LiveOddsUpdate) => onUpdate?.(data));
    socket.on("notification", (data: { title: string; message: string; type?: string }) => onNotification?.(data));

    return () => {
      socket.disconnect();
    };
  }, [enabled, userId, roleId, onUpdate, onNotification]);

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
