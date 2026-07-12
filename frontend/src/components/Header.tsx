import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, Search, Bell, Menu } from 'lucide-react';
import axios from 'axios';

interface HeaderProps {
  onSearchClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchClick }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [unreadCount, setUnreadCount] = useState(0);

  // Apply Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch Notifications Unread Count
  useEffect(() => {
    if (!user) return;
    const fetchUnreadCount = async () => {
      try {
        const response = await axios.get<any[]>('/notifications');
        const unreads = response.data.filter((n: any) => !n.is_read).length;
        setUnreadCount(unreads);
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };
    fetchUnreadCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Dynamic Breadcrumbs
  const getBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    if (pathnames.length === 0) return [{ name: 'Dashboard', path: '/dashboard' }];

    return pathnames.map((value, index) => {
      const path = `/${pathnames.slice(0, index + 1).join('/')}`;
      const name = value
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      return { name, path };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 h-16 flex items-center justify-between px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
        <Link
          to="/dashboard"
          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          AssetFlow
        </Link>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.path}>
            <span className="text-zinc-350 dark:text-zinc-650">/</span>
            <Link
              to={crumb.path}
              className={`font-medium transition-colors ${
                idx === breadcrumbs.length - 1
                  ? 'text-slate-800 dark:text-zinc-100 pointer-events-none'
                  : 'hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              {crumb.name}
            </Link>
          </React.Fragment>
        ))}
      </div>

      {/* Quick Utilities */}
      <div className="flex items-center gap-4">
        {/* Global Search Bar Trigger */}
        <button
          onClick={onSearchClick}
          className="flex items-center justify-between gap-10 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/90 border border-zinc-200/50 dark:border-zinc-800/80 px-4 py-2 rounded-xl text-slate-400 text-xs w-64 text-left transition-all active:scale-[0.98]"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            Search everything...
          </span>
          <kbd className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-400 shadow-sm">
            Ctrl+K
          </kbd>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="bg-slate-50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-900/90 border border-zinc-200/50 dark:border-zinc-800/80 p-2.5 rounded-xl text-slate-600 dark:text-zinc-300 transition-all active:scale-95"
        >
          {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
        </button>

        {/* Notifications Icon Link */}
        <Link
          to="/logs"
          className="relative bg-slate-50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-900/90 border border-zinc-200/50 dark:border-zinc-800/80 p-2.5 rounded-xl text-slate-600 dark:text-zinc-300 transition-all active:scale-95"
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full text-[9px] font-bold h-5 w-5 flex items-center justify-center border-2 border-white dark:border-zinc-950 animate-pulse">
              {unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
};
