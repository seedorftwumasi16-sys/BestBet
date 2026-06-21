/** Production Railway API — single source of truth for deployed backend URL. */
export const RAILWAY_API_URL = "https://bestbet-api-production.up.railway.app";

/** Production Vercel frontend — used for CORS/docs; set FRONTEND_URL on Railway to match. */
export const VERCEL_APP_URL = "https://bestbet-nine.vercel.app";

const LOCAL_API_URL = "http://127.0.0.1:5000";

function isLocalhostUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function pickConfiguredUrl(...candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && !isLocalhostUrl(trimmed)) {
      return normalizeBaseUrl(trimmed);
    }
  }
  return undefined;
}

function isDeployedFrontendHost(hostname: string): boolean {
  return (
    hostname.endsWith(".vercel.app") ||
    hostname === "bestbet-nine.vercel.app" ||
    hostname.endsWith(".bestbet.gh")
  );
}

/**
 * Base URL for REST API calls (no trailing slash).
 * - Browser on Vercel: empty string → same-origin `/api/*` proxy (no CORS).
 * - Browser elsewhere in production: Railway URL or configured NEXT_PUBLIC_API_URL.
 * - Local dev: http://127.0.0.1:5000
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (isDeployedFrontendHost(hostname)) {
      return "";
    }
    const configured = pickConfiguredUrl(process.env.NEXT_PUBLIC_API_URL);
    if (configured) return configured;
    if (process.env.NODE_ENV === "production") return RAILWAY_API_URL;
    return LOCAL_API_URL;
  }

  const configured = pickConfiguredUrl(process.env.API_URL, process.env.NEXT_PUBLIC_API_URL);
  if (configured) return configured;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    return RAILWAY_API_URL;
  }
  return LOCAL_API_URL;
}

/** WebSocket / Socket.io server URL. */
export function getSocketUrl(): string {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (wsUrl && !isLocalhostUrl(wsUrl)) return normalizeBaseUrl(wsUrl);
  if (typeof window !== "undefined" && isDeployedFrontendHost(window.location.hostname)) {
    return RAILWAY_API_URL;
  }
  return getApiBaseUrl() || RAILWAY_API_URL;
}