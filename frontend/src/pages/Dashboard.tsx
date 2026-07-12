import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import {
  AlertTriangle,
  Wrench,
  ArrowRight,
  TrendingUp,
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
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
  };

  const cards = [
    {
      title: 'Total Assets Owned',
      value: stats.totalAssets,
      change: isManager ? 'Currently allocated resources' : 'Resources assigned to you',
      icon: FolderOpen,
      color: 'indigo',
    },
    {
      title: 'Global Asset Utilization',
      value: `${stats.utilizationRate}%`,
      change: 'Currently allocated assets',
      icon: UserCheck,
      color: 'emerald',
    },
    {
      title: 'Pending Transfer Approvals',
      value: stats.pendingTransfers,
      change: stats.pendingTransfers > 0 ? 'Requires review' : 'No pending requests',
      icon: AlertTriangle,
      color: 'amber',
    },
    {
      title: 'Active Maintenance Tasks',
      value: stats.maintenanceToday,
      change: 'In progress or requested',
      icon: Wrench,
      color: 'rose',
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-zinc-100">
            Executive Dashboard
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            Real-time status overview of company physical resources and deployment statistics.
          </p>
        </div>
        <div className="flex gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Status: Connected
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {cards.map((card, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm rounded-3xl p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  {card.title}
                </p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-zinc-100 mt-2">
                  {loading ? '—' : card.value}
                </h3>
              </div>
              <div
                className={`p-3 rounded-2xl ${
                  card.color === 'indigo'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                    : card.color === 'emerald'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                    : card.color === 'amber'
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                }`}
              >
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-4 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
              {card.change}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Utilization Bar Chart */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Asset Utilization</h3>
            <p className="text-xs text-slate-500">Allocated vs. total owned assets categorized by type</p>
          </div>
          <div className="h-80 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">Loading chart data...</div>
            ) : utilizationData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">No category data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilizationData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="category_name"
                    fontSize={10}
                    stroke="#94a3b8"
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="allocated" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Allocated" />
                  <Bar dataKey="total" fill="#e2e8f0" radius={[6, 6, 0, 0]} name="Total Capacity" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Maintenance cost trend */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Maintenance Expenses</h3>
            <p className="text-xs text-slate-500">Monthly breakdown of overall repair and servicing expenditures</p>
          </div>
          <div className="h-80 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">Loading chart data...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={maintenanceTrendData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" tickLine={false} />
                  <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Expense']}
                  />
                  <Area type="monotone" dataKey="cost" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" name="Expense ($)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-4">
            {isManager ? 'Quick Workflows' : 'Quick Actions'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {isManager && (
              <>
                <a
                  href="/assets"
                  className="flex flex-col justify-between p-5 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30 border border-indigo-100/50 dark:border-indigo-900/30 transition-all hover:scale-[1.01]"
                >
                  <FolderOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mb-6" />
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-sm">Register Asset</h4>
                    <p className="text-xs text-slate-500 mt-1">Add new corporate physical hardware</p>
                  </div>
                </a>

                <a
                  href="/allocations"
                  className="flex flex-col justify-between p-5 rounded-2xl bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-900/30 transition-all hover:scale-[1.01]"
                >
                  <UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mb-6" />
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-sm">Allocate Asset</h4>
                    <p className="text-xs text-slate-500 mt-1">Assign hardware to verified team member</p>
                  </div>
                </a>
              </>
            )}

            <a
              href="/bookings"
              className="flex flex-col justify-between p-5 rounded-2xl bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30 border border-amber-100/50 dark:border-amber-900/30 transition-all hover:scale-[1.01]"
            >
              <CalendarDays className="h-6 w-6 text-amber-600 dark:text-amber-400 mb-6" />
              <div>
                <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-sm">Reserve Resource</h4>
                <p className="text-xs text-slate-500 mt-1">Book projectors, rooms or fleet vehicles</p>
              </div>
            </a>

            {!isManager && (
              <>
                <a
                  href="/maintenance"
                  className="flex flex-col justify-between p-5 rounded-2xl bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 border border-rose-100/50 dark:border-rose-900/30 transition-all hover:scale-[1.01]"
                >
                  <Wrench className="h-6 w-6 text-rose-600 dark:text-rose-400 mb-6" />
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-sm">Report Issue</h4>
                    <p className="text-xs text-slate-500 mt-1">Request maintenance for assigned assets</p>
                  </div>
                </a>

                <a
                  href="/assets"
                  className="flex flex-col justify-between p-5 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30 border border-indigo-100/50 dark:border-indigo-900/30 transition-all hover:scale-[1.01]"
                >
                  <FolderOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mb-6" />
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-sm">Browse Assets</h4>
                    <p className="text-xs text-slate-500 mt-1">View company asset directory and passports</p>
                  </div>
                </a>
              </>
            )}
          </div>
        </div>

        {/* System Activity */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-4">
              {isManager ? 'Recent Activity' : 'Latest Logs'}
            </h3>
            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-10 bg-slate-100 dark:bg-zinc-800 rounded-xl" />
                <div className="h-10 bg-slate-100 dark:bg-zinc-800 rounded-xl" />
              </div>
            ) : isManager ? (
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <p className="text-sm text-slate-400">No activity recorded yet.</p>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 text-sm">
                      <div className="h-2 w-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-slate-700 dark:text-zinc-300 font-medium">{activity.action}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{activity.details}</p>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase mt-1">
                          {activity.user?.full_name || 'System'} • {formatLogDate(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Activity logs are available to managers and administrators.
              </p>
            )}
          </div>
          {isManager && (
            <a
              href="/logs"
              className="flex items-center justify-between text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-850"
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
