import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Bell, Eye, History, Check, BadgeCheck, Calendar, Inbox } from 'lucide-react';
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
        return <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'bookings':
        return <Calendar className="h-4 w-4 text-zinc-800 dark:text-zinc-200" />;
      case 'returns':
        return <Inbox className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Bell className="h-4 w-4 text-zinc-500" />;
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
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Notifications & Logs
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Review user-specific system workflow notifications and global administrator audit trail logs.
          </p>
        </div>
        {activeTab === 'notifications' && notifications.some(n => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="premium-button-secondary flex items-center gap-1.5 text-xs font-semibold"
          >
            <Check className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs and filters */}
      <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
              activeTab === 'notifications'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            Inbox Alerts
          </button>
          {isManager && (
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                activeTab === 'logs'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              Activity Audit Logs
            </button>
          )}
        </div>
      </div>

      {/* Content box */}
      <div className="premium-card p-5">
        {loading ? (
          <div className="space-y-3.5 animate-pulse">
            <div className="h-12 bg-zinc-100 dark:bg-zinc-900 rounded-lg" />
            <div className="h-12 bg-zinc-50 dark:bg-zinc-900 rounded-lg" />
            <div className="h-12 bg-zinc-100 dark:bg-zinc-900 rounded-lg" />
          </div>
        ) : activeTab === 'notifications' ? (
          /* Notifications Center list */
          <div className="space-y-3">
            {notifications.map(notif => (
              <div
                key={notif.id}
                className={`flex justify-between items-start gap-4 p-4 border rounded-xl transition-colors ${
                  notif.is_read
                    ? 'bg-white border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800'
                    : 'bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-700/60 shadow-2xs'
                }`}
              >
                <div className="flex gap-3">
                  <div className="p-1.5 border border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950/60 rounded flex-shrink-0 mt-0.5">
                    {getCategoryIcon(notif.category)}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                      {notif.title}
                      {!notif.is_read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 animate-pulse" />
                      )}
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-1">{notif.message}</p>
                    <span className="inline-block text-[9px] text-zinc-400 uppercase mt-2">
                      {formatLogDate(notif.created_at)}
                    </span>
                  </div>
                </div>

                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="p-1 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors flex-shrink-0"
                    title="Mark as Read"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-center py-12 text-zinc-400 text-xs">
                No alerts in your inbox currently.
              </div>
            )}
          </div>
        ) : (
          /* Global Administrative Activity Logs */
          <div className="space-y-3">
            {logs.map(log => (
              <div
                key={log.id}
                className="flex items-start justify-between gap-4 p-4 border border-zinc-100 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900"
              >
                <div className="flex gap-3 text-xs">
                  <div className="h-7 w-7 rounded bg-zinc-100 dark:bg-zinc-950/60 text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-bold text-xs uppercase border border-zinc-200 dark:border-zinc-800">
                    {log.user?.full_name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{log.action}</h4>
                    <p className="text-zinc-500 text-[11px] mt-1">{log.details}</p>
                    <span className="inline-block text-[9px] text-zinc-400 uppercase mt-2">
                      By: {log.user?.full_name || 'System Auto'} • {formatLogDate(log.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-12 text-zinc-400 text-xs">
                No audit activity trail logs recorded yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
