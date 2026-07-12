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
  Shield,
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
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between sticky top-0 flex-shrink-0 border-r border-zinc-900"
    >
      <div className="flex flex-col flex-grow overflow-y-auto">
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4.5 border-b border-zinc-900">
          <div className="flex items-center gap-2.5 overflow-hidden pl-1">
            <div className="bg-zinc-800 p-2 rounded-lg text-zinc-100 flex-shrink-0 border border-zinc-700/50">
              <Shield className="h-4 w-4 text-zinc-300" />
            </div>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-semibold text-sm tracking-tight text-zinc-200"
              >
                AssetFlow ERP
              </motion.span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 p-1.5 rounded-lg transition-all hidden md:block"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* User Card */}
        {user && (
          <div className="p-3 border-b border-zinc-900">
            <div className="flex items-center gap-3 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-900/60">
              <div className="h-8 w-8 rounded-lg bg-zinc-800 text-zinc-200 flex items-center justify-center font-bold text-xs border border-zinc-700/40 flex-shrink-0">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <h4 className="font-medium text-xs truncate text-zinc-300">
                    {user.full_name}
                  </h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/40 uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="px-2 py-4 space-y-1 flex-grow">
          {filteredNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group relative ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/50 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                }`
              }
            >
              <item.icon className="h-4 w-4 flex-shrink-0 text-zinc-400 group-hover:text-zinc-300" />
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
                  {item.name}
                </motion.span>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Sidebar Footer / Logout */}
      <div className="p-3 border-t border-zinc-900">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg border border-transparent hover:border-rose-900/10 transition-all"
        >
          <LogOut className="h-4 w-4 flex-shrink-0 text-zinc-500 group-hover:text-rose-400" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </motion.div>
  );
};
