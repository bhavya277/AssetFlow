import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FolderTree, Building2, LayoutDashboard, Calendar, Wrench, FileCheck, BarChart3, Bell, ArrowRight } from 'lucide-react';
import axios from 'axios';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Asset {
  id: number;
  name: string;
  serial_number: string;
  status: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle Command Palette on Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // wait, toggle
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      // Fetch assets for global search
      axios.get<Asset[]>('/assets')
        .then(res => setAssets(res.data))
        .catch(err => console.error(err));
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const systemPages = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, category: 'Pages' },
    { name: 'Organization Setup', path: '/organization', icon: Building2, category: 'Pages' },
    { name: 'Asset Directory', path: '/assets', icon: FolderTree, category: 'Pages' },
    { name: 'Asset Allocation & Transfer', path: '/allocations', icon: Calendar, category: 'Pages' },
    { name: 'Resource Booking', path: '/bookings', icon: Calendar, category: 'Pages' },
    { name: 'Maintenance Management', to: '/maintenance', path: '/maintenance', icon: Wrench, category: 'Pages' },
    { name: 'Asset Audit', path: '/audits', icon: FileCheck, category: 'Pages' },
    { name: 'Reports & Analytics', path: '/reports', icon: BarChart3, category: 'Pages' },
    { name: 'Notifications & Activity Logs', path: '/logs', icon: Bell, category: 'Pages' },
  ];

  const filteredPages = systemPages.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  const filteredAssets = assets.filter(a =>
    a.name.toLowerCase().includes(query.toLowerCase()) ||
    a.serial_number.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5); // limit to top 5 assets

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
        />

        {/* Palette Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -10 }}
          transition={{ duration: 0.2 }}
          className="mx-auto max-w-2xl transform divide-y divide-zinc-100 dark:divide-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 shadow-2xl transition-all relative z-50 overflow-hidden"
        >
          {/* Input field */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400 dark:text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-0 text-sm"
              placeholder="Search assets, pages, or commands..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
              }}
            />
          </div>

          {/* Results list */}
          {(filteredPages.length > 0 || filteredAssets.length > 0) ? (
            <div className="max-h-80 scroll-py-2 overflow-y-auto p-2">
              {filteredPages.length > 0 && (
                <div>
                  <h3 className="px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    System Navigation
                  </h3>
                  <div className="space-y-1">
                    {filteredPages.map((page) => (
                      <button
                        key={page.path}
                        onClick={() => handleNavigate(page.path)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group"
                      >
                        <span className="flex items-center gap-3">
                          <page.icon className="h-4.5 w-4.5 text-slate-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                          {page.name}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredAssets.length > 0 && (
                <div className="mt-4">
                  <h3 className="px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    Assets Directory
                  </h3>
                  <div className="space-y-1">
                    {filteredAssets.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => handleNavigate(`/assets/${asset.id}`)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group"
                      >
                        <span className="flex flex-col">
                          <span className="font-medium text-slate-800 dark:text-zinc-100">{asset.name}</span>
                          <span className="text-xs text-slate-400 dark:text-zinc-500">SN: {asset.serial_number}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                            {asset.status}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-slate-450 dark:text-zinc-500">
              No results found for "{query}"
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
