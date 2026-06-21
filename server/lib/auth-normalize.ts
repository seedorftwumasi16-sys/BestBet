import { PROTECTED_SUPER_ADMIN_EMAIL } from "./super-admin";

export function normalizeAuthEmail(email: unknown): string {
  return String(email ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}

export function normalizeAuthPassword(password: unknown): string {
  return String(password ?? "").normalize("NFKC").trim();
}

export function isProtectedAdminEmail(email: unknown): boolean {
  return normalizeAuthEmail(email) === PROTECTED_SUPER_ADMIN_EMAIL;
}

export function isMobileUserAgent(userAgent: string | undefined): boolean {
  const ua = String(userAgent ?? "").toLowerCase();
  return /iphone|ipad|ipod|android|mobile|webos|blackberry|iemobile|opera mini/i.test(ua);
}
