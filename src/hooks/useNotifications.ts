import { useCallback, useEffect, useState } from "react";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from "@/lib/realtime";

type NotificationsState = {
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => void;
};

export function useNotifications(userId: string | null): NotificationsState {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setUnread(0);
      return;
    }
    setLoading(true);
    try {
      const res = await listNotifications();
      if (res.authenticated) {
        setItems(res.items);
        setUnread(res.unread);
      }
    } catch {
      /* keep stale data */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // Poll so new mention notifications surface without waiting for a reload.
  useEffect(() => {
    if (!userId) return;
    const timer = setInterval(() => void fetchNotifications(), 15_000);
    return () => clearInterval(timer);
  }, [userId, fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead({ data: { id } });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }, []);

  return { items, unread, loading, markRead, markAllRead, refresh: fetchNotifications };
}
