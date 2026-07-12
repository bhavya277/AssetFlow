import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ClipboardCheck, Play, CheckCircle2, AlertCircle, Loader2, ArrowRight, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import axios from 'axios';

interface Auditor {
  id: number;
  full_name: string;
  email: string;
}

interface AuditSession {
  id: number;
  title: string;
  status: string;
  created_at: string;
  auditor?: Auditor;
}

interface PendingAsset {
  id: number;
  name: string;
  serial_number: string;
  location: string;
  condition: string;
}

interface CompletedAudit {
  id: number;
  asset_id: number;
  asset_name: string;
  serial_number: string;
  audited_at: string;
  verified: boolean;
  condition_match: string;
  notes?: string | null;
}

interface AuditDetails {
  id: number;
  title: string;
  status: string;
  created_at: string;
  auditor: Auditor;
  progress: number;
  completed_audits: CompletedAudit[];
  pending_assets: PendingAsset[];
}

export const Audits: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const [activeSession, setActiveSession] = useState<AuditDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const [showStartModal, setShowStartModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<PendingAsset | null>(null);

  // Form states
  const [sessionTitle, setSessionTitle] = useState('');
  const [verifyForm, setVerifyForm] = useState({
    verified: true,
    condition_match: 'Match',
    notes: '',
  });

  const isAuditor = user?.role === 'Admin' || user?.role === 'Asset Manager';

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await axios.get<AuditSession[]>('/audits/sessions');
      setSessions(response.data);

      // Check if there is an in-progress session and load details
      const active = response.data.find(s => s.status === 'In Progress');
      if (active) {
        await loadSessionDetails(active.id);
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      console.error('Error fetching audit sessions:', error);
      showToast('Failed to load audit history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (sessionId: number) => {
    try {
      const response = await axios.get<AuditDetails>(`/audits/sessions/${sessionId}`);
      setActiveSession(response.data);
    } catch (error) {
      console.error('Error loading session details:', error);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitle) {
      showToast('Audit session title is required', 'warning');
      return;
    }
    setSubmitLoading(true);
    try {
      const response = await axios.post<AuditSession>('/audits/sessions', { title: sessionTitle });
      showToast('Audit session initialized', 'success');
      setSessionTitle('');
      setShowStartModal(false);
      await loadSessionDetails(response.data.id);
      loadSessions();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to start audit session';
      showToast(msg, 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleVerifyAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !selectedAsset) return;

    setSubmitLoading(true);
    try {
      await axios.post(`/audits/sessions/${activeSession.id}/logs`, {
        asset_id: selectedAsset.id,
        verified: verifyForm.verified,
        condition_match: verifyForm.condition_match,
        notes: verifyForm.notes,
      });

      showToast(`Asset '${selectedAsset.name}' verified`, 'success');
      setVerifyForm({ verified: true, condition_match: 'Match', notes: '' });
      setSelectedAsset(null);
      setShowVerifyModal(false);
      loadSessionDetails(activeSession.id);
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to submit verification';
      showToast(msg, 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!activeSession) return;
    try {
      await axios.post(`/audits/sessions/${activeSession.id}/complete`);
      showToast('Audit session finalized successfully', 'success');
      setActiveSession(null);
      loadSessions();
    } catch (error) {
      showToast('Failed to complete audit session', 'error');
    }
  };

  const getEventDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-zinc-100">
            Asset Audit
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            Reconcile physical hardware, scan serial numbers, and sign off on verified inventory records.
          </p>
        </div>
        {isAuditor && !activeSession && (
          <button
            onClick={() => setShowStartModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-95"
          >
            <Play className="h-4 w-4 animate-pulse" />
            Start Audit Session
          </button>
        )}
      </div>

      {/* Loading state spinner */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : activeSession ? (
        /* ACTIVE AUDIT DASHBOARD SCREEN */
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
            <div className="space-y-1.5 flex-grow">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/30 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                Active Session: {activeSession.title}
              </span>
              <p className="text-xs text-slate-400">Auditor: {activeSession.auditor.full_name} • Started: {getEventDate(activeSession.created_at)}</p>
            </div>
            
            {/* Session Progress details */}
            <div className="w-full md:w-80 flex items-center gap-4">
              <div className="flex-grow">
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-800 dark:text-zinc-200">Session Progress</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{activeSession.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${activeSession.progress}%` }} />
                </div>
              </div>
              
              {isAuditor && (
                <button
                  onClick={handleCompleteSession}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-emerald-600/10 flex-shrink-0"
                >
                  Finalize Audit
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Box: Pending assets */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 dark:text-zinc-150 mb-4 flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-indigo-500" />
                Pending Verification ({activeSession.pending_assets.length})
              </h3>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {activeSession.pending_assets.map(asset => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-zinc-950/20 border border-zinc-200/30 dark:border-zinc-800/30 rounded-2xl"
                  >
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-zinc-100 text-sm">{asset.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">SN: {asset.serial_number} • Loc: {asset.location}</p>
                    </div>
                    {isAuditor ? (
                      <button
                        onClick={() => {
                          setSelectedAsset(asset);
                          setShowVerifyModal(true);
                        }}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        Verify
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Awaiting auditor</span>
                    )}
                  </div>
                ))}
                {activeSession.pending_assets.length === 0 && (
                  <div className="text-center py-12 text-slate-450 text-xs">
                    All assets in the directory verified successfully!
                  </div>
                )}
              </div>
            </div>

            {/* Right Box: Completed audits logs */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 dark:text-zinc-150 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-pulse" />
                Verified Logs ({activeSession.completed_audits.length})
              </h3>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {activeSession.completed_audits.map(log => (
                  <div
                    key={log.id}
                    className="p-4 bg-slate-50/50 dark:bg-zinc-950/20 border border-zinc-200/30 dark:border-zinc-800/30 rounded-2xl text-xs flex justify-between items-start"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-zinc-100">{log.asset_name}</h4>
                      <p className="text-[10px] text-slate-400">SN: {log.serial_number}</p>
                      {log.notes && (
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1.5 p-2 bg-slate-100/50 dark:bg-zinc-800/50 rounded-lg italic">
                          Notes: "{log.notes}"
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right space-y-1.5">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.verified ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {log.verified ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {log.verified ? 'Verified' : 'Missing'}
                      </span>
                      <div>
                        <span className={`inline-block text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          log.condition_match === 'Match'
                            ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                            : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                        }`}>
                          {log.condition_match}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {activeSession.completed_audits.length === 0 && (
                  <div className="text-center py-12 text-slate-450 text-xs">
                    No verified logs submitted in this session.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ARCHIVED AUDIT HISTORY LIST */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm rounded-3xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-850 text-slate-550 dark:text-zinc-400 text-xs font-semibold uppercase border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-4">Audit Title</th>
                <th className="px-6 py-4">Auditor</th>
                <th className="px-6 py-4">Session Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm text-slate-700 dark:text-zinc-300">
              {sessions.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/55 dark:hover:bg-zinc-850/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-zinc-100">{s.title}</td>
                  <td className="px-6 py-4 font-semibold text-slate-600 dark:text-zinc-300">{s.auditor?.full_name}</td>
                  <td className="px-6 py-4 text-slate-500">{getEventDate(s.created_at)}</td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100/35">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-400">
                    No audit records logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* START NEW SESSION DIALOG */}
      <AnimatePresence>
        {showStartModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStartModal(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md shadow-2xl relative z-50 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800"
            >
              <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-indigo-500" />
                Initialize Audit Session
              </h2>
              <p className="text-xs text-slate-550 dark:text-zinc-400 mt-1">
                Start a live physical inventory reconciliation session.
              </p>

              <form onSubmit={handleStartSession} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                    Session Audit Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Q3 2026 Fleet Hardware Audit"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                    required
                  />
                </div>

                <div className="flex gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-6 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowStartModal(false)}
                    className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-650 dark:text-zinc-400 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 active:scale-95 disabled:opacity-50 disabled:scale-100"
                  >
                    {submitLoading ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      'Start Session'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VERIFY CHECKLIST MODAL */}
      <AnimatePresence>
        {showVerifyModal && selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedAsset(null);
                setShowVerifyModal(false);
              }}
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, x: 200 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 200 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md h-full shadow-2xl relative z-50 flex flex-col justify-between p-8 border-l border-zinc-200 dark:border-zinc-800 rounded-l-3xl overflow-y-auto"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                  <ClipboardCheck className="h-5.5 w-5.5 text-indigo-500" />
                  Verify: {selectedAsset.name}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Perform visual serial validation and condition checks.
                </p>

                <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-850 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Serial Number:</span>
                    <span className="font-mono text-slate-800 dark:text-zinc-200 font-bold">{selectedAsset.serial_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Logged Location:</span>
                    <span className="text-slate-850 dark:text-zinc-200">{selectedAsset.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Recorded Condition:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedAsset.condition}</span>
                  </div>
                </div>

                <form id="verify-form" onSubmit={handleVerifyAsset} className="mt-8 space-y-6">
                  {/* Verified Checkbox */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="verified"
                      checked={verifyForm.verified}
                      onChange={(e) => setVerifyForm({ ...verifyForm, verified: e.target.checked })}
                      className="mt-1 h-4.5 w-4.5 text-indigo-600 border-zinc-200 dark:border-zinc-800 rounded focus:ring-indigo-500/20"
                    />
                    <div>
                      <label htmlFor="verified" className="block text-xs font-bold text-slate-800 dark:text-zinc-200">
                        Asset Present / Verified
                      </label>
                      <p className="text-[10px] text-slate-450 mt-0.5">Check if item is physically accounted for in location.</p>
                    </div>
                  </div>

                  {/* Condition Match */}
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Condition Reconciled
                    </label>
                    <select
                      value={verifyForm.condition_match}
                      onChange={(e) => setVerifyForm({ ...verifyForm, condition_match: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                    >
                      <option value="Match">Condition Matches Record</option>
                      <option value="Mismatch">Condition Mismatch (Damaged/Degraded)</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Auditor Discrepancy Notes
                    </label>
                    <textarea
                      placeholder="e.g. verified screen scratch, missing charging adapter, or confirm serial check matching..."
                      value={verifyForm.notes}
                      onChange={(e) => setVerifyForm({ ...verifyForm, notes: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100 h-28 resize-none"
                    />
                  </div>
                </form>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-6 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAsset(null);
                    setShowVerifyModal(false);
                  }}
                  className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-655 dark:text-zinc-400 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="verify-form"
                  disabled={submitLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Confirm Verify'
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
