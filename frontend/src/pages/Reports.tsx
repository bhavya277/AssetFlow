import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import { FileDown, Printer, Loader2, BarChart3, Wrench, ShieldAlert, Sparkles, TrendingUp, Info } from 'lucide-react';
import axios from 'axios';

interface CategoryUtilization {
  category_name: string;
  allocated: number;
  total: number;
  rate: number;
}

interface IdleAsset {
  id: number;
  name: string;
  serial_number: string;
  location: string;
  health_score: number;
  condition: string;
}

interface FrequentlyMaintained {
  id: number;
  name: string;
  serial_number: string;
  repair_count: number;
  total_cost: number;
}

interface Trend {
  month: string;
  cost: number;
}

interface ReportsSummary {
  total_assets_count: number;
  utilization_rate: number;
  total_maintenance_cost: number;
  categories_utilization: CategoryUtilization[];
  idle_assets: IdleAsset[];
  frequently_maintained: FrequentlyMaintained[];
  maintenance_trends: Trend[];
}

export const Reports: React.FC = () => {
  const { showToast } = useToast();
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

  const loadSummary = async () => {
    setLoading(true);
    try {
      const response = await axios.get<ReportsSummary>('/reports/summary');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching reports summary:', error);
      showToast('Failed to load analytical reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const response = await axios.get<any[]>('/assets/');
      const assets = response.data;
      
      // Build CSV String
      const headers = ['ID', 'Asset Name', 'Serial Number', 'Location', 'Status', 'Condition', 'Health Score', 'Category'];
      const rows = assets.map(a => [
        a.id,
        `"${a.name.replace(/"/g, '""')}"`,
        a.serial_number,
        `"${a.location.replace(/"/g, '""')}"`,
        a.status,
        a.condition,
        a.health_score,
        a.category?.name || 'Uncategorized'
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `AssetFlow_Catalog_Export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('CSV export downloaded successfully', 'success');
    } catch (error) {
      showToast('Failed to export catalog to CSV', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-16 w-1/3 bg-slate-100 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-28 bg-slate-100 rounded-2xl" />
          <div className="h-28 bg-slate-50 rounded-2xl" />
          <div className="h-28 bg-slate-100 rounded-2xl" />
        </div>
        <div className="h-96 bg-slate-55 rounded-3xl" />
      </div>
    );
  }

  if (!data) return null;

  // Pie Chart formatting
  const allocatedCount = Math.round(data.total_assets_count * (data.utilization_rate / 100));
  const availableCount = data.total_assets_count - allocatedCount;
  const statusPieData = [
    { name: 'Allocated', value: allocatedCount },
    { name: 'Available', value: availableCount > 0 ? availableCount : 0 },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 print:p-0 print:max-w-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-zinc-150">
            Reports & Analytics
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            Aggregate reports on device deployment rates, repair logs, and inventory health indexes.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            disabled={exportLoading}
            className="flex items-center gap-2 px-4 py-2.5 border border-zinc-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-650 dark:text-zinc-300 rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Export CSV
          </button>
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-95"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Print-only layout header */}
      <div className="hidden print:block text-center border-b pb-6 mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-800">AssetFlow ERP Report Summary</h1>
        <p className="text-sm text-slate-500 mt-2">Generated on: {new Date().toLocaleString()}</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
          <h4 className="text-xs font-semibold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Total Active Fleet</h4>
          <h3 className="text-3xl font-extrabold text-slate-800 dark:text-zinc-100 mt-2">{data.total_assets_count}</h3>
          <p className="text-xs text-slate-400 mt-2">Physical devices indexed in catalog</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
          <h4 className="text-xs font-semibold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Average Deployment Rate</h4>
          <h3 className="text-3xl font-extrabold text-slate-800 dark:text-zinc-100 mt-2">{data.utilization_rate}%</h3>
          <p className="text-xs text-slate-400 mt-2">Ratio of allocated stock vs storage</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
          <h4 className="text-xs font-semibold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Cumulative Repair Costs</h4>
          <h3 className="text-3xl font-extrabold text-slate-800 dark:text-zinc-100 mt-2">${data.total_maintenance_cost.toFixed(2)}</h3>
          <p className="text-xs text-slate-400 mt-2">Sum of technician invoices processed</p>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-150 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              Category Capacity Breakdown
            </h3>
            <p className="text-xs text-slate-450">Active utilization ratios compared against overall capacity</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categories_utilization} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="category_name" fontSize={11} stroke="#94a3b8" tickLine={false} />
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
          </div>
        </div>

        {/* Deployment breakdown status */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-150">Allocation Ratios</h3>
            <p className="text-xs text-slate-450">Overall allocation status splits</p>
          </div>
          <div className="h-80 w-full flex flex-col justify-between items-center">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Grids section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:break-inside-avoid">
        {/* Idle Assets List */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-zinc-150 flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
              Available Stock (Idle Assets)
            </h3>
            <p className="text-xs text-slate-450">Assets in storage ready for assignment</p>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            {data.idle_assets.map(asset => (
              <div key={asset.id} className="py-3.5 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-zinc-200">{asset.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">SN: {asset.serial_number} • Loc: {asset.location}</p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-800 dark:text-zinc-300">{asset.health_score}% Health</span>
                  <span className="block text-[9px] text-emerald-500 font-bold uppercase mt-0.5">{asset.condition}</span>
                </div>
              </div>
            ))}
            {data.idle_assets.length === 0 && (
              <div className="py-12 text-center text-slate-450">
                All catalog items are currently assigned.
              </div>
            )}
          </div>
        </div>

        {/* Frequently Maintained */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-zinc-150 flex items-center gap-2">
              <Wrench className="h-4.5 w-4.5 text-indigo-500 animate-pulse" />
              Frequent Service Logs
            </h3>
            <p className="text-xs text-slate-450">Devices with multiple technical maintenance tasks</p>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            {data.frequently_maintained.map(item => (
              <div key={item.id} className="py-3.5 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-zinc-200">{item.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">SN: {item.serial_number}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-rose-500">{item.repair_count} Repairs</span>
                  <span className="block text-[10px] text-slate-450 mt-0.5">Cost: ${item.total_cost.toFixed(2)}</span>
                </div>
              </div>
            ))}
            {data.frequently_maintained.length === 0 && (
              <div className="py-12 text-center text-slate-455">
                No active repairs logged in maintenance.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
