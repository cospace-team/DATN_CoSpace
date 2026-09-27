import React, { useState, useEffect, useRef } from 'react';
import {
  FiBell,
  FiCheck,
  FiInfo,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiUsers,
  FiMessageSquare,
  FiCreditCard,
} from 'react-icons/fi';
import { API_BASE_URL } from '../../config/api';

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// Memoized: it takes no props, so it only needs to re-render on its own state/context changes,
// not every time the AppShell header re-renders (sidebar/theme toggles, navigation).
export const NotificationBell = React.memo(function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('workhub_access_token');
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: NotificationItem[] = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
      }
    } catch {
      // offline fallback: quiet
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('workhub_access_token');
      if (!token) return;

      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.warn('Cannot mark notification read:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('workhub_access_token');
      if (!token) return;

      await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.warn('Cannot mark all read:', e);
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'BOOKING_CONFIRMED':
        return {
          icon: <FiCheckCircle className="h-4 w-4" />,
          colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          badge: 'Đặt chỗ',
        };
      case 'BOOKING_REMINDER':
        return {
          icon: <FiClock className="h-4 w-4" />,
          colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
          badge: 'Nhắc nhở',
        };
      case 'REFUND':
      case 'REFUND_PROCESSED':
        return {
          icon: <FiDollarSign className="h-4 w-4" />,
          colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          badge: 'Hoàn tiền',
        };
      case 'PARTNER_MATCH':
        return {
          icon: <FiUsers className="h-4 w-4" />,
          colorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
          badge: 'Kết nối',
        };
      case 'COMMUNITY_POST':
        return {
          icon: <FiMessageSquare className="h-4 w-4" />,
          colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
          badge: 'Cộng đồng',
        };
      case 'BOOKING_CANCEL':
        return {
          icon: <FiAlertCircle className="h-4 w-4" />,
          colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
          badge: 'Hủy đơn',
        };
      case 'PAYMENT':
        return {
          icon: <FiCreditCard className="h-4 w-4" />,
          colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          badge: 'Giao dịch',
        };
      default:
        return {
          icon: <FiInfo className="h-4 w-4" />,
          colorClass: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
          badge: 'Hệ thống',
        };
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Vừa xong';
      if (diffMin < 60) return `${diffMin} phút trước`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return date.toLocaleDateString('vi-VN');
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer"
        aria-label="Thông báo"
        title="Thông báo hệ thống"
      >
        <FiBell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-card border border-border/80 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-foreground">Thông báo</h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 text-primary">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <FiCheck className="h-3.5 w-3.5" /> Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <FiBell className="h-6 w-6 text-muted-foreground opacity-40" />
                </div>
                <p className="text-xs font-semibold text-foreground">Chưa có thông báo nào</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Các thông tin về đơn đặt chỗ, hoàn tiền và đối tác sẽ hiển thị tại đây
                </p>
              </div>
            ) : (
              notifications.map(item => {
                const config = getTypeConfig(item.type);
                return (
                  <div
                    key={item.id}
                    onClick={() => !item.isRead && markAsRead(item.id)}
                    className={`p-3.5 transition-colors cursor-pointer hover:bg-muted/50 flex gap-3 items-start ${
                      !item.isRead ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div
                      className={`mt-0.5 shrink-0 rounded-xl p-2 border shadow-sm ${config.colorClass}`}
                      title={config.badge}
                    >
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p
                          className={`text-xs ${
                            !item.isRead
                              ? 'font-bold text-foreground'
                              : 'font-semibold text-muted-foreground'
                          }`}
                        >
                          {item.title}
                        </p>
                        <span className="text-[10px] font-medium text-muted-foreground/70 shrink-0">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/90 line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                    {!item.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
});
