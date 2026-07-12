import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Loader2, Check, X, ArrowRightLeft, CornerDownLeft, Info, HelpCircle } from 'lucide-react';
import axios from 'axios';

interface Asset {
  id: number;
  name: string;
  serial_number: string;
  status: string;
  current_holder_id?: number | null;
}

interface User {
  id: number;
  full_name: string;
  email: string;
}

interface Allocation {
  id: number;
  asset_id: number;
  allocated_to_id: number;
  allocated_by_id: number;
  allocated_at: string;
  returned_at?: string | null;
  status: string;
  asset?: Asset;
  allocated_to?: User;
}

interface Transfer {
  id: number;
  asset_id: number;
  requested_by_id: number;
  target_employee_id: number;
  status: string;
  requested_at: string;
  asset?: Asset;
  requested_by?: User;
  target_employee?: User;
}

export const Allocations: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Tabs: 'allocations' | 'transfers'
  const [activeTab, setActiveTab] = useState<'allocations' | 'transfers'>('allocations');
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Form states
  const [allocForm, setAllocForm] = useState({ asset_id: '', allocated_to_id: '' });
  const [transferForm, setTransferForm] = useState({ asset_id: '', target_employee_id: '' });

  const isManager = user?.role === 'Admin' || user?.role === 'Asset Manager';
  const isApprover = isManager || user?.role === 'Department Head';

  const loadData = async () => {
    setLoading(true);
    try {
      const [allocRes, transRes, assetsRes, usersRes] = await Promise.all([
        axios.get<Allocation[]>('/allocations/'),
        axios.get<Transfer[]>('/allocations/transfers'),
        axios.get<Asset[]>('/assets/'),
        axios.get<User[]>('/users/'),
      ]);
      setAllocations(allocRes.data);
      setTransfers(transRes.data);
      setAssets(assetsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching allocations data:', error);
      showToast('Failed to load allocation records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocForm.asset_id || !allocForm.allocated_to_id) {
      showToast('Please select an asset and recipient employee', 'warning');
      return;
    }
    setSubmitLoading(true);
    try {
      await axios.post('/allocations/', {
        asset_id: parseInt(allocForm.asset_id, 10),
        allocated_to_id: parseInt(allocForm.allocated_to_id, 10),
      });
      showToast('Asset allocated successfully', 'success');
      setAllocForm({ asset_id: '', allocated_to_id: '' });
      setShowAllocateModal(false);
      loadData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to allocate asset';
      showToast(msg, 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleReturn = async (id: number) => {
    try {
      await axios.post(`/allocations/${id}/return`);
      showToast('Asset returned to storage successfully', 'success');
      loadData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to register return';
      showToast(msg, 'error');
    }
  };

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.asset_id || !transferForm.target_employee_id) {
      showToast('Please select an allocated asset and target employee', 'warning');
      return;
    }
    setSubmitLoading(true);
    try {
      await axios.post('/allocations/transfers', {
        asset_id: parseInt(transferForm.asset_id, 10),
        target_employee_id: parseInt(transferForm.target_employee_id, 10),
      });
      showToast('Transfer request submitted successfully', 'success');
      setTransferForm({ asset_id: '', target_employee_id: '' });
      setShowTransferModal(false);
      loadData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to submit transfer request';
      showToast(msg, 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleProcessTransfer = async (id: number, status: 'Approved' | 'Rejected') => {
    try {
      await axios.post(`/allocations/transfers/${id}/process`, { status });
      showToast(`Transfer request ${status.toLowerCase()} successfully`, 'success');
      loadData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to process transfer';
      showToast(msg, 'error');
    }
  };

  // Filter lists
  const activeAllocations = allocations.filter(a => a.status === 'Active');
  const filteredAllocations = activeAllocations.filter(a =>
    a.asset?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.allocated_to?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.asset?.serial_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransfers = transfers.filter(t =>
    t.asset?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.requested_by?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.target_employee?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper arrays for selects
  const availableAssets = assets.filter(a => a.status === 'Available');
  const allocatedAssets = assets.filter(a => a.status === 'Allocated');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-zinc-100">
            Allocation & Transfer
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            Assign company physical items to users, view active custodian mappings, and approve hardware transition workflows.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-650 dark:text-zinc-300 rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-95"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Request Transfer
          </button>
          {isManager && (
            <button
              onClick={() => setShowAllocateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-95"
            >
              <Plus className="h-4 w-4" />
              New Allocation
            </button>
          )}
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex gap-2 bg-slate-100 dark:bg-zinc-900 p-1 rounded-2xl">
          <button
            onClick={() => { setActiveTab('allocations'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'allocations'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-550 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100'
            }`}
          >
            Active Allocations
          </button>
          <button
            onClick={() => { setActiveTab('transfers'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'transfers'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-550 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100'
            }`}
          >
            Transfer Workflows
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'allocations' ? 'allocations' : 'transfers'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Main Table area */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm rounded-3xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="h-10 bg-slate-50 dark:bg-zinc-850 rounded-2xl animate-pulse" />
            <div className="h-14 bg-slate-100 dark:bg-zinc-850 rounded-2xl animate-pulse" />
            <div className="h-14 bg-slate-50 dark:bg-zinc-850 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'allocations' ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-850 text-slate-550 dark:text-zinc-400 text-xs font-semibold uppercase border-b border-zinc-100 dark:border-zinc-800">
                    <th className="px-6 py-4">Asset Detail</th>
                    <th className="px-6 py-4">Serial Number</th>
                    <th className="px-6 py-4">Custodian (User)</th>
                    <th className="px-6 py-4">Allocated Date</th>
                    {isManager && <th className="px-6 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm text-slate-700 dark:text-zinc-300">
                  {filteredAllocations.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/55 dark:hover:bg-zinc-850/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-zinc-100">{a.asset?.name || 'Unknown Asset'}</td>
                      <td className="px-6 py-4 font-mono text-slate-500 text-xs">{a.asset?.serial_number}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-zinc-250">{a.allocated_to?.full_name}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(a.allocated_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      {isManager && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleReturn(a.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-650 dark:text-zinc-400 rounded-xl text-xs font-semibold transition-colors"
                          >
                            <CornerDownLeft className="h-3.5 w-3.5 text-indigo-500" />
                            Return Store
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredAllocations.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">
                        No active allocations found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              /* Transfers Table */
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-850 text-slate-550 dark:text-zinc-400 text-xs font-semibold uppercase border-b border-zinc-100 dark:border-zinc-800">
                    <th className="px-6 py-4">Asset Detail</th>
                    <th className="px-6 py-4">Requested By</th>
                    <th className="px-6 py-4">Target Employee</th>
                    <th className="px-6 py-4">Requested Date</th>
                    <th className="px-6 py-4">Status</th>
                    {isApprover && <th className="px-6 py-4 text-right">Approval Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm text-slate-700 dark:text-zinc-300">
                  {filteredTransfers.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/55 dark:hover:bg-zinc-850/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-zinc-100">{t.asset?.name || 'Unknown Asset'}</td>
                      <td className="px-6 py-4 font-semibold text-slate-600 dark:text-zinc-300">{t.requested_by?.full_name}</td>
                      <td className="px-6 py-4 font-bold text-slate-850 dark:text-zinc-200">{t.target_employee?.full_name}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(t.requested_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                          t.status === 'Pending'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30'
                            : t.status === 'Approved'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      {isApprover && (
                        <td className="px-6 py-4 text-right">
                          {t.status === 'Pending' ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleProcessTransfer(t.id, 'Approved')}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors"
                                title="Approve Transfer"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleProcessTransfer(t.id, 'Rejected')}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 border border-rose-200 dark:border-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg transition-colors"
                                title="Reject Transfer"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Processed</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredTransfers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        No transfer requests logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* NEW ALLOCATION MODAL */}
      <AnimatePresence>
        {showAllocateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllocateModal(false)}
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, x: 200 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 200 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md h-full shadow-2xl relative z-50 flex flex-col justify-between p-8 border-l border-zinc-200 dark:border-zinc-800 rounded-l-3xl"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100">Allocate Company Asset</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Assign available stock items to verified personnel files.
                </p>

                <form id="allocate-form" onSubmit={handleAllocate} className="mt-8 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Available Stock Assets
                    </label>
                    <select
                      value={allocForm.asset_id}
                      onChange={(e) => setAllocForm({ ...allocForm, asset_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                      required
                    >
                      <option value="" disabled>Select Asset</option>
                      {availableAssets.map(a => (
                        <option key={a.id} value={a.id}>{a.name} (SN: {a.serial_number})</option>
                      ))}
                    </select>
                    {availableAssets.length === 0 && (
                      <p className="text-[10px] text-rose-500 mt-1.5 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        No assets in storage are currently "Available".
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Recipient Employee
                    </label>
                    <select
                      value={allocForm.allocated_to_id}
                      onChange={(e) => setAllocForm({ ...allocForm, allocated_to_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                      required
                    >
                      <option value="" disabled>Select Recipient</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                </form>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-6">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-650 dark:text-zinc-400 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="allocate-form"
                  disabled={submitLoading || availableAssets.length === 0}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Allocating...
                    </>
                  ) : (
                    'Confirm Allocation'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REQUEST TRANSFER MODAL */}
      <AnimatePresence>
        {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTransferModal(false)}
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, x: 200 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 200 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md h-full shadow-2xl relative z-50 flex flex-col justify-between p-8 border-l border-zinc-200 dark:border-zinc-800 rounded-l-3xl"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100">Request Asset Transfer</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Submit requests to reassign an already allocated item to another user.
                </p>

                <form id="transfer-form" onSubmit={handleRequestTransfer} className="mt-8 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Allocated Assets
                    </label>
                    <select
                      value={transferForm.asset_id}
                      onChange={(e) => setTransferForm({ ...transferForm, asset_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                      required
                    >
                      <option value="" disabled>Select Asset</option>
                      {allocatedAssets.map(a => (
                        <option key={a.id} value={a.id}>{a.name} (SN: {a.serial_number})</option>
                      ))}
                    </select>
                    {allocatedAssets.length === 0 && (
                      <p className="text-[10px] text-slate-455 mt-1.5 flex items-center gap-1">
                        <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
                        No assets are currently "Allocated" in the organization.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Recipient Employee (Target)
                    </label>
                    <select
                      value={transferForm.target_employee_id}
                      onChange={(e) => setTransferForm({ ...transferForm, target_employee_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                      required
                    >
                      <option value="" disabled>Select Recipient</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                </form>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-6">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-650 dark:text-zinc-400 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="transfer-form"
                  disabled={submitLoading || allocatedAssets.length === 0}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    'Submit Request'
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
