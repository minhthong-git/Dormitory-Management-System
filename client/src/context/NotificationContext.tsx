import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { notificationApi, type Notification } from '@/api/notification.api';

// ── Context Shape ──────────────────────────────────────────────
interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (page?: number) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  hasMore: boolean;
  currentPage: number;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ── Fetch unread count ─────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await notificationApi.getUnreadCount();
      setUnreadCount(data.data.count);
    } catch {
      // silent
    }
  }, []);

  // ── Fetch notifications list ───────────────────────────────
  const fetchNotifications = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const { data } = await notificationApi.getAll({ page, limit: 20 });
      if (page === 1) {
        setNotifications(data.data);
      } else {
        setNotifications((prev) => [...prev, ...data.data]);
      }
      setCurrentPage(page);
      setTotalPages(data.pagination.totalPages);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Initial fetch on auth ──────────────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      fetchNotifications(1);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchUnreadCount, fetchNotifications]);

  // ── Socket.IO real-time listeners ──────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      // Thêm vào đầu danh sách
      setNotifications((prev) => [notification, ...prev]);
    };

    const handleUnreadCount = (data: { count: number }) => {
      setUnreadCount(data.count);
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:unread-count', handleUnreadCount);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:unread-count', handleUnreadCount);
    };
  }, [socket]);

  // ── Mark as read ───────────────────────────────────────────
  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  }, []);

  // ── Mark all as read ───────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, []);

  // ── Delete notification ────────────────────────────────────
  const deleteNotification = useCallback(async (id: string) => {
    try {
      const notif = notifications.find((n) => n.id === id);
      await notificationApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (notif && !notif.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // silent
    }
  }, [notifications]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      hasMore: currentPage < totalPages,
      currentPage,
    }),
    [notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead, deleteNotification, currentPage, totalPages]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// ── Hook ───────────────────────────────────────────────────────
export const useNotifications = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
};
