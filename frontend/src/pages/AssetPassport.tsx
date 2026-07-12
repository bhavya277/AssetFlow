import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import { QRVisualizer } from './AssetDirectory';
import {
  ChevronLeft,
  Calendar,
  User,
  Wrench,
  ShieldCheck,
  FileText,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
  Heart,
  FileBadge,
  FileDown,
  Loader2,
} from 'lucide-react';
import axios from 'axios';
import { generateAssetPassportPdf } from '../utils/pdf';

interface AssetCategory {
  id: number;
  name: string;
}

interface UserProfile {
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
  category?: AssetCategory;
  current_holder?: UserProfile;
}

interface TimelineEvent {
  type: string;
  date: string;
  title: string;
  description: string;
  status: string;
}

export const AssetPassport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    const fetchAssetData = async () => {
      setLoading(true);
      try {
        const [assetRes, timelineRes] = await Promise.all([
          axios.get<Asset>(`/assets/${id}`),
          axios.get<TimelineEvent[]>(`/assets/${id}/timeline`),
        ]);
        setAsset(assetRes.data);
        setTimeline(timelineRes.data);
      } catch (error) {
        console.error('Error fetching passport details:', error);
        showToast('Asset not found or failed to load data', 'error');
        navigate('/assets');
      } finally {
        setLoading(false);
      }
    };
    fetchAssetData();
  }, [id, navigate, showToast]);

  const handleDownloadPdf = () => {
    if (!asset) return;
    setPdfLoading(true);
    try {
      generateAssetPassportPdf(asset, timeline);
      showToast('Asset passport PDF downloaded', 'success');
    } catch (error) {
      console.error('PDF generation failed:', error);
      showToast('Failed to generate PDF', 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-500';
      case 'Allocated':
        return 'bg-indigo-500';
      case 'Under Maintenance':
        return 'bg-amber-500';
      default:
        return 'bg-rose-500';
    }
  };

  const getHealthDescription = (score: number) => {
    if (score >= 90) return 'Excellent condition. Low wear, fully operational, no repairs in the past 6 months.';
    if (score >= 75) return 'Good condition. Minor cosmetic wear, routine maintenance verified.';
    if (score >= 50) return 'Warning condition. Frequent repair logs, preventative maintenance recommended.';
    return 'Critical health state. Immediate hardware audit and engineer servicing required.';
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'Allocation':
        return <User className="h-4 w-4" />;
      case 'Return':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'Maintenance':
        return <Wrench className="h-4 w-4" />;
      case 'Audit':
        return <ShieldCheck className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-6 w-24 bg-slate-100 rounded-xl" />
        <div className="h-16 w-1/3 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-1 h-96 bg-slate-100 rounded-3xl" />
          <div className="lg:col-span-2 h-96 bg-slate-55 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!asset) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Back to Directory Link */}
      <Link
        to="/assets"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Asset Directory
      </Link>

      {/* Asset Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-zinc-150">
              {asset.name}
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-350">
              <span className={`h-2 w-2 rounded-full ${getStatusColor(asset.status)}`} />
              {asset.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
            Category: {asset.category?.name || 'Unassigned'} • Location: {asset.location}
          </p>
        </div>
        <button
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition-all active:scale-95 disabled:opacity-50"
        >
          {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Download PDF
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Passport Details */}
        <div className="space-y-6">
          {/* QR Code and Identity Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:scale-120 transition-transform" />
            <div className="p-3 border border-zinc-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 rounded-2xl mb-4">
              <QRVisualizer value={asset.qr_code_key} className="h-28 w-28" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-sm">Asset Passport ID</h3>
            <p className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 mt-1 uppercase tracking-wider">{asset.qr_code_key}</p>
          </div>

          {/* Health Score */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500" />
                Asset Health Score
              </h3>
              <span className={`text-sm font-extrabold ${asset.health_score >= 80 ? 'text-emerald-500' : asset.health_score >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                {asset.health_score}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  asset.health_score >= 80 ? 'bg-emerald-500' : asset.health_score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${asset.health_score}%` }}
              />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400">
              {getHealthDescription(asset.health_score)}
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-slate-800 dark:text-zinc-150 text-sm">Identity & Warranty</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-450 dark:text-zinc-500 font-medium">Serial Number</span>
                <span className="font-mono text-slate-800 dark:text-zinc-200">{asset.serial_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 dark:text-zinc-500 font-medium">Location</span>
                <span className="text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                  {asset.location}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 dark:text-zinc-500 font-medium">Warranty Expiration</span>
                <span className="text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                  {asset.warranty_expiry || 'No warranty logged'}
                </span>
              </div>
              <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-850 pt-3">
                <span className="text-slate-450 dark:text-zinc-500 font-medium">Current Custodian</span>
                <span className="text-slate-800 dark:text-zinc-200 font-bold">
                  {asset.current_holder?.full_name || 'In Central Storage'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Lifecycle Timeline & Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lifecycle Timeline */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
              Asset Lifecycle Timeline
            </h3>

            {timeline.length > 0 ? (
              <div className="relative border-l border-zinc-200 dark:border-zinc-800 ml-4 space-y-6 pb-2">
                {timeline.map((event, idx) => (
                  <div key={idx} className="relative pl-8">
                    {/* Event node dot */}
                    <div className="absolute -left-[14px] top-1.5 bg-white dark:bg-zinc-900 border-2 border-indigo-500 dark:border-indigo-400 p-1 rounded-full text-indigo-600 dark:text-indigo-400">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="bg-slate-50/50 dark:bg-zinc-950/20 border border-zinc-200/30 dark:border-zinc-800/30 p-4 rounded-2xl">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-sm">{event.title}</h4>
                        <span className="text-[10px] text-slate-450 dark:text-zinc-500 font-medium">
                          {new Date(event.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 text-sm">
                No events recorded for this asset yet.
              </div>
            )}
          </div>

          {/* Associated Documents */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-zinc-150 text-sm mb-4">Verification Documents</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/50">
                <FileBadge className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Device Warranty Certificate</h4>
                  <p className="text-[10px] text-slate-450 mt-0.5">PDF Document • 1.4 MB</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/50">
                <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">System Technical Manual</h4>
                  <p className="text-[10px] text-slate-450 mt-0.5">PDF Document • 4.8 MB</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
