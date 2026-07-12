import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, FileDown, Loader2, Sparkles, Wrench } from 'lucide-react';
import axios from 'axios';
import { generateReportsPdf } from '../utils/pdf';

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
  health_score: number;
  condition: string;
  location: string;
}

interface MaintainedAsset {
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

interface ReportSummary {
  total_assets_count: number;
  utilization_rate: number;
  total_maintenance_cost: number;
  categories_utilization: CategoryUtilization[];
  idle_assets: IdleAsset[];
  frequently_maintained: MaintainedAsset[];
  maintenance_trends: Trend[];
}

const COLORS = ['#18181b', '#71717a', '#a1a1aa', '#e4e4e7'];

export const Reports: React.FC = () => {
  const { showToast } = useToast();
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await axios.get<ReportSummary>('/reports/summary');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      showToast('Failed to load analytical summaries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const response = await axios.get('/reports/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AssetFlow_Inventory_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      showToast('CSV export successful', 'success');
    } catch (error) {
      console.error('CSV export failed:', error);
      showToast('Failed to export CSV report', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleGeneratePDF = () => {
    if (!data) return;
    try {
      generateReportsPdf(data);
      showToast('Inventory analytical PDF generated', 'success');
    } catch (error) {
      console.error('PDF generation failed:', error);
      showToast('Failed to generate report PDF', 'error');
    }
  };

  if (loading || !data) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-10 w-1/3 bg-zinc-100 dark:bg-zinc-900 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-24 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
          <div className="h-24 bg-zinc-55 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
          <div className="h-24 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
        </div>
        <div className="h-80 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
      </div>
    );
  }

  // Prep pie data
  const allocatedCount = Math.round(data.total_assets_count * (data.utilization_rate / 100));
  const availableCount = data.total_assets_count - allocatedCount;
  const statusPieData = [
    { name: 'Allocated', value: allocatedCount },
    { name: 'Available', value: availableCount > 0 ? availableCount : 0 },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Reports & Analytics
          </h1>
          <p className="text-xs text-zinc-555 mt-1">
            Aggregate reports on device deployment rates, repair logs, and inventory health indexes.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={exportLoading}
            className="premium-button-secondary flex items-center gap-1.5 text-xs font-semibold"
          >
            {exportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            Export CSV
          </button>
          <button
            onClick={handleGeneratePDF}
            className="premium-button-primary flex items-center gap-1.5 text-xs font-semibold"
          >
            <FileDown className="h-3.5 w-3.5" />
            Generate PDF
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="premium-card p-5">
          <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Active Fleet</h4>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">{data.total_assets_count}</h3>
          <p className="text-[11px] text-zinc-500 mt-1">Physical devices indexed in catalog</p>
        </div>
        <div className="premium-card p-5">
          <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Average Deployment Rate</h4>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">{data.utilization_rate}%</h3>
          <p className="text-[11px] text-zinc-555 mt-1">Ratio of allocated stock vs storage</p>
        </div>
        <div className="premium-card p-5">
          <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cumulative Repair Costs</h4>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">${data.total_maintenance_cost.toFixed(2)}</h3>
          <p className="text-[11px] text-zinc-500 mt-1">Sum of technician invoices processed</p>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="premium-card p-5 lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <BarChart3 className="h-4.5 w-4.5 text-zinc-400" />
              Category Capacity Breakdown
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Active utilization ratios compared against overall capacity</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categories_utilization} margin={{ top: 20, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="category_name" fontSize={9} stroke="#a1a1aa" tickLine={false} />
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
          </div>
        </div>

        {/* Deployment breakdown status */}
        <div className="premium-card p-5">
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Allocation Ratios</h3>
            <p className="text-[11px] text-zinc-555 mt-0.5">Overall allocation status splits</p>
          </div>
          <div className="h-80 w-full flex flex-col justify-between items-center">
            <div className="h-64 w-full text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((_entry, index) => (
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Idle Assets List */}
        <div className="premium-card p-5 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-505 flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-zinc-400" />
              Available Stock (Idle Assets)
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Assets in storage ready for assignment</p>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            {data.idle_assets.map(asset => (
              <div key={asset.id} className="py-3 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-200">{asset.name}</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">SN: {asset.serial_number} • Loc: {asset.location}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-zinc-900 dark:text-zinc-200">{asset.health_score}% Health</span>
                  <span className="block text-[9px] text-emerald-600 font-bold uppercase mt-0.5">{asset.condition}</span>
                </div>
              </div>
            ))}
            {data.idle_assets.length === 0 && (
              <div className="py-12 text-center text-zinc-400 text-xs">
                All catalog items are currently assigned.
              </div>
            )}
          </div>
        </div>

        {/* Frequently Maintained */}
        <div className="premium-card p-5 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-505 flex items-center gap-1.5">
              <Wrench className="h-4.5 w-4.5 text-zinc-455" />
              Frequent Service Logs
            </h3>
            <p className="text-[11px] text-zinc-555 mt-0.5">Devices with multiple technical maintenance tasks</p>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            {data.frequently_maintained.map(item => (
              <div key={item.id} className="py-3 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-200">{item.name}</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">SN: {item.serial_number}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-rose-600">{item.repair_count} Repairs</span>
                  <span className="block text-[10px] text-zinc-400 mt-0.5">Cost: ${item.total_cost.toFixed(2)}</span>
                </div>
              </div>
            ))}
            {data.frequently_maintained.length === 0 && (
              <div className="py-12 text-center text-zinc-400 text-xs">
                No active repairs logged in maintenance.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
