import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import type { Server as SocketServer } from "socket.io";

let io: SocketServer | null = null;

export function setSocketServer(server: SocketServer) {
  io = server;
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "promo" = "info"
) {
  const db = await getDb();
  const id = uuidv4();
  await db.query(
    `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)`,
    [id, userId, title, message, type]
  );

  if (io) {
    io.to(`user:${userId}`).emit("notification", { id, title, message, type, read: false, createdAt: new Date().toISOString() });
  }

  return id;
}

export async function notifyAdmins(title: string, message: string, type: "info" | "warning" = "info") {
  const db = await getDb();
  const admins = await db.query(`SELECT id FROM users WHERE role_id IN ('super_admin', 'sub_admin')`);
  for (const admin of admins.rows) {
    await createNotification(admin.id as string, title, message, type);
  }
  if (io) {
    io.to("admins").emit("admin_alert", { title, message, type });
  }
}
