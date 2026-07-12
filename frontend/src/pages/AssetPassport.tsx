import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

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
  Repeat,
} from 'lucide-react';
import axios from 'axios';
import { generateAssetPassportPdf, generateWarrantyPdf, generateManualPdf } from '../utils/pdf';

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
        return 'bg-zinc-800 dark:bg-zinc-200';
      case 'Under Maintenance':
        return 'bg-amber-500';
      default:
        return 'bg-rose-500';
    }
  };

  const getHealthDescription = (score: number) => {
    if (score >= 90) return 'Excellent condition. Low wear, fully operational, no repairs required.';
    if (score >= 75) return 'Good condition. Minor cosmetic wear, routine maintenance verified.';
    if (score >= 50) return 'Warning condition. Frequent repair logs, preventative maintenance recommended.';
    return 'Critical health state. Immediate hardware audit and servicing required.';
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'Allocation':
        return <User className="h-3.5 w-3.5" />;
      case 'Return':
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'Maintenance':
        return <Wrench className="h-3.5 w-3.5" />;
      case 'Audit':
        return <ShieldCheck className="h-3.5 w-3.5" />;
      case 'Transfer':
        return <Repeat className="h-3.5 w-3.5" />;
      default:
        return <Clock className="h-3.5 w-3.5" />;
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-5 w-24 bg-zinc-100 dark:bg-zinc-900 rounded-lg" />
        <div className="h-10 w-1/3 bg-zinc-100 dark:bg-zinc-900 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 h-80 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
          <div className="lg:col-span-2 h-80 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!asset) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-5">
      {/* Back to Directory Link */}
      <div>
        <Link
          to="/assets"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Asset Directory
        </Link>
      </div>

      {/* Asset Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {asset.name}
            </h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300">
              <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor(asset.status)}`} />
              {asset.status}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Category: {asset.category?.name || 'Unassigned'} • Location: {asset.location}
          </p>
        </div>
        <button
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
          className="premium-button-secondary flex items-center gap-1.5 text-xs font-semibold"
        >
          {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Download PDF Passport
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Passport Details */}
        <div className="space-y-6">
          {/* QR Code and Identity Card */}
          <div className="premium-card p-5 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="p-2 border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg mb-3">
              <QRVisualizer value={`Asset: ${asset.name}\nSN: ${asset.serial_number}\nID: ${asset.qr_code_key}\nCategory: ${asset.category?.name || 'Uncategorized'}\nLocation: ${asset.location}\nCondition: ${asset.condition}\nHealth: ${asset.health_score}%`} className="h-24 w-24" />
            </div>
            <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">Asset Passport ID</h3>
            <p className="text-[9px] font-mono text-zinc-400 mt-0.5 uppercase tracking-wider">{asset.qr_code_key}</p>
          </div>

          {/* Health Score */}
          <div className="premium-card p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                <Heart className="h-4 w-4 text-rose-500" />
                Asset Health Score
              </h3>
              <span className={`text-xs font-bold ${asset.health_score >= 80 ? 'text-emerald-500' : asset.health_score >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                {asset.health_score}%
              </span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  asset.health_score >= 80 ? 'bg-emerald-500' : asset.health_score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${asset.health_score}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-500">
              {getHealthDescription(asset.health_score)}
            </p>
          </div>

          {/* Details Card */}
          <div className="premium-card p-5 space-y-3.5 text-xs">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">Identity & Warranty</h3>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Serial Number</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200 font-medium">{asset.serial_number}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Location</span>
                <span className="text-zinc-800 dark:text-zinc-200 flex items-center gap-1 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                  {asset.location}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Warranty Expiration</span>
                <span className="text-zinc-800 dark:text-zinc-200 flex items-center gap-1 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  {asset.warranty_expiry || 'No warranty logged'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5">
                <span className="text-zinc-500">Current Custodian</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                  {asset.current_holder?.full_name || 'In Central Storage'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Lifecycle Timeline & Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lifecycle Timeline */}
          <div className="premium-card p-5">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-zinc-400" />
              Asset Lifecycle Timeline
            </h3>

            {timeline.length > 0 ? (
              <div className="relative border-l border-zinc-200 dark:border-zinc-800 ml-4 space-y-5 pb-1">
                {timeline.map((event, idx) => (
                  <div key={idx} className="relative pl-7">
                    {/* Event node dot */}
                    <div className="absolute -left-[12px] top-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 p-1 rounded-full text-zinc-600 dark:text-zinc-400 shadow-2xs">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/50 dark:border-zinc-800/40 p-4 rounded-xl">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-200 text-xs">{event.title}</h4>
                        <span className="text-[9px] text-zinc-400 font-bold">
                          {new Date(event.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-400 text-xs">
                No events recorded for this asset yet.
              </div>
            )}
          </div>

          {/* Associated Documents */}
          <div className="premium-card p-5">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs mb-4">Verification Documents</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  generateWarrantyPdf(asset);
                  showToast('Downloading warranty certificate...', 'success');
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition-colors w-full cursor-pointer"
              >
                <FileBadge className="h-7 w-7 text-zinc-500 flex-shrink-0" />
                <div>
                  <h4 className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">Device Warranty Certificate</h4>
                  <p className="text-[9px] text-zinc-400 mt-0.5">PDF Document • 1.4 MB</p>
                </div>
              </button>
              <button
                onClick={() => {
                  generateManualPdf(asset);
                  showToast('Downloading system technical manual...', 'success');
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition-colors w-full cursor-pointer"
              >
                <FileText className="h-7 w-7 text-zinc-500 flex-shrink-0" />
                <div>
                  <h4 className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">System Technical Manual</h4>
                  <p className="text-[9px] text-zinc-400 mt-0.5">PDF Document • 4.8 MB</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
