'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const [list, count] = await Promise.all([
      api.get<NotificationItem[]>('/notifications').catch(() => []),
      api.get<number>('/notifications/unread-count').catch(() => 0),
    ]);
    setItems(list);
    setUnreadCount(count);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function markAllRead() {
    await api.patch('/notifications/read-all');
    load();
  }

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-mist"
      >
        <Bell size={19} className="text-ink" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-status-absent text-white text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-[320px] card p-0 overflow-hidden shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unreadCount > 0 && (
              <button className="text-xs text-gold font-medium hover:underline" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="text-sm text-slate text-center py-8">No notifications yet.</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-mist ${
                  n.isRead ? '' : 'bg-gold/5'
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 shrink-0" />}
                  <div>
                    <p className="text-sm font-medium text-ink">{n.title}</p>
                    <p className="text-xs text-slate mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-slate/70 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
