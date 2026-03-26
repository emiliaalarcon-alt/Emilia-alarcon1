import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";

export type NotifType = "alumno_eliminado" | "cupo_disponible";

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  sede: string;
  horarioId: string;
}

interface Toast extends AppNotification {
  expiresAt: number;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  toasts: Toast[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  removeNotification: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const STORAGE_KEY = "horario-notificaciones";
const TOAST_DURATION = 5000;

function loadStored(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function saveStored(notifications: AppNotification[]) {
  const trimmed = notifications.slice(0, 200);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(loadStored);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    saveStored(notifications);
  }, [notifications]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timerRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerRef.current.delete(id);
    }
  }, []);

  const addNotification = useCallback((n: Omit<AppNotification, "id" | "timestamp" | "read">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const notif: AppNotification = {
      ...n,
      id,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => [notif, ...prev]);

    const toast: Toast = { ...notif, expiresAt: Date.now() + TOAST_DURATION };
    setToasts(prev => [...prev.slice(-4), toast]);

    const timer = setTimeout(() => dismissToast(id), TOAST_DURATION);
    timerRef.current.set(id, timer);
  }, [dismissToast]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      toasts,
      unreadCount,
      addNotification,
      removeNotification,
      markRead,
      markAllRead,
      clearAll,
      dismissToast,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
  return ctx;
}
