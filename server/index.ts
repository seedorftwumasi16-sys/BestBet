import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { Server as SocketServer } from "socket.io";
import dotenv from "dotenv";
import { migrate } from "./db/migrate";
import seed from "./db/seed";
import { getDb } from "./db";
import { boolFrom } from "./db/helpers";
import { initRedis } from "./services/redis";
import { setSocketServer } from "./services/notifications";
import { securityHeaders, apiLimiter } from "./middleware/security";
import healthRoutes from "./routes/health";
import authRoutes from "./routes/auth";
import betsRoutes from "./routes/bets";
import walletsRoutes from "./routes/wallets";
import adminRoutes from "./routes/admin";
import notificationsRoutes from "./routes/notifications";
import matchesRoutes from "./routes/matches";
import contentRoutes from "./routes/content";
import supportRoutes from "./routes/support";
import sportsRoutes from "./routes/sports";
import { startSportsSyncScheduler } from "./services/sports-sync";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.set("trust proxy", 1);
app.use(securityHeaders);
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;

  const allowed = [
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGINS || "").split(","),
  ]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];

  if (allowed.some((entry) => origin === entry)) return true;

  try {
    const hostname = new URL(origin).hostname;
    if (hostname.endsWith(".vercel.app")) return true;
  } catch {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.resolve(process.env.UPLOAD_DIR || "./uploads")));
app.use("/api", apiLimiter);

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bets", betsRoutes);
app.use("/api/wallets", walletsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/matches", matchesRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/sports", sportsRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/socket.io",
});

setSocketServer(io);

io.on("connection", (socket) => {
  socket.on("join", (data: { userId?: string; role?: string }) => {
    if (data.userId) socket.join(`user:${data.userId}`);
    if (data.role === "super_admin" || data.role === "sub_admin") socket.join("admins");
  });
});

async function broadcastLiveUpdates() {
  try {
    const db = await getDb();
    const result = await db.query(`SELECT * FROM matches WHERE match_status = 'live' OR is_live = TRUE`);

    for (const match of result.rows) {
      if (boolFrom(match, "betting_suspended")) continue;

      const oddsChange = {
        home: +(Number(match.odds_home) + (Math.random() - 0.5) * 0.1).toFixed(2),
        away: +(Number(match.odds_away) + (Math.random() - 0.5) * 0.1).toFixed(2),
      };

      await db.query(`UPDATE matches SET odds_home = ?, odds_away = ? WHERE id = ?`, [oddsChange.home, oddsChange.away, match.id]);

      io.emit("odds_update", {
        matchId: match.id,
        odds: oddsChange,
        homeScore: match.home_score,
        awayScore: match.away_score,
        liveMinute: match.live_minute,
      });
    }
  } catch (err) {
    console.error("[Socket.io] broadcast error:", err);
  }
}

async function start() {
  try {
    await initRedis();
    await migrate();
    await seed();

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`[Server] BestBet API running on port ${PORT}`);
      console.log(`[Server] Health: http://localhost:${PORT}/api/health`);
      console.log(`[Server] Socket.io: http://localhost:${PORT}/socket.io`);
      console.log(`[Server] Mobile Money: ${process.env.MOMO_NUMBER || "0203907314"} (${process.env.MOMO_RECIPIENT_NAME || "RAHAMATU NUHU"})`);
    });

    setInterval(broadcastLiveUpdates, 5000);
    startSportsSyncScheduler();
  } catch (err) {
    console.error("[Server] Failed to start:", err);
    process.exit(1);
  }
}

start();

export { app, server, io };
