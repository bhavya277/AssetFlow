import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  Search,
  Loader2,
  AlertOctagon,
  UserCheck,
  DollarSign,
  PenTool,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import axios from 'axios';

interface Asset {
  id: number;
  name: string;
  serial_number: string;
  status: string;
  current_holder_id?: number | null;
}

interface MaintenanceTask {
  id: number;
  asset_id: number;
  reported_by_id: number;
  description: string;
  priority: string;
  status: string;
  technician_name?: string | null;
  cost: number;
  created_at: string;
  asset?: Asset;
}

export const Maintenance: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [myAssets, setMyAssets] = useState<Asset[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Modal target task
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);

  // Forms
  const [reportForm, setReportForm] = useState({ asset_id: '', priority: 'Low', description: '' });
  const [editForm, setEditForm] = useState({ technician_name: '', cost: '', status: '' });

  const isManager = user?.role === 'Admin' || user?.role === 'Asset Manager';
  const canReportIssue = isManager || myAssets.length > 0;

  const loadData = async () => {
    setLoading(true);
    try {
      const tasksRes = await axios.get<MaintenanceTask[]>('/maintenance/');
      setTasks(tasksRes.data);

      const assetsRes = await axios.get<Asset[]>('/assets/');
      const allocatedToMe = assetsRes.data.filter(
        (a) => a.status === 'Allocated' && a.current_holder_id === user?.id
      );
      setMyAssets(allocatedToMe);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
      showToast('Failed to load maintenance checklist', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportForm.asset_id || !reportForm.description) {
      showToast('Please fill out all issue details', 'warning');
      return;
    }
    setSubmitLoading(true);
    try {
      await axios.post('/maintenance/', {
        asset_id: parseInt(reportForm.asset_id, 10),
        priority: reportForm.priority,
        description: reportForm.description,
      });

      showToast('Maintenance request logged successfully', 'success');
      setReportForm({ asset_id: '', priority: 'Low', description: '' });
      setShowReportModal(false);
      loadData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to submit maintenance request';
      showToast(msg, 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (task: MaintenanceTask, direction: 'forward' | 'backward') => {
    const stages = ['Requested', 'In Progress', 'Awaiting Parts', 'Done'];
    const currIdx = stages.indexOf(task.status);
    let nextIdx = currIdx + (direction === 'forward' ? 1 : -1);
    if (nextIdx < 0 || nextIdx >= stages.length) return;

    try {
      await axios.patch(`/maintenance/${task.id}/status`, null, {
        params: { status: stages[nextIdx] },
      });
      showToast(`Servicing moved to ${stages[nextIdx]}`, 'success');
      loadData();
    } catch (error: any) {
      showToast('Failed to change maintenance status', 'error');
    }
  };

  const handleOpenEdit = (task: MaintenanceTask) => {
    setSelectedTask(task);
    setEditForm({
      technician_name: task.technician_name || '',
      cost: task.cost ? String(task.cost) : '',
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
        technician_name: editForm.technician_name || null,
        cost: editForm.cost ? parseFloat(editForm.cost) : 0.0,
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

  const getDeviceFailureCount = (assetId: number) => {
    return tasks.filter(t => t.asset_id === assetId).length;
  };

  const filteredTasks = tasks.filter(t =>
    t.asset?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.technician_name && t.technician_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-500 dark:border-rose-900/30';
      case 'High':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-500 dark:border-amber-900/30';
      default:
        return 'bg-zinc-50 text-zinc-600 border-zinc-205 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800';
    }
  };

  const kanbanColumns = ['Requested', 'In Progress', 'Awaiting Parts', 'Done'];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Maintenance Management
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            File device repair requests, manage technician work orders, and review hardware service logs.
          </p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          disabled={!canReportIssue}
          className="premium-button-primary flex items-center gap-1.5 text-xs font-semibold"
        >
          <Wrench className="h-4 w-4" />
          Report Issue
        </button>
      </div>

      {!isManager && !canReportIssue && !loading && (
        <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-900/30 rounded-lg px-3.5 py-2.5">
          Maintenance ticket filing is restricted. No active asset allocations found for your account.
        </p>
      )}

      {/* Search filter */}
      <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 premium-input text-xs"
          />
        </div>
      </div>

      {/* Kanban Grid Layout */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-80 bg-zinc-100 dark:bg-zinc-900 rounded-xl animate-pulse" />
          <div className="h-80 bg-zinc-50 dark:bg-zinc-900 rounded-xl animate-pulse" />
          <div className="h-80 bg-zinc-100 dark:bg-zinc-900 rounded-xl animate-pulse" />
          <div className="h-80 bg-zinc-50 dark:bg-zinc-900 rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {kanbanColumns.map(column => {
            const columnTasks = filteredTasks.filter(t => t.status === column);
            return (
              <div
                key={column}
                className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 flex flex-col space-y-3 min-h-[500px]"
              >
                <div className="flex justify-between items-center px-1">
                  <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs tracking-tight">{column}</h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[600px] pr-0.5">
                  {columnTasks.map(task => {
                    const failures = getDeviceFailureCount(task.asset_id);
                    const showWarning = failures >= 3 && task.status !== 'Done';

                    return (
                      <motion.div
                        key={task.id}
                        layoutId={`task-${task.id}`}
                        className="premium-card p-4 space-y-2 relative overflow-hidden group"
                      >
                        {/* Predictive replacement warning indicator */}
                        {showWarning && (
                          <div className="bg-rose-50/50 dark:bg-rose-950/15 border-l-2 border-rose-500 p-2 rounded text-[9px] text-rose-700 dark:text-rose-500 font-bold flex gap-1 items-start mb-2">
                            <AlertOctagon className="h-3 w-3 text-rose-500 flex-shrink-0" />
                            <span>Failed {failures} times. Replace advised.</span>
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs line-clamp-1">{task.asset?.name}</h4>
                            <span className={`inline-block border px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider ${getPriorityStyle(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                          <p className="text-zinc-500 text-[11px] leading-relaxed line-clamp-2">{task.description}</p>
                          
                          {/* Technician and Cost status */}
                          <div className="flex justify-between items-center text-[10px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2">
                            <span className="flex items-center gap-1 font-medium">
                              <UserCheck className="h-3.5 w-3.5 text-zinc-400" />
                              {task.technician_name || 'Unassigned'}
                            </span>
                            {task.cost > 0 && (
                              <span className="flex items-center text-zinc-800 dark:text-zinc-300 font-bold">
                                <DollarSign className="h-3 w-3 text-emerald-600" />
                                {task.cost}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Kanban action sliders */}
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isManager ? (
                            <button
                              onClick={() => handleOpenEdit(task)}
                              className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-0.5"
                            >
                              <PenTool className="h-3 w-3" />
                              Manage
                            </button>
                          ) : (
                            <span />
                          )}

                          <div className="flex gap-1">
                            {column !== 'Requested' && (
                              <button
                                onClick={() => handleUpdateTaskStatus(task, 'backward')}
                                className="p-1 border border-zinc-200 dark:border-zinc-800 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800"
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </button>
                            )}
                            {column !== 'Done' && (
                              <button
                                onClick={() => handleUpdateTaskStatus(task, 'forward')}
                                className="p-1 border border-zinc-200 dark:border-zinc-800 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800"
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
                    <div className="text-center py-10 text-zinc-400 text-[10px] border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/20">
                      Empty Column
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
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Report Asset Issue</h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Log malfunctions, wear damage or technical faults for assets assigned to you.
                  </p>
                </div>

                <form id="report-form" onSubmit={handleReportIssue} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                      Malfunctioning Asset
                    </label>
                    <select
                      value={reportForm.asset_id}
                      onChange={(e) => setReportForm({ ...reportForm, asset_id: e.target.value })}
                      className="w-full premium-input"
                      required
                    >
                      <option value="" disabled>Select Asset</option>
                      {myAssets.map(a => (
                        <option key={a.id} value={a.id}>{a.name} (SN: {a.serial_number})</option>
                      ))}
                    </select>
                    {!isManager && myAssets.length === 0 && (
                      <p className="text-[10px] text-rose-500 mt-1">No assets are currently assigned to you.</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                      Priority Degree
                    </label>
                    <select
                      value={reportForm.priority}
                      onChange={(e) => setReportForm({ ...reportForm, priority: e.target.value })}
                      className="w-full premium-input"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                      Description of Issues
                    </label>
                    <textarea
                      placeholder="Write exact fault description..."
                      value={reportForm.description}
                      onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                      className="w-full premium-input h-28 resize-none"
                      required
                    />
                  </div>
                </form>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 premium-button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="report-form"
                  disabled={submitLoading}
                  className="flex-1 premium-button-primary"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Manage Maintenance</h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Assign engineer file, update repair invoice costs, and update board stage.
                  </p>
                </div>

                <form id="edit-form" onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                      Assign Technician / Engineer
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John Carpenter"
                      value={editForm.technician_name}
                      onChange={(e) => setEditForm({ ...editForm, technician_name: e.target.value })}
                      className="w-full premium-input"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                      Repair & Servicing Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={editForm.cost}
                      onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                      className="w-full premium-input"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                      Board Column Stage
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full premium-input"
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
              <div className="flex gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 premium-button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="edit-form"
                  disabled={submitLoading}
                  className="flex-1 premium-button-primary"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
