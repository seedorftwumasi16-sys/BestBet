"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Notification } from "@/lib/constants";
import { isAdminRole } from "@/lib/constants";
import { authApi, notificationsApi, setToken, type NotificationApi } from "@/lib/api";
import { clearStoredAuth, getStoredToken } from "@/lib/auth-storage";

function mapApiUser(u: Record<string, unknown>): User {
  return {
    id: u.id as string,
    name: u.name as string,
    email: u.email as string,
    balance: Number(u.balance ?? 0),
    roleId: (u.roleId as string) || undefined,
  };
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string; referralCode?: string }) => Promise<void>;
  markNotificationRead: (id: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapNotification(n: NotificationApi): Notification {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type as Notification["type"],
    read: n.read === true || n.read === 1,
    date: new Date(n.created_at),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data.map(mapNotification));
    } catch {
      setNotifications([]);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser({
        id: me.id as string,
        name: me.name as string,
        email: me.email as string,
        balance: Number(me.balance ?? 0),
        roleId: (me.roleId as string) || undefined,
      });
      await loadNotifications();
    } catch {
      setUser(null);
      setToken(null);
      clearStoredAuth();
      setNotifications([]);
    }
  }, [loadNotifications]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? getStoredToken() : null;
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
    const { token, user: u } = await authApi.login(email, password);
    setToken(token);
    const user = mapApiUser(u);
    setUser(user);
    await loadNotifications();
    return user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    setToken(null);
    setUser(null);
    setNotifications([]);
  };

  const register = async (data: { name: string; email: string; password: string; phone?: string; referralCode?: string }) => {
    const { token, user: u } = await authApi.register(data);
    setToken(token);
    setUser(mapApiUser(u));
  };

  const markNotificationRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
    } catch {
      // ignore
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isAdmin: isAdminRole(user?.roleId),
        notifications,
        unreadCount,
        loading,
        login,
        logout,
        register,
        markNotificationRead,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
