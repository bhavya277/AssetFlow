import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Grid, List, Loader2, ArrowUpRight, MapPin, Tag, FileDown } from 'lucide-react';
import axios from 'axios';
import { generateAssetPassportPdf } from '../utils/pdf';
import QRCode from 'qrcode';

interface AssetCategory {
  id: number;
  name: string;
}

interface User {
  id: number;
  full_name: string;
  email: string;
}

interface Asset {
  id: number;
  name: string;
  serial_number: string;
  qr_code_key: string;
  condition: string;
  health_score: number;
  location: string;
  status: string;
  warranty_expiry: string;
  category_id: number;
  category?: AssetCategory;
  current_holder?: User;
}

export const QRVisualizer: React.FC<{ value: string; className?: string }> = ({ value, className = "h-12 w-12" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        value || 'AssetFlow',
        {
          margin: 1,
          scale: 4,
          color: {
            dark: isDark ? '#f4f4f5' : '#18181b',
            light: isDark ? '#121214' : '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('Error generating QR code:', error);
        }
      );
    }
  }, [value, isDark]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`${className} rounded border border-zinc-200/80 dark:border-zinc-800/80 p-0.5`} 
    />
  );
};

export const AssetDirectory: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null);

  // Form registration state
  const [form, setForm] = useState({
    name: '',
    serial_number: '',
    location: '',
    category_id: '',
    condition: 'Excellent',
    health_score: 100,
    warranty_expiry: '',
    current_holder_id: '',
  });

  const isEditable = user?.role === 'Admin' || user?.role === 'Asset Manager';

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetsRes, catsRes] = await Promise.all([
        axios.get<Asset[]>('/assets/'),
        axios.get<AssetCategory[]>('/categories/'),
      ]);
      setAssets(assetsRes.data);
      setCategories(catsRes.data);

      if (isEditable) {
        const usersRes = await axios.get<User[]>('/users/');
        setUsers(usersRes.data);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      showToast('Failed to load asset directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isEditable]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.serial_number || !form.location || !form.category_id) {
      showToast('Please fill out all required fields', 'warning');
      return;
    }

    setSubmitLoading(true);
    try {
      await axios.post('/assets/', {
        ...form,
        category_id: parseInt(form.category_id, 10),
        current_holder_id: form.current_holder_id ? parseInt(form.current_holder_id, 10) : null,
        qr_code_key: '', // Backend auto-generates
        status: 'Available',
      });

      showToast('Asset registered successfully', 'success');
      setForm({
        name: '',
        serial_number: '',
        location: '',
        category_id: '',
        condition: 'Excellent',
        health_score: 100,
        warranty_expiry: '',
        current_holder_id: '',
      });
      setShowModal(false);
      loadData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to create asset';
      showToast(msg, 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDownloadPdf = async (assetId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPdfLoadingId(assetId);
    try {
      const [assetRes, timelineRes] = await Promise.all([
        axios.get(`/assets/${assetId}`),
        axios.get(`/assets/${assetId}/timeline`),
      ]);
      generateAssetPassportPdf(assetRes.data, timelineRes.data);
      showToast('Asset passport PDF downloaded', 'success');
    } catch (error) {
      console.error('PDF download failed:', error);
      showToast('Failed to download asset PDF', 'error');
    } finally {
      setPdfLoadingId(null);
    }
  };

  // Filter Assets
  const filteredAssets = assets.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.category?.name && a.category.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-250 dark:border-emerald-900/30';
      case 'Allocated':
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700/60';
      case 'Under Maintenance':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-250 dark:border-amber-900/30';
      default:
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-250 dark:border-rose-900/30';
    }
  };

  const getConditionStyle = (cond: string) => {
    switch (cond) {
      case 'Excellent':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/15 border-emerald-100 dark:border-emerald-900/20';
      case 'Good':
        return 'text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800';
      case 'Warning':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/15 border-amber-100 dark:border-amber-900/20';
      default:
        return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/15 border-rose-100 dark:border-rose-900/20';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Asset Inventory
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Browse and manage deployment, maintenance states, health scores, and digital passports of physical inventory.
          </p>
        </div>
        {isEditable && (
          <button
            onClick={() => setShowModal(true)}
            className="premium-button-primary flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Register Asset
          </button>
        )}
      </div>

      {/* Filters and Views toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 premium-input text-xs"
          />
        </div>

        <div className="flex gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'table'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport Grid/Table */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-44 bg-zinc-100 dark:bg-zinc-900 rounded-xl animate-pulse" />
          <div className="h-44 bg-zinc-50 dark:bg-zinc-900 rounded-xl animate-pulse" />
          <div className="h-44 bg-zinc-100 dark:bg-zinc-900 rounded-xl animate-pulse" />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map(asset => (
            <motion.div
              key={asset.id}
              onClick={() => navigate(`/assets/${asset.id}`)}
              className="premium-card premium-card-hover p-5 cursor-pointer flex flex-col justify-between h-48 relative overflow-hidden group"
            >
              {/* Card visual elements */}
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getStatusStyle(asset.status)}`}>
                    {asset.status}
                  </span>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm line-clamp-1 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                    {asset.name}
                  </h3>
                  <p className="text-[10px] text-zinc-400">SN: {asset.serial_number}</p>
                </div>
                <div className="p-1 border border-zinc-100 dark:border-zinc-800 rounded bg-zinc-50 dark:bg-zinc-950/60 flex-shrink-0">
                  <QRVisualizer value={`Asset: ${asset.name}\nSN: ${asset.serial_number}\nID: ${asset.qr_code_key}\nCategory: ${asset.category?.name || 'Uncategorized'}\nLocation: ${asset.location}\nCondition: ${asset.condition}\nHealth: ${asset.health_score}%`} className="h-8 w-8" />
                </div>
              </div>

              {/* Lower Section */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 flex items-center justify-between text-xs">
                <div className="space-y-1 text-[10px] text-zinc-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-zinc-400" />
                    {asset.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3 text-zinc-400" />
                    {asset.category?.name || 'Uncategorized'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <span className={`h-1.5 w-1.5 rounded-full ${getHealthColor(asset.health_score)}`} />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-[10px]">{asset.health_score}% Health</span>
                  </div>
                  <span className={`inline-block border px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider mt-1 ${getConditionStyle(asset.condition)}`}>
                    {asset.condition}
                  </span>
                  <button
                    onClick={(e) => handleDownloadPdf(asset.id, e)}
                    disabled={pdfLoadingId === asset.id}
                    className="mt-1 flex items-center gap-1 text-[9px] font-bold text-zinc-500 hover:text-zinc-900 ml-auto disabled:opacity-50"
                  >
                    {pdfLoadingId === asset.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <FileDown className="h-2.5 w-2.5" />}
                    PDF
                  </button>
                </div>
              </div>
              
              <ArrowUpRight className="absolute bottom-3 right-3 h-3.5 w-3.5 text-zinc-300 dark:text-zinc-700 opacity-0 group-hover:opacity-100 transition-all" />
            </motion.div>
          ))}
          {filteredAssets.length === 0 && (
            <div className="col-span-full py-16 text-center text-zinc-400 text-xs">
              No registered corporate assets matching search.
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 text-[10px] font-bold uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-3 font-semibold">Asset Name</th>
                  <th className="px-6 py-3 font-semibold">Serial Number</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Condition</th>
                  <th className="px-6 py-3 font-semibold">Health</th>
                  <th className="px-6 py-3 font-semibold">Location</th>
                  <th className="px-6 py-3 font-semibold">Category</th>
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
                {filteredAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-3 font-bold text-zinc-900 dark:text-zinc-100">{asset.name}</td>
                    <td className="px-6 py-3 font-mono text-zinc-500">{asset.serial_number}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(asset.status)}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`border px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getConditionStyle(asset.condition)}`}>
                        {asset.condition}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${getHealthColor(asset.health_score)}`} />
                        {asset.health_score}%
                      </div>
                    </td>
                    <td className="px-6 py-3 text-zinc-500">{asset.location}</td>
                    <td className="px-6 py-3 text-zinc-500">{asset.category?.name || 'Uncategorized'}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-3.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/assets/${asset.id}`);
                          }}
                          className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-0.5"
                        >
                          Passport
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => handleDownloadPdf(asset.id, e)}
                          disabled={pdfLoadingId === asset.id}
                          className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 flex items-center gap-0.5 disabled:opacity-50"
                        >
                          {pdfLoadingId === asset.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAssets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-zinc-400">
                      No registered corporate assets matching search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-in register asset dialog */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-slate-950/20 dark:bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md h-full shadow-xl relative z-50 flex flex-col justify-between p-6 border-l border-zinc-200 dark:border-zinc-800 rounded-l-2xl overflow-y-auto"
            >
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Register New Asset</h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Add catalog record, digital passport tracking, and serial assignments.
                  </p>
                </div>

                <form id="asset-form" onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                      Asset/Hardware Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MacBook Pro 16 M3 Max"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full premium-input"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. C02F67YMDY3H"
                      value={form.serial_number}
                      onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                      className="w-full premium-input"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                      Storage/Office Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HQ - Room 402, Cabinet 3"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="w-full premium-input"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                        Category
                      </label>
                      <select
                        value={form.category_id}
                        onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                        className="w-full premium-input"
                        required
                      >
                        <option value="" disabled>Select category</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                        Condition
                      </label>
                      <select
                        value={form.condition}
                        onChange={(e) => setForm({ ...form, condition: e.target.value })}
                        className="w-full premium-input"
                      >
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Warning">Warning</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                        Health Score (0-100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.health_score}
                        onChange={(e) => setForm({ ...form, health_score: parseInt(e.target.value, 10) || 100 })}
                        className="w-full premium-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                        Warranty Expiry
                      </label>
                      <input
                        type="date"
                        value={form.warranty_expiry}
                        onChange={(e) => setForm({ ...form, warranty_expiry: e.target.value })}
                        className="w-full premium-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                      Assign Holder (Optional)
                    </label>
                    <select
                      value={form.current_holder_id}
                      onChange={(e) => setForm({ ...form, current_holder_id: e.target.value })}
                      className="w-full premium-input"
                    >
                      <option value="">None (Available in Storage)</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                </form>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 premium-button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="asset-form"
                  disabled={submitLoading}
                  className="flex-1 premium-button-primary"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    'Confirm Register'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
