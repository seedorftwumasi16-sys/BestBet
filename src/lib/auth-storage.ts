const TOKEN_KEY = "bestbet_token";
const REMEMBER_KEY = "bestbet_remember";

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function writeSession(key: string, value: string): boolean {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeLocal(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function removeSession(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getRememberMePreference(): boolean {
  return readLocal(REMEMBER_KEY) === "1";
}

export function getStoredToken(): string | null {
  return readLocal(TOKEN_KEY) || readSession(TOKEN_KEY);
}

export function setStoredToken(token: string | null, remember = true): boolean {
  if (!token) {
    clearStoredAuth();
    return true;
  }

  removeLocal(TOKEN_KEY);
  removeSession(TOKEN_KEY);

  if (remember) {
    writeLocal(REMEMBER_KEY, "1");
    return writeLocal(TOKEN_KEY, token);
  }

  writeLocal(REMEMBER_KEY, "0");
  return writeSession(TOKEN_KEY, token);
}

export function clearStoredAuth(): void {
  removeLocal(TOKEN_KEY);
  removeSession(TOKEN_KEY);
  removeLocal(REMEMBER_KEY);
}

export function normalizeLoginEmail(email: unknown): string {
  return String(email ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}

export function normalizeLoginPassword(password: unknown): string {
  return String(password ?? "").normalize("NFKC").trim();
}

export function isLocalAdminRecoveryHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || process.env.NODE_ENV === "development";
}
