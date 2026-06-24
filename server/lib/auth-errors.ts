import type { Response } from "express";

const FRIENDLY: Record<string, string> = {
  user_not_found: "Invalid email or password",
  invalid_password: "Invalid email or password",
  account_banned: "This account has been banned. Contact support for help.",
  account_suspended: "This account is suspended. Contact support for help.",
  missing_credentials: "Email and password are required",
  rate_limited: "Too many login attempts. Please wait a few minutes and try again.",
  login_failed: "Unable to sign in right now. Please try again.",
  token_invalid: "Your session has expired. Please log in again.",
};

export function friendlyAuthMessage(code: string, fallback = "Authentication failed"): string {
  return FRIENDLY[code] ?? fallback;
}

export function sendAuthError(
  res: Response,
  status: number,
  code: string,
  devMessage: string,
  extra?: Record<string, unknown>
) {
  const isDev = process.env.NODE_ENV !== "production";
  const payload: Record<string, unknown> = {
    error: isDev ? devMessage : friendlyAuthMessage(code, devMessage),
  };
  if (isDev) {
    payload.reason = code;
    payload.detail = devMessage;
    if (extra) Object.assign(payload, extra);
  } else if (extra?.authBuild) {
    payload.authBuild = extra.authBuild;
  }
  res.status(status).json(payload);
}

export function isLocalOrRecoveryRequest(req: {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}): boolean {
  if (process.env.NODE_ENV !== "production") return true;

  const ip = String(req.ip ?? "");
  const forwarded = String(req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim();
  const localIps = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];
  if (localIps.includes(ip) || localIps.includes(forwarded)) return true;

  const host = String(req.headers.host ?? "").toLowerCase();
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return true;

  const recoveryKey = process.env.ADMIN_RECOVERY_KEY;
  const headerKey = req.headers["x-admin-recovery-key"];
  if (recoveryKey && headerKey === recoveryKey) return true;

  return false;
}
