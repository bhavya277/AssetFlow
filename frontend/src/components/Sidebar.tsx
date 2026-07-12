import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  FolderTree,
  Repeat,
  Calendar,
  Wrench,
  FileCheck2,
  BarChart3,
  BellRing,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  LogOut,
} from 'lucide-react';
import { motion } from 'framer-motion';

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const role = user?.role;

  const navigation = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { name: 'Organization Setup', to: '/organization', icon: Building2, roles: ['Admin', 'Asset Manager'] },
    { name: 'Asset Directory', to: '/assets', icon: FolderTree, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { name: 'Allocation & Transfer', to: '/allocations', icon: Repeat, roles: ['Admin', 'Asset Manager', 'Department Head'] },
    { name: 'Resource Booking', to: '/bookings', icon: Calendar, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { name: 'Maintenance Management', to: '/maintenance', icon: Wrench, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { name: 'Asset Audit', to: '/audits', icon: FileCheck2, roles: ['Admin', 'Asset Manager'] },
    { name: 'Reports & Analytics', to: '/reports', icon: BarChart3, roles: ['Admin', 'Asset Manager'] },
    { name: 'Notifications & Logs', to: '/logs', icon: BellRing, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
  ];

  const filteredNav = navigation.filter((item) => role && item.roles.includes(role));

  return (
    <motion.div
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen bg-slate-900 text-slate-100 flex flex-col justify-between sticky top-0 flex-shrink-0 border-r border-slate-800"
    >
      <div className="flex flex-col flex-grow overflow-y-auto">
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-850">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-indigo-600 p-2 rounded-xl text-white flex-shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent"
              >
                AssetFlow
              </motion.span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-all hidden md:block"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* User Card */}
        {user && (
          <div className="p-4 border-b border-slate-850">
            <div className="flex items-center gap-3 bg-slate-850/50 p-3 rounded-2xl border border-slate-800/40">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-base border border-indigo-500/25 flex-shrink-0">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <h4 className="font-semibold text-sm truncate text-slate-200">
                    {user.full_name}
                  </h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-600/35 border border-indigo-500/20 text-indigo-300 uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="px-4 py-6 space-y-1.5 flex-grow">
          {filteredNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-slate-250 hover:bg-slate-800/40'
                }`
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {item.name}
                </motion.span>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Sidebar Footer / Logout */}
      <div className="p-4 border-t border-slate-850">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3.5 px-4 py-3 text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </motion.div>
  );
};
