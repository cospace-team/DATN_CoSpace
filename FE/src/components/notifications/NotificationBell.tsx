import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiCheck, FiInfo, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('workhub_access_token');
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data: NotificationItem[] = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
      }
    } catch (e) {
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
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
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
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.warn('Cannot mark all read:', e);
    }
  };

  const getIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'BOOKING_CANCEL':
        return <FiAlertCircle className="h-4 w-4 text-rose-500" />;
      case 'CHECKIN':
      case 'PAYMENT':
        return <FiCheckCircle className="h-4 w-4 text-emerald-500" />;
      default:
        return <FiInfo className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer"
        aria-label="Thông báo"
        title="Thông báo"
      >
        <FiBell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
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
                <FiCheck className="h-3 w-3" /> Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto divide-y divide-border/50">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FiBell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map(item => (
                <div
                  key={item.id}
                  onClick={() => !item.isRead && markAsRead(item.id)}
                  className={`p-3.5 transition-colors cursor-pointer hover:bg-muted/50 flex gap-3 items-start ${
                    !item.isRead ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0 rounded-lg p-1.5 bg-card border border-border shadow-2xs">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${!item.isRead ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground/90 mt-0.5 line-clamp-2 leading-relaxed">
                      {item.content}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  {!item.isRead && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
