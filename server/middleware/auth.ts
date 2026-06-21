import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getDb } from "../db";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "bestbet-dev-secret";

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, roleId: user.roleId },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

export async function loadUserPermissions(userId: string): Promise<string[]> {
  const db = await getDb();
  const result = await db.query(
    `SELECT p.name FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN users u ON u.role_id = rp.role_id
     WHERE u.id = ?`,
    [userId]
  );
  return result.rows.map((r) => r.name as string);
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string; roleId: string };
    const permissions = await loadUserPermissions(decoded.id);
    req.user = { ...decoded, permissions };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requirePermission(...perms: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    if (req.user.roleId === "super_admin") return next();
    const hasAll = perms.every((p) => req.user!.permissions.includes(p));
    if (!hasAll) return res.status(403).json({ error: "Insufficient permissions" });
    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    if (!roles.includes(req.user.roleId)) return res.status(403).json({ error: "Insufficient role" });
    next();
  };
}

export async function logAudit(userId: string | null, action: string, details?: string) {
  const db = await getDb();
  const { v4: uuidv4 } = await import("uuid");
  await db.query(`INSERT INTO audit_logs (id, user_id, action, details) VALUES (?, ?, ?, ?)`, [uuidv4(), userId, action, details ?? null]);
}
