import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, Search, Bell } from 'lucide-react';
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
    <header className="sticky top-0 z-40 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 h-16 flex items-center justify-between px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        <Link
          to="/dashboard"
          className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors font-medium"
        >
          AssetFlow
        </Link>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.path}>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <Link
              to={crumb.path}
              className={`transition-colors ${
                idx === breadcrumbs.length - 1
                  ? 'text-zinc-900 dark:text-zinc-100 font-semibold pointer-events-none'
                  : 'hover:text-zinc-800 dark:hover:text-zinc-200 font-medium'
              }`}
            >
              {crumb.name}
            </Link>
          </React.Fragment>
        ))}
      </div>

      {/* Quick Utilities */}
      <div className="flex items-center gap-3">
        {/* Global Search Bar Trigger */}
        <button
          onClick={onSearchClick}
          className="flex items-center justify-between gap-12 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 px-3 py-1.5 rounded-lg text-zinc-400 text-[11px] w-56 text-left transition-all active:scale-[0.98]"
        >
          <span className="flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            Search...
          </span>
          <kbd className="bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 px-1 py-0.5 rounded text-[9px] font-semibold text-zinc-400 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="bg-zinc-50 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 p-2 rounded-lg text-zinc-600 dark:text-zinc-300 transition-all active:scale-95"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        {/* Notifications Icon Link */}
        <Link
          to="/logs"
          className="relative bg-zinc-50 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 p-2 rounded-lg text-zinc-600 dark:text-zinc-300 transition-all active:scale-95"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-[8px] font-bold h-4 w-4 flex items-center justify-center border border-white dark:border-zinc-950">
              {unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
};
