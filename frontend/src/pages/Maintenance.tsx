import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Loader2, Wrench, UserCheck, AlertOctagon, ArrowLeft, ArrowRight, DollarSign, PenTool } from 'lucide-react';
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
}

interface MaintenanceTask {
  id: number;
  asset_id: number;
  reported_by_id: number;
  technician_name?: string | null;
  description: string;
  priority: string;
  cost: number;
  status: string;
  created_at: string;
  asset?: Asset;
  reported_by?: User;
}

export const Maintenance: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);

  // Form states
  const [reportForm, setReportForm] = useState({ asset_id: '', description: '', priority: 'Medium' });
  const [editForm, setEditForm] = useState({ technician_name: '', cost: '', status: '' });

  const isManager = user?.role === 'Admin' || user?.role === 'Asset Manager';

  const myAssets = isManager
    ? assets
    : assets.filter((a) => a.current_holder_id === user?.id);

  const canReportIssue = isManager || myAssets.length > 0;

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, assetsRes] = await Promise.all([
        axios.get<MaintenanceTask[]>('/maintenance/'),
        axios.get<Asset[]>('/assets/'),
      ]);
      setTasks(tasksRes.data);
      setAssets(assetsRes.data);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
      showToast('Failed to load maintenance records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportForm.asset_id || !reportForm.description) {
      showToast('Please select an asset and write an issue description', 'warning');
      return;
    }
    setSubmitLoading(true);
    try {
      await axios.post('/maintenance/', {
        asset_id: parseInt(reportForm.asset_id, 10),
        description: reportForm.description,
        priority: reportForm.priority,
      });
      showToast('Maintenance request logged successfully', 'success');
      setReportForm({ asset_id: '', description: '', priority: 'Medium' });
      setShowReportModal(false);
      loadData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to report maintenance issue';
      showToast(msg, 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (task: MaintenanceTask, direction: 'forward' | 'backward') => {
    const columns = ['Requested', 'In Progress', 'Awaiting Parts', 'Done'];
    const currentIndex = columns.indexOf(task.status);
    let nextIndex = currentIndex;
    
    if (direction === 'forward' && currentIndex < columns.length - 1) {
      nextIndex += 1;
    } else if (direction === 'backward' && currentIndex > 0) {
      nextIndex -= 1;
    }

    if (nextIndex === currentIndex) return;

    try {
      await axios.put(`/maintenance/${task.id}`, { status: columns[nextIndex] });
      showToast(`Task moved to ${columns[nextIndex]}`, 'success');
      loadData();
    } catch (error: any) {
      showToast('Failed to move task stage', 'error');
    }
  };

  const handleOpenEdit = (task: MaintenanceTask) => {
    setSelectedTask(task);
    setEditForm({
      technician_name: task.technician_name || '',
      cost: task.cost ? task.cost.toString() : '0',
      status: task.status,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    setSubmitLoading(true);
    try {
      await axios.put(`/maintenance/${selectedTask.id}`, {
        technician_name: editForm.technician_name,
        cost: parseFloat(editForm.cost) || 0.0,
        status: editForm.status,
      });
      showToast('Maintenance task updated successfully', 'success');
      setShowEditModal(false);
      setSelectedTask(null);
      loadData();
    } catch (error: any) {
      showToast('Failed to update maintenance task', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Helper function to count device failures for predictive replacement warning
  const getDeviceFailureCount = (assetId: number) => {
    return tasks.filter(t => t.asset_id === assetId).length;
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(t =>
    t.asset?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.technician_name && t.technician_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400';
      case 'High':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400';
      default:
        return 'bg-slate-50 text-slate-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-350';
    }
  };

  const kanbanColumns = ['Requested', 'In Progress', 'Awaiting Parts', 'Done'];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-zinc-100">
            Maintenance Management
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            File device repair requests, manage technician work orders, and review hardware service logs.
          </p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          disabled={!canReportIssue}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          <Wrench className="h-4 w-4" />
          Report Issue
        </button>
      </div>

      {!isManager && !canReportIssue && !loading && (
        <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl px-4 py-3">
          You can only report maintenance for assets currently assigned to you. No allocated assets found.
        </p>
      )}

      {/* Search filter */}
      <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search by asset, technician, details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Kanban Grid Layout */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-96 bg-slate-100 dark:bg-zinc-900 rounded-3xl animate-pulse" />
          <div className="h-96 bg-slate-50 dark:bg-zinc-900 rounded-3xl animate-pulse" />
          <div className="h-96 bg-slate-100 dark:bg-zinc-900 rounded-3xl animate-pulse" />
          <div className="h-96 bg-slate-50 dark:bg-zinc-900 rounded-3xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {kanbanColumns.map(column => {
            const columnTasks = filteredTasks.filter(t => t.status === column);
            return (
              <div
                key={column}
                className="bg-slate-100/60 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/40 rounded-3xl p-4 flex flex-col space-y-4 min-h-[500px]"
              >
                <div className="flex justify-between items-center px-1">
                  <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-sm">{column}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-4 overflow-y-auto max-h-[600px] pr-1">
                  {columnTasks.map(task => {
                    const failures = getDeviceFailureCount(task.asset_id);
                    const showWarning = failures >= 3 && task.status !== 'Done';

                    return (
                      <motion.div
                        key={task.id}
                        layoutId={`task-${task.id}`}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-850 rounded-2xl p-4 shadow-xs relative overflow-hidden group hover:shadow-sm"
                      >
                        {/* Predictive replacement warning indicator */}
                        {showWarning && (
                          <div className="bg-rose-50 dark:bg-rose-950/20 border-l-2 border-rose-500 p-2 rounded-xl mb-3 text-[10px] text-rose-700 dark:text-rose-455 font-semibold flex gap-1.5 items-start">
                            <AlertOctagon className="h-3.5 w-3.5 text-rose-500 mt-0.5 flex-shrink-0" />
                            <span>Failed {failures} times. Replacement advised.</span>
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-slate-800 dark:text-zinc-150 text-xs line-clamp-1">{task.asset?.name}</h4>
                            <span className={`inline-block border px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${getPriorityStyle(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2">{task.description}</p>
                          
                          {/* Technician and Cost status */}
                          <div className="flex justify-between items-center text-[10px] text-slate-450 border-t border-zinc-100 dark:border-zinc-850 pt-2.5">
                            <span className="flex items-center gap-1">
                              <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                              {task.technician_name || 'Unassigned'}
                            </span>
                            {task.cost > 0 && (
                              <span className="flex items-center text-slate-800 dark:text-zinc-300 font-semibold">
                                <DollarSign className="h-3 w-3 text-emerald-500" />
                                {task.cost}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Kanban action sliders */}
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-zinc-50 dark:border-zinc-850 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isManager ? (
                            <button
                              onClick={() => handleOpenEdit(task)}
                              className="text-[9px] font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 flex items-center gap-0.5"
                            >
                              <PenTool className="h-3 w-3" />
                              Manage
                            </button>
                          ) : (
                            <span />
                          )}

                          <div className="flex gap-1.5">
                            {column !== 'Requested' && (
                              <button
                                onClick={() => handleUpdateTaskStatus(task, 'backward')}
                                className="p-1 border border-zinc-200 dark:border-zinc-800 rounded hover:bg-slate-50 dark:hover:bg-zinc-850"
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </button>
                            )}
                            {column !== 'Done' && (
                              <button
                                onClick={() => handleUpdateTaskStatus(task, 'forward')}
                                className="p-1 border border-zinc-200 dark:border-zinc-800 rounded hover:bg-slate-50 dark:hover:bg-zinc-850"
                              >
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {columnTasks.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                      Empty column
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REPORT ISSUE MODAL */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, x: 200 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 200 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md h-full shadow-2xl relative z-50 flex flex-col justify-between p-8 border-l border-zinc-200 dark:border-zinc-800 rounded-l-3xl overflow-y-auto"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100">Report Asset Issue</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Log malfunctions, wear damage or technical faults for assets assigned to you.
                </p>

                <form id="report-form" onSubmit={handleReportIssue} className="mt-8 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Malfunctioning Asset
                    </label>
                    <select
                      value={reportForm.asset_id}
                      onChange={(e) => setReportForm({ ...reportForm, asset_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                      required
                    >
                      <option value="" disabled>Select Asset</option>
                      {myAssets.map(a => (
                        <option key={a.id} value={a.id}>{a.name} (SN: {a.serial_number})</option>
                      ))}
                    </select>
                    {!isManager && myAssets.length === 0 && (
                      <p className="text-[11px] text-amber-600 mt-2">No assets are currently assigned to you.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Priority Degree
                    </label>
                    <select
                      value={reportForm.priority}
                      onChange={(e) => setReportForm({ ...reportForm, priority: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Description of Issues
                    </label>
                    <textarea
                      placeholder="Write exact fault description (e.g. laptop keyboard keys caps locking, battery drains under 40 minutes...)"
                      value={reportForm.description}
                      onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100 h-28 resize-none"
                      required
                    />
                  </div>
                </form>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-6 mt-6">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-655 dark:text-zinc-400 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="report-form"
                  disabled={submitLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Reporting...
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

      {/* EDIT/UPDATE MAINTENANCE TASK MODAL (Admins/Managers only) */}
      <AnimatePresence>
        {showEditModal && selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, x: 200 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 200 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md h-full shadow-2xl relative z-50 flex flex-col justify-between p-8 border-l border-zinc-200 dark:border-zinc-800 rounded-l-3xl overflow-y-auto"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100">Manage Maintenance</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Assign engineer file, update repair invoice costs, and update board stage.
                </p>

                <form id="edit-form" onSubmit={handleEditSubmit} className="mt-8 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Assign Technician / Engineer
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John Carpenter"
                      value={editForm.technician_name}
                      onChange={(e) => setEditForm({ ...editForm, technician_name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Repair & Servicing Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={editForm.cost}
                      onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Board Column Stage
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                    >
                      <option value="Requested">Requested</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Awaiting Parts">Awaiting Parts</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                </form>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-6 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-655 dark:text-zinc-400 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="edit-form"
                  disabled={submitLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
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
