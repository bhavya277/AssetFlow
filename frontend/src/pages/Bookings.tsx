import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Plus, Search, Loader2, XCircle, CalendarRange, Clock, Check, X } from 'lucide-react';
import axios from 'axios';

interface Asset {
  id: number;
  name: string;
  serial_number: string;
  status: string;
  category?: { name: string };
}

interface User {
  id: number;
  full_name: string;
  email: string;
}

interface Booking {
  id: number;
  asset_id: number;
  booked_by_id: number;
  start_time: string;
  end_time: string;
  purpose: string;
  status: string;
  asset?: Asset;
  booked_by?: User;
}

export const Bookings: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [form, setForm] = useState({
    asset_id: '',
    start_time: '',
    end_time: '',
    purpose: '',
  });

  const isApprover = user?.role === 'Admin' || user?.role === 'Asset Manager';

  const loadData = async () => {
    setLoading(true);
    try {
      const [bookingsRes, assetsRes] = await Promise.all([
        axios.get<Booking[]>('/bookings/'),
        axios.get<Asset[]>('/assets/'),
      ]);
      setBookings(bookingsRes.data);
      setAssets(assetsRes.data);
    } catch (error) {
      console.error('Error loading bookings:', error);
      showToast('Failed to load bookings schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.asset_id || !form.start_time || !form.end_time || !form.purpose) {
      showToast('Please fill out all reservation fields', 'warning');
      return;
    }

    const start = new Date(form.start_time);
    const end = new Date(form.end_time);
    if (start >= end) {
      showToast('End time must be strictly after start time', 'warning');
      return;
    }

    setSubmitLoading(true);
    try {
      // API call to POST /bookings/
      await axios.post('/bookings/', {
        asset_id: parseInt(form.asset_id, 10),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        purpose: form.purpose,
      });

      showToast(
        isApprover ? 'Resource reserved successfully' : 'Booking request submitted for approval',
        'success'
      );
      setForm({ asset_id: '', start_time: '', end_time: '', purpose: '' });
      setShowModal(false);
      loadData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to reserve resource';
      showToast(msg, 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleProcessBooking = async (id: number, status: 'Confirmed' | 'Rejected') => {
    try {
      await axios.post(`/bookings/${id}/process`, { status });
      showToast(`Booking ${status === 'Confirmed' ? 'approved' : 'rejected'}`, 'success');
      loadData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to process booking';
      showToast(msg, 'error');
    }
  };

  const handleCancelBooking = async (id: number) => {
    try {
      await axios.post(`/bookings/${id}/cancel`);
      showToast('Reservation cancelled successfully', 'success');
      loadData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to cancel reservation';
      showToast(msg, 'error');
    }
  };

  // Filter Bookings (active first, matching query)
  const sortedBookings = [...bookings].sort((a, b) => {
    const statusOrder: Record<string, number> = { Pending: 0, Confirmed: 1, Rejected: 2, Cancelled: 3 };
    const orderDiff = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
    if (orderDiff !== 0) return orderDiff;
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  const filteredBookings = sortedBookings.filter(b =>
    b.asset?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.booked_by?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.purpose.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100/30';
      case 'Pending':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100/30';
      case 'Rejected':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100/30';
      default:
        return 'bg-slate-100 dark:bg-zinc-800 text-slate-550';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-zinc-100">
            Resource Booking
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            Reserve shared organizational resources (fleet cars, devices, projector bays) and track reservation schedules.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Book Resource
        </button>
      </div>

      {/* Search Filter */}
      <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search by asset, user, purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Grid of Reservation cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-44 bg-slate-100 dark:bg-zinc-900 rounded-3xl animate-pulse" />
          <div className="h-44 bg-slate-50 dark:bg-zinc-900 rounded-3xl animate-pulse" />
          <div className="h-44 bg-slate-100 dark:bg-zinc-900 rounded-3xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBookings.map(b => (
            <motion.div
              key={b.id}
              className={`bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-48 relative overflow-hidden group ${
                b.status === 'Cancelled' || b.status === 'Rejected' ? 'opacity-65' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusStyles(b.status)}`}>
                    {b.status}
                  </span>
                  <h3 className="font-bold text-slate-800 dark:text-zinc-150 text-sm line-clamp-1">{b.asset?.name || 'Unknown Resource'}</h3>
                  <p className="text-[10px] text-slate-400">Purpose: {b.purpose}</p>
                  {b.booked_by && (
                    <p className="text-[10px] text-slate-400">Requested by: {b.booked_by.full_name}</p>
                  )}
                </div>
                <CalendarDays className="h-6 w-6 text-slate-350 dark:text-zinc-700" />
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-850 pt-3 mt-3 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400">
                    <Clock className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{formatDateTime(b.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400">
                    <CalendarRange className="h-3.5 w-3.5 text-indigo-500" />
                    <span>To {formatDateTime(b.end_time)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {b.status === 'Pending' && isApprover && (
                    <>
                      <button
                        onClick={() => handleProcessBooking(b.id, 'Confirmed')}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors"
                        title="Approve Booking"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleProcessBooking(b.id, 'Rejected')}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 border border-rose-200 dark:border-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg transition-colors"
                        title="Reject Booking"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  {(b.status === 'Confirmed' || b.status === 'Pending') &&
                    (b.booked_by_id === user?.id || isApprover) && (
                    <button
                      onClick={() => handleCancelBooking(b.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg border border-transparent hover:border-rose-100 transition-colors"
                      title="Cancel Reservation"
                    >
                      <XCircle className="h-4.5 w-4.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {filteredBookings.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400">
              No resource reservations scheduled yet.
            </div>
          )}
        </div>
      )}

      {/* CREATE BOOKING MODAL */}
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
                <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100">Reserve Shared Resource</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Schedule time slots for shared conference devices, servers, or vehicles.
                </p>

                <form id="booking-form" onSubmit={handleSubmit} className="mt-8 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Choose Resource (Asset)
                    </label>
                    <select
                      value={form.asset_id}
                      onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                      required
                    >
                      <option value="" disabled>Select Resource</option>
                      {assets.map(a => (
                        <option key={a.id} value={a.id}>{a.name} (SN: {a.serial_number})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Reservation Start Date/Time
                    </label>
                    <input
                      type="datetime-local"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-500 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Reservation End Date/Time
                    </label>
                    <input
                      type="datetime-local"
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-505 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                      Purpose / Reservation Notes
                    </label>
                    <textarea
                      placeholder="e.g. Client presentation in conference bay B..."
                      value={form.purpose}
                      onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100 h-24 resize-none"
                      required
                    />
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
                  form="booking-form"
                  disabled={submitLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Reserving...
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
