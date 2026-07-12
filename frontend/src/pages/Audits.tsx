import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardCheck, Play, CheckCircle2, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
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
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Physical Asset Audit
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Reconcile physical hardware, scan serial numbers, and sign off on verified inventory records.
          </p>
        </div>
        {isAuditor && !activeSession && (
          <button
            onClick={() => setShowStartModal(true)}
            className="premium-button-primary flex items-center gap-1.5 text-xs font-semibold"
          >
            <Play className="h-4 w-4" />
            Start Audit Session
          </button>
        )}
      </div>

      {/* Loading state spinner */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : activeSession ? (
        /* ACTIVE AUDIT DASHBOARD SCREEN */
        <div className="space-y-5">
          <div className="premium-card p-5 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
            <div className="space-y-1.5 flex-grow">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-800 dark:bg-zinc-200 animate-ping" />
                Active Session: {activeSession.title}
              </span>
              <p className="text-[11px] text-zinc-500">Auditor: {activeSession.auditor.full_name} • Started: {getEventDate(activeSession.created_at)}</p>
            </div>
            
            {/* Session Progress details */}
            <div className="w-full md:w-80 flex items-center gap-4">
              <div className="flex-grow">
                <div className="flex justify-between text-[11px] font-bold mb-1">
                  <span className="text-zinc-800">Session Progress</span>
                  <span className="text-zinc-900 dark:text-zinc-100">{activeSession.progress}%</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-zinc-900 dark:bg-zinc-100 h-full rounded-full transition-all duration-305" style={{ width: `${activeSession.progress}%` }} />
                </div>
              </div>
              
              {isAuditor && (
                <button
                  onClick={handleCompleteSession}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex-shrink-0"
                >
                  Finalize Audit
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Box: Pending assets */}
            <div className="premium-card p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-1.5">
                <ClipboardCheck className="h-4.5 w-4.5 text-zinc-400" />
                Pending Verification ({activeSession.pending_assets.length})
              </h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-0.5">
                {activeSession.pending_assets.map(asset => (
                  <div
                    key={asset.id}
                    className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg flex justify-between items-center bg-zinc-50/20 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{asset.name}</h4>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">SN: {asset.serial_number}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">Location: {asset.location} • Condition: {asset.condition}</p>
                    </div>
                    {isAuditor && (
                      <button
                        onClick={() => {
                          setSelectedAsset(asset);
                          setShowVerifyModal(true);
                        }}
                        className="px-2.5 py-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-md text-[11px] font-semibold flex items-center gap-1"
                      >
                        Verify
                      </button>
                    )}
                  </div>
                ))}
                {activeSession.pending_assets.length === 0 && (
                  <div className="text-center py-10 text-zinc-400 text-xs flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    <p>All catalog items verified in this session!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Box: Completed Audits */}
            <div className="premium-card p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-1.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-zinc-400" />
                Completed Verifications ({activeSession.completed_audits.length})
              </h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-0.5">
                {activeSession.completed_audits.map(audit => (
                  <div
                    key={audit.id}
                    className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50/20"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{audit.asset_name}</h4>
                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5">SN: {audit.serial_number}</p>
                        {audit.notes && (
                          <p className="text-[10px] text-zinc-500 mt-1.5 italic bg-zinc-50 dark:bg-zinc-900 p-1.5 rounded border border-zinc-100 dark:border-zinc-900">
                            Notes: {audit.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                        <span className={`inline-flex px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${
                          audit.verified
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/20 dark:text-rose-400'
                        }`}>
                          {audit.verified ? 'Verified Present' : 'Discrepancy / Absent'}
                        </span>
                        <span className={`inline-flex px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${
                          audit.condition_match === 'Match'
                            ? 'bg-zinc-50 text-zinc-700 border-zinc-200'
                            : 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-400'
                        }`}>
                          {audit.condition_match}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {activeSession.completed_audits.length === 0 && (
                  <p className="text-center py-10 text-zinc-400 text-xs">No verifications signed off in this session yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* AUDIT HISTORICAL SESSION LOGS */
        <div className="space-y-6">
          <div className="premium-card p-5 bg-zinc-50/50 dark:bg-zinc-900/10">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-zinc-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">Reconciliation Sessions info</h3>
                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                  Start an inventory audit session to freeze catalog reconciliation and verify assets one-by-one. 
                  Audit progress measures total catalog verifications completed.
                </p>
              </div>
            </div>
          </div>

          <div className="premium-card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 text-[10px] font-bold uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-3 font-semibold">Audit Session Title</th>
                  <th className="px-6 py-3 font-semibold">Date Completed</th>
                  <th className="px-6 py-3 font-semibold">Assigned Auditor</th>
                  <th className="px-6 py-3 font-semibold">Session Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
                {sessions.map(s => (
                  <tr key={s.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-3 font-bold text-zinc-900 dark:text-zinc-100">{s.title}</td>
                    <td className="px-6 py-3 text-zinc-500">{getEventDate(s.created_at)}</td>
                    <td className="px-6 py-3 font-semibold text-zinc-500">{s.auditor?.full_name || 'System'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        s.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-250 dark:bg-indigo-950/20 dark:text-indigo-400'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-zinc-400">
                      No historical audit logs recorded in system database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* START AUDIT SESSION MODAL */}
      <AnimatePresence>
        {showStartModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStartModal(false)}
              className="fixed inset-0 bg-slate-950/20 dark:bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md h-full shadow-xl relative z-50 flex flex-col justify-between p-6 border-l border-zinc-200 dark:border-zinc-800 rounded-l-2xl"
            >
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Sparkles className="h-4.5 w-4.5 text-zinc-400" />
                    Initialize Inventory Audit
                  </h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Begin visual serial validation and condition audits across all assets.
                  </p>
                </div>

                <form id="start-audit-form" onSubmit={handleStartSession} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                      Audit Title / Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Q3 2026 Fleet Hardware Audit"
                      value={sessionTitle}
                      onChange={(e) => setSessionTitle(e.target.value)}
                      className="w-full premium-input"
                      required
                    />
                  </div>
                </form>
              </div>

              <div className="flex gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="flex-grow premium-button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="start-audit-form"
                  disabled={submitLoading}
                  className="flex-grow premium-button-primary"
                >
                  {submitLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Start Session'
                  )}
                </button>
              </div>
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
              className="fixed inset-0 bg-slate-950/20 dark:bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md h-full shadow-xl relative z-50 flex flex-col justify-between p-6 border-l border-zinc-200 dark:border-zinc-800 rounded-l-2xl overflow-y-auto"
            >
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <ClipboardCheck className="h-5 w-5 text-zinc-400" />
                    Verify: {selectedAsset.name}
                  </h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Perform visual serial validation and condition checks.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 text-[11px] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-medium">Serial Number:</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200 font-bold">{selectedAsset.serial_number}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-medium">Logged Location:</span>
                    <span className="text-zinc-800 dark:text-zinc-205 font-medium">{selectedAsset.location}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-medium">Recorded Condition:</span>
                    <span className="font-bold text-zinc-950 dark:text-zinc-50">{selectedAsset.condition}</span>
                  </div>
                </div>

                <form id="verify-form" onSubmit={handleVerifyAsset} className="space-y-4">
                  {/* Verified Checkbox */}
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="verified"
                      checked={verifyForm.verified}
                      onChange={(e) => setVerifyForm({ ...verifyForm, verified: e.target.checked })}
                      className="mt-0.5 h-4 w-4 text-zinc-905 border-zinc-300 dark:border-zinc-700 rounded focus:ring-zinc-900/10"
                    />
                    <div>
                      <label htmlFor="verified" className="block text-xs font-bold text-zinc-900 dark:text-zinc-200">
                        Asset Present / Verified
                      </label>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Check if item is physically accounted for in location.</p>
                    </div>
                  </div>

                  {/* Condition Match */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                      Condition Reconciled
                    </label>
                    <select
                      value={verifyForm.condition_match}
                      onChange={(e) => setVerifyForm({ ...verifyForm, condition_match: e.target.value })}
                      className="w-full premium-input"
                    >
                      <option value="Match">Condition Matches Record</option>
                      <option value="Mismatch">Condition Mismatch (Damaged/Degraded)</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                      Auditor Discrepancy Notes
                    </label>
                    <textarea
                      placeholder="e.g. verified screen scratch, missing charging adapter..."
                      value={verifyForm.notes}
                      onChange={(e) => setVerifyForm({ ...verifyForm, notes: e.target.value })}
                      className="w-full premium-input h-24 resize-none"
                    />
                  </div>
                </form>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAsset(null);
                    setShowVerifyModal(false);
                  }}
                  className="flex-1 premium-button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="verify-form"
                  disabled={submitLoading}
                  className="flex-1 premium-button-primary"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
