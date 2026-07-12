import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Grid, List, Loader2, ArrowUpRight, MapPin, Tag, FileDown } from 'lucide-react';
import axios from 'axios';
import { generateAssetPassportPdf } from '../utils/pdf';

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
  return (
    <svg className={`${className} text-slate-800 dark:text-zinc-200`} viewBox="0 0 100 100" fill="currentColor">
      {/* Top-left square finder pattern */}
      <rect x="10" y="10" width="20" height="20" />
      <rect x="14" y="14" width="12" height="12" fill="white" className="dark:fill-zinc-900" />
      <rect x="17" y="17" width="6" height="6" />
      
      {/* Top-right square finder pattern */}
      <rect x="70" y="10" width="20" height="20" />
      <rect x="74" y="14" width="12" height="12" fill="white" className="dark:fill-zinc-900" />
      <rect x="77" y="17" width="6" height="6" />
      
      {/* Bottom-left square finder pattern */}
      <rect x="10" y="70" width="20" height="20" />
      <rect x="14" y="74" width="12" height="12" fill="white" className="dark:fill-zinc-900" />
      <rect x="17" y="77" width="6" height="6" />
      
      {/* Random QR code pixels block */}
      <rect x="40" y="15" width="6" height="6" />
      <rect x="55" y="25" width="8" height="6" />
      <rect x="45" y="38" width="6" height="8" />
      <rect x="35" y="55" width="6" height="6" />
      <rect x="50" y="50" width="10" height="6" />
      <rect x="65" y="45" width="6" height="6" />
      <rect x="75" y="55" width="10" height="8" />
      <rect x="85" y="75" width="6" height="12" />
      <rect x="65" y="75" width="8" height="6" />
      <rect x="45" y="75" width="10" height="8" />
      <rect x="55" y="85" width="6" height="6" />
      <rect x="35" y="80" width="6" height="6" />
      <rect x="40" y="65" width="6" height="6" />
      <rect x="75" y="35" width="8" height="6" />
      <rect x="85" y="45" width="6" height="6" />
      <rect x="35" y="25" width="6" height="6" />
    </svg>
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
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
      case 'Allocated':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30';
      case 'Under Maintenance':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
      default:
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-100 dark:border-rose-900/30';
    }
  };

  const getConditionStyle = (cond: string) => {
    switch (cond) {
      case 'Excellent':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Good':
        return 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'Warning':
        return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 bg-emerald-500';
    if (score >= 50) return 'text-amber-500 bg-amber-500';
    return 'text-rose-500 bg-rose-500';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-zinc-100">
            Asset Directory
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            Browse and manage deployment, maintenance states, health scores, and digital passports of physical inventory.
          </p>
        </div>
        {isEditable && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Register Asset
          </button>
        )}
      </div>

      {/* Filters and Views toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name, SN, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100 shadow-sm transition-all"
          />
        </div>

        <div className="flex gap-2 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-850 dark:hover:text-zinc-100'
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'table'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-850 dark:hover:text-zinc-100'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport Grid/Table */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-48 bg-slate-100 dark:bg-zinc-900 rounded-3xl animate-pulse" />
          <div className="h-48 bg-slate-50 dark:bg-zinc-900 rounded-3xl animate-pulse" />
          <div className="h-48 bg-slate-100 dark:bg-zinc-900 rounded-3xl animate-pulse" />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map(asset => (
            <motion.div
              key={asset.id}
              onClick={() => navigate(`/assets/${asset.id}`)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 hover:border-indigo-500/50 dark:hover:border-indigo-400/50 shadow-sm hover:shadow-md rounded-3xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between h-56 relative overflow-hidden group"
            >
              {/* Card visual elements */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusStyle(asset.status)}`}>
                    {asset.status}
                  </span>
                  <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-base line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {asset.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-550">SN: {asset.serial_number}</p>
                </div>
                <div className="p-1 border border-zinc-150 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-zinc-950/60 flex-shrink-0">
                  <QRVisualizer value={asset.qr_code_key} className="h-10 w-10" />
                </div>
              </div>

              {/* Lower Section */}
              <div className="border-t border-zinc-100 dark:border-zinc-850 pt-4 mt-4 flex items-center justify-between text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 text-slate-500 dark:text-zinc-400">
                    <MapPin className="h-3.5 w-3.5" />
                    {asset.location}
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 dark:text-zinc-400">
                    <Tag className="h-3.5 w-3.5" />
                    {asset.category?.name || 'Uncategorized'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className={`h-2.5 w-2.5 rounded-full ${getHealthColor(asset.health_score).split(' ')[1]}`} />
                    <span className="font-bold text-slate-800 dark:text-zinc-100">{asset.health_score}% Health</span>
                  </div>
                  <span className={`inline-block border px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1.5 ${getConditionStyle(asset.condition)}`}>
                    {asset.condition}
                  </span>
                  <button
                    onClick={(e) => handleDownloadPdf(asset.id, e)}
                    disabled={pdfLoadingId === asset.id}
                    className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 ml-auto disabled:opacity-50"
                  >
                    {pdfLoadingId === asset.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
                    PDF
                  </button>
                </div>
              </div>
              
              <ArrowUpRight className="absolute bottom-4 right-4 h-4 w-4 text-slate-300 dark:text-zinc-700 opacity-0 group-hover:opacity-100 group-hover:text-indigo-600 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </motion.div>
          ))}
          {filteredAssets.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400">
              No registered corporate assets matching search.
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm rounded-3xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-850 text-slate-550 dark:text-zinc-400 text-xs font-semibold uppercase border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-4">Asset Name</th>
                <th className="px-6 py-4">Serial Number</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Condition</th>
                <th className="px-6 py-4">Health</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm text-slate-700 dark:text-zinc-300">
              {filteredAssets.map(asset => (
                <tr key={asset.id} className="hover:bg-slate-50/55 dark:hover:bg-zinc-850/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-zinc-100">{asset.name}</td>
                  <td className="px-6 py-4 font-semibold text-slate-500 dark:text-zinc-555">{asset.serial_number}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusStyle(asset.status)}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`border px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getConditionStyle(asset.condition)}`}>
                      {asset.condition}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${getHealthColor(asset.health_score).split(' ')[1]}`} />
                      {asset.health_score}%
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-zinc-400">{asset.location}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-zinc-400">{asset.category?.name || 'Uncategorized'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/assets/${asset.id}`);
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 flex items-center gap-0.5"
                      >
                        Passport
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => handleDownloadPdf(asset.id, e)}
                        disabled={pdfLoadingId === asset.id}
                        className="text-xs font-bold text-slate-600 hover:text-indigo-600 dark:text-zinc-400 flex items-center gap-0.5 disabled:opacity-50"
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
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No registered corporate assets matching search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, x: 200 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 200 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md h-full shadow-2xl relative z-50 flex flex-col justify-between p-8 border-l border-zinc-200 dark:border-zinc-800 rounded-l-3xl overflow-y-auto"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100">Register New Asset</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Add catalog record, digital passport tracking, and serial assignments.
                </p>

                <form id="asset-form" onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Asset/Hardware Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MacBook Pro 16 M3 Max"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. C02F67YMDY3H"
                      value={form.serial_number}
                      onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Storage/Office Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HQ - Room 402, Cabinet 3"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                        Category
                      </label>
                      <select
                        value={form.category_id}
                        onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                        required
                      >
                        <option value="" disabled>Select category</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                        Current Condition
                      </label>
                      <select
                        value={form.condition}
                        onChange={(e) => setForm({ ...form, condition: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                      >
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Warning">Warning</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                        Health Score (0-100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.health_score}
                        onChange={(e) => setForm({ ...form, health_score: parseInt(e.target.value, 10) || 100 })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                        Warranty Expiry
                      </label>
                      <input
                        type="date"
                        value={form.warranty_expiry}
                        onChange={(e) => setForm({ ...form, warranty_expiry: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100 text-slate-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Assign Holder (Optional)
                    </label>
                    <select
                      value={form.current_holder_id}
                      onChange={(e) => setForm({ ...form, current_holder_id: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
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
              <div className="flex gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-6 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-650 dark:text-zinc-400 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="asset-form"
                  disabled={submitLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
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
