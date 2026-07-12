import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Eye, Loader2, History, Check, ShieldAlert, BadgeCheck, Wrench, Calendar, Inbox } from 'lucide-react';
import axios from 'axios';

interface Notification {
  id: number;
  title: string;
  message: string;
  category: string;
  is_read: boolean;
  created_at: string;
}

interface ActivityLog {
  id: number;
  action: string;
  details: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notifications' | 'logs'>('notifications');

  const isManager = user?.role === 'Admin' || user?.role === 'Asset Manager';

  const loadData = async () => {
    setLoading(true);
    try {
      const notifRes = await axios.get<Notification[]>('/notifications/');
      setNotifications(notifRes.data);

      if (isManager) {
        const logsRes = await axios.get<ActivityLog[]>('/notifications/activity-logs');
        setLogs(logsRes.data);
      }
    } catch (error) {
      console.error('Error fetching logs or alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await axios.put(`/notifications/${id}/read`);
      showToast('Notification marked as read', 'success');
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      showToast('Failed to update notification', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    const unreads = notifications.filter(n => !n.is_read);
    if (unreads.length === 0) return;
    
    try {
      await Promise.all(unreads.map(n => axios.put(`/notifications/${n.id}/read`)));
      showToast('All notifications marked as read', 'success');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      showToast('Failed to mark all as read', 'error');
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'approvals':
        return <BadgeCheck className="h-4.5 w-4.5 text-emerald-500" />;
      case 'bookings':
        return <Calendar className="h-4.5 w-4.5 text-indigo-500" />;
      case 'returns':
        return <Inbox className="h-4.5 w-4.5 text-amber-500" />;
      default:
        return <Bell className="h-4.5 w-4.5 text-slate-500" />;
    }
  };

  const formatLogDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-zinc-150">
            Notifications & Logs
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            Review user-specific system workflow notifications and global administrator audit trail logs.
          </p>
        </div>
        {activeTab === 'notifications' && notifications.some(n => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Check className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs and filters */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex gap-2 bg-slate-100 dark:bg-zinc-900 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'notifications'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-550 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100'
            }`}
          >
            <Bell className="h-4 w-4" />
            Inbox Alerts
          </button>
          {isManager && (
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'logs'
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-550 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100'
              }`}
            >
              <History className="h-4 w-4" />
              Activity Audit Logs
            </button>
          )}
        </div>
      </div>

      {/* Content box */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm rounded-3xl overflow-hidden p-6">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            <div className="h-14 bg-slate-50 dark:bg-zinc-850 rounded-2xl" />
            <div className="h-14 bg-slate-100 dark:bg-zinc-850 rounded-2xl" />
            <div className="h-14 bg-slate-50 dark:bg-zinc-850 rounded-2xl" />
          </div>
        ) : activeTab === 'notifications' ? (
          /* Notifications Center list */
          <div className="space-y-4">
            {notifications.map(notif => (
              <div
                key={notif.id}
                className={`flex justify-between items-start gap-4 p-4 border rounded-2xl transition-colors ${
                  notif.is_read
                    ? 'bg-white border-zinc-200/50 dark:bg-zinc-900 dark:border-zinc-800/80'
                    : 'bg-indigo-50/15 border-indigo-500/20 dark:bg-indigo-950/10 dark:border-indigo-400/20 shadow-xs'
                }`}
              >
                <div className="flex gap-3">
                  <div className="p-2 border border-zinc-100 dark:border-zinc-850 bg-slate-50 dark:bg-zinc-950/60 rounded-xl flex-shrink-0 mt-0.5">
                    {getCategoryIcon(notif.category)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-850 dark:text-zinc-200 text-sm flex items-center gap-2">
                      {notif.title}
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{notif.message}</p>
                    <span className="inline-block text-[9px] text-slate-400 uppercase mt-2">
                      {formatLogDate(notif.created_at)}
                    </span>
                  </div>
                </div>

                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
                    title="Mark as Read"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-center py-16 text-slate-450 text-sm">
                No alerts in your inbox currently.
              </div>
            )}
          </div>
        ) : (
          /* Global Administrative Activity Logs */
          <div className="space-y-4">
            {logs.map(log => (
              <div
                key={log.id}
                className="flex items-start justify-between gap-4 p-4 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl bg-white dark:bg-zinc-900"
              >
                <div className="flex gap-3 text-xs">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase border border-indigo-100/30">
                    {log.user?.full_name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-850 dark:text-zinc-200 text-sm">{log.action}</h4>
                    <p className="text-slate-550 dark:text-zinc-400 mt-1">{log.details}</p>
                    <span className="inline-block text-[9px] text-slate-400 uppercase mt-2">
                      By: {log.user?.full_name || 'System Auto'} • {formatLogDate(log.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-16 text-slate-455 text-sm">
                No audit activity trail logs recorded yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
