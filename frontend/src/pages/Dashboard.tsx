import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import {
  AlertTriangle,
  Wrench,
  ArrowRight,
  FolderOpen,
  CalendarDays,
  UserCheck,
} from 'lucide-react';
import axios from '../context/AuthContext';

interface DashboardStats {
  totalAssets: number;
  utilizationRate: number;
  pendingTransfers: number;
  maintenanceToday: number;
}

interface CategoryUtilization {
  category_name: string;
  allocated: number;
  total: number;
  rate: number;
}

interface MaintenanceTrend {
  month: string;
  cost: number;
}

interface Activity {
  id: number;
  action: string;
  details: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

interface DashboardData {
  stats: {
    total_assets: number;
    utilization_rate: number;
    pending_transfers: number;
    active_maintenance: number;
  };
  categories_utilization: CategoryUtilization[];
  maintenance_trends: MaintenanceTrend[];
  recent_activity: Activity[];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const applyDashboardData = (
  data: DashboardData,
  setStats: React.Dispatch<React.SetStateAction<DashboardStats>>,
  setUtilizationData: React.Dispatch<React.SetStateAction<CategoryUtilization[]>>,
  setMaintenanceTrendData: React.Dispatch<React.SetStateAction<MaintenanceTrend[]>>,
  setActivities: React.Dispatch<React.SetStateAction<Activity[]>>,
) => {
  setStats({
    totalAssets: data.stats.total_assets,
    utilizationRate: data.stats.utilization_rate,
    pendingTransfers: data.stats.pending_transfers,
    maintenanceToday: data.stats.active_maintenance,
  });
  setUtilizationData(data.categories_utilization);
  setMaintenanceTrendData(data.maintenance_trends);
  setActivities(data.recent_activity);
};

const fetchDashboardFallback = async (user: { id: number; role: string }): Promise<DashboardData> => {
  const [assetsRes, categoriesRes, maintenanceRes, transfersRes] = await Promise.all([
    axios.get<Array<{ id: number; status: string; category_id: number; current_holder_id?: number | null }>>('/assets/'),
    axios.get<Array<{ id: number; name: string }>>('/categories/'),
    axios.get<Array<{ status: string; cost: number; created_at: string }>>('/maintenance/'),
    axios.get<Array<{ status: string }>>('/allocations/transfers'),
  ]);

  const assets = assetsRes.data;
  const categories = categoriesRes.data;
  const maintenance = maintenanceRes.data;
  const transfers = transfersRes.data;

  const total = assets.length;
  const allocated = assets.filter((a) => a.status === 'Allocated').length;
  const owned =
    user.role === 'Admin' || user.role === 'Asset Manager'
      ? allocated
      : assets.filter((a) => a.status === 'Allocated' && a.current_holder_id === user.id).length;
  const utilizationRate = total > 0 ? Math.round((allocated / total) * 1000) / 10 : 0;

  const categoriesUtilization = categories.map((cat) => {
    const catAssets = assets.filter((a) => a.category_id === cat.id);
    const catAllocated = catAssets.filter((a) => a.status === 'Allocated').length;
    const catTotal = catAssets.length;
    return {
      category_name: cat.name,
      allocated: catAllocated,
      total: catTotal,
      rate: catTotal > 0 ? Math.round((catAllocated / catTotal) * 1000) / 10 : 0,
    };
  });

  const now = new Date();
  const maintenanceTrends: MaintenanceTrend[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = monthDate.getMonth();
    const year = monthDate.getFullYear();
    const cost = maintenance
      .filter((m) => {
        const created = new Date(m.created_at);
        return created.getMonth() === month && created.getFullYear() === year;
      })
      .reduce((sum, m) => sum + (m.cost || 0), 0);
    maintenanceTrends.push({
      month: MONTH_LABELS[month],
      cost: Math.round(cost * 100) / 100,
    });
  }

  let recentActivity: Activity[] = [];
  const isManager = user.role === 'Admin' || user.role === 'Asset Manager';
  if (isManager) {
    try {
      const logsRes = await axios.get<Activity[]>('/notifications/activity-logs');
      recentActivity = logsRes.data.slice(0, 5);
    } catch {
      // Activity logs are manager-only; ignore if unavailable
    }
  }

  return {
    stats: {
      total_assets: owned,
      utilization_rate: utilizationRate,
      pending_transfers: transfers.filter((t) => t.status === 'Pending').length,
      active_maintenance: maintenance.filter(
        (m) => m.status === 'In Progress' || m.status === 'Requested',
      ).length,
    },
    categories_utilization: categoriesUtilization,
    maintenance_trends: maintenanceTrends,
    recent_activity: recentActivity,
  };
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    utilizationRate: 0,
    pendingTransfers: 0,
    maintenanceToday: 0,
  });
  const [utilizationData, setUtilizationData] = useState<CategoryUtilization[]>([]);
  const [maintenanceTrendData, setMaintenanceTrendData] = useState<MaintenanceTrend[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const isManager = user?.role === 'Admin' || user?.role === 'Asset Manager';

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        let data: DashboardData;
        try {
          const response = await axios.get<DashboardData>('/dashboard/');
          data = response.data;
        } catch (error: unknown) {
          const status = (error as { response?: { status?: number } }).response?.status;
          if (status === 404) {
            data = await fetchDashboardFallback(user);
          } else {
            throw error;
          }
        }

        applyDashboardData(data, setStats, setUtilizationData, setMaintenanceTrendData, setActivities);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showToast('Failed to load dashboard data. Please restart the backend server.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, isManager, showToast]);

  const formatLogDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'tween' as const, duration: 0.25 } },
  };

  const cards = [
    {
      title: 'Total Assets Owned',
      value: stats.totalAssets,
      change: isManager ? 'Active corporate resources' : 'Resources assigned to you',
      icon: FolderOpen,
      color: 'slate',
    },
    {
      title: 'Global Asset Utilization',
      value: `${stats.utilizationRate}%`,
      change: 'Allocated vs total capacity',
      icon: UserCheck,
      color: 'emerald',
    },
    {
      title: 'Pending Transfers',
      value: stats.pendingTransfers,
      change: stats.pendingTransfers > 0 ? 'Requires attention' : 'No requests pending',
      icon: AlertTriangle,
      color: 'amber',
    },
    {
      title: 'Active Maintenance',
      value: stats.maintenanceToday,
      change: 'In progress or requested',
      icon: Wrench,
      color: 'rose',
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            System Overview
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time status overview of company physical resources and deployment statistics.
          </p>
        </div>
        <div className="flex gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/35 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Connected
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {cards.map((card, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            className="premium-card premium-card-hover p-5 relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {card.title}
                </p>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1.5">
                  {loading ? '—' : card.value}
                </h3>
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  card.color === 'emerald'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/40 dark:border-emerald-900/20'
                    : card.color === 'amber'
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200/40 dark:border-amber-900/20'
                    : card.color === 'rose'
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200/40 dark:border-rose-900/20'
                    : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-800/40'
                }`}
              >
                <card.icon className="h-4.5 w-4.5" />
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 mt-3.5">
              {card.change}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization Bar Chart */}
        <div className="premium-card p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Asset Deployment rate</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Allocated vs. total owned assets categorized by type</p>
          </div>
          <div className="h-72 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">Loading metrics...</div>
            ) : utilizationData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">No category data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilizationData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis
                    dataKey="category_name"
                    fontSize={9}
                    stroke="#a1a1aa"
                    tickLine={false}
                    interval={0}
                    height={40}
                  />
                  <YAxis fontSize={9} stroke="#a1a1aa" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontFamily: 'inherit',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="allocated" fill="#18181b" radius={[4, 4, 0, 0]} name="Allocated" />
                  <Bar dataKey="total" fill="#e4e4e7" radius={[4, 4, 0, 0]} name="Total Capacity" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Maintenance cost trend */}
        <div className="premium-card p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Maintenance Expenses</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Monthly breakdown of overall repair and servicing expenditures</p>
          </div>
          <div className="h-72 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">Loading metrics...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={maintenanceTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#71717a" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="month" fontSize={9} stroke="#a1a1aa" tickLine={false} />
                  <YAxis fontSize={9} stroke="#a1a1aa" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontFamily: 'inherit',
                      fontSize: '11px',
                    }}
                    formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Expense']}
                  />
                  <Area type="monotone" dataKey="cost" stroke="#18181b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorCost)" name="Expense ($)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="premium-card p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            {isManager ? 'Quick Workflows' : 'Quick Actions'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {isManager && (
              <>
                <a
                  href="/assets"
                  className="flex flex-col justify-between p-4.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 hover:bg-zinc-50 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/30 transition-all hover:scale-[1.005]"
                >
                  <FolderOpen className="h-5 w-5 text-zinc-700 dark:text-zinc-400 mb-5" />
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-200 text-xs">Register Asset</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Register new corporate equipment</p>
                  </div>
                </a>

                <a
                  href="/allocations"
                  className="flex flex-col justify-between p-4.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 hover:bg-zinc-50 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/30 transition-all hover:scale-[1.005]"
                >
                  <UserCheck className="h-5 w-5 text-zinc-700 dark:text-zinc-400 mb-5" />
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-200 text-xs">Allocate Asset</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Assign devices to employees</p>
                  </div>
                </a>
              </>
            )}

            <a
              href="/bookings"
              className="flex flex-col justify-between p-4.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 hover:bg-zinc-50 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/30 transition-all hover:scale-[1.005]"
            >
              <CalendarDays className="h-5 w-5 text-zinc-700 dark:text-zinc-400 mb-5" />
              <div>
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-200 text-xs">Reserve Resource</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">Reserve projectors, rooms, or vehicles</p>
              </div>
            </a>

            {!isManager && (
              <>
                <a
                  href="/maintenance"
                  className="flex flex-col justify-between p-4.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 hover:bg-zinc-50 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/30 transition-all hover:scale-[1.005]"
                >
                  <Wrench className="h-5 w-5 text-zinc-700 dark:text-zinc-400 mb-5" />
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-200 text-xs">Report Issue</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Report asset maintenance needs</p>
                  </div>
                </a>

                <a
                  href="/assets"
                  className="flex flex-col justify-between p-4.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 hover:bg-zinc-50 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/30 transition-all hover:scale-[1.005]"
                >
                  <FolderOpen className="h-5 w-5 text-zinc-700 dark:text-zinc-400 mb-5" />
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-200 text-xs">Browse Catalog</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Browse corporate device directory</p>
                  </div>
                </a>
              </>
            )}
          </div>
        </div>

        {/* System Activity */}
        <div className="premium-card p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              {isManager ? 'Recent Activity' : 'Latest Logs'}
            </h3>
            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
                <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
              </div>
            ) : isManager ? (
              <div className="space-y-3.5">
                {activities.length === 0 ? (
                  <p className="text-xs text-zinc-500">No activity recorded yet.</p>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 text-xs">
                      <div className="h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-zinc-800 dark:text-zinc-200 font-semibold">{activity.action}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{activity.details}</p>
                        <p className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase mt-0.5">
                          {activity.user?.full_name || 'System'} • {formatLogDate(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                Activity logs are available to administrators.
              </p>
            )}
          </div>
          {isManager && (
            <a
              href="/logs"
              className="flex items-center justify-between text-xs font-semibold text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300 mt-5 pt-3.5 border-t border-zinc-100 dark:border-zinc-900"
            >
              View all logs
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
