import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "http://localhost:*", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  skip: (req) => {
    const path = `${req.baseUrl || ""}${req.path || ""}`;
    // Auth routes use dedicated authLimiter (avoid double-counting login attempts)
    if (path.includes("/auth")) return true;
    if (!req.headers.authorization) return false;
    return path.includes("/admin");
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email =
      typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
    const ip =
      req.ip ||
      (typeof req.headers["x-forwarded-for"] === "string"
        ? req.headers["x-forwarded-for"].split(",")[0]?.trim()
        : "") ||
      "unknown";
    return email ? `${ip}:${email}` : ip;
  },
  message: { error: "Too many login attempts, please try again in 15 minutes" },
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many login attempts, please try again in 15 minutes" });
  },
});

/** Clear auth rate-limit counter after a successful login/register. */
export async function resetAuthRateLimit(req: {
  ip?: string;
  body?: { email?: string };
  headers: Record<string, string | string[] | undefined>;
}) {
  const ip =
    req.ip ||
    (typeof req.headers["x-forwarded-for"] === "string"
      ? req.headers["x-forwarded-for"].split(",")[0]?.trim()
      : "") ||
    "unknown";
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
  try {
    await authLimiter.resetKey(email ? `${ip}:${email}` : ip);
    await authLimiter.resetKey(ip);
  } catch {
    // non-fatal
  }
}

export const depositLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Too many deposit requests" },
});

const csrfTokens = new Map<string, number>();

export function generateCsrfToken(sessionId: string): string {
  const token = `${sessionId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  csrfTokens.set(token, Date.now() + 3600000);
  return token;
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const token = req.headers["x-csrf-token"] as string;
  if (!token || !csrfTokens.has(token)) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  const expiry = csrfTokens.get(token)!;
  if (Date.now() > expiry) {
    csrfTokens.delete(token);
    return res.status(403).json({ error: "CSRF token expired" });
  }

  next();
}

export function sanitizeInput(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = value.replace(/<[^>]*>/g, "").trim();
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
