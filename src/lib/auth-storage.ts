const TOKEN_KEY = "bestbet_token";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

function write(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getStoredToken(): string | null {
  return read(TOKEN_KEY);
}

export function setStoredToken(token: string | null): boolean {
  if (!token) {
    clearStoredAuth();
    return true;
  }
  remove(TOKEN_KEY);
  return write(TOKEN_KEY, token);
}

export function clearStoredAuth(): void {
  remove(TOKEN_KEY);
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
