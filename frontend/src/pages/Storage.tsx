import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  HardDrive,
  Upload,
  Sparkles,
  Database,
  FileText,
  FileSpreadsheet,
  Code2,
  Image as ImageIcon,
  Archive,
  File as FileGeneric,
  Download,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  Brain,
  ShieldAlert,
  Clock,
  Lock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PlansModal } from '../components/PlansModal';
import { AiAnalysisModal, type StorageFile, type IAiAnalysis } from '../components/AiAnalysisModal';

interface StorageSummary {
  totalUsedMB: number;
  maxStorageMB: number;
  percentUsed: number;
  totalFiles: number;
  plan: string;
  isQuotaExceeded: boolean;
  categoryCounts: Record<string, { count: number; sizeMB: number }>;
  s3Info: {
    isActive: boolean;
    bucket: string;
    region: string;
    prefix: string;
  };
}

interface PendingSubscription {
  planName: string;
  category: string;
  billing: string;
  amountPaid: number;
  transactionId: string;
  orderId?: string;
  status: string;
  activatedAt?: string;
  createdAt?: string;
}

export const Storage: React.FC = () => {
  const { token, user, tenant } = useAuth();

  // State
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Subscription / Plan Gating State
  const [isPlanActive, setIsPlanActive] = useState<boolean>(false);
  const [isPlanPending, setIsPlanPending] = useState<boolean>(false);
  const [pendingSubDetails, setPendingSubDetails] = useState<PendingSubscription | null>(null);
  const [activePlanName, setActivePlanName] = useState<string>('');
  const [isCheckingPlan, setIsCheckingPlan] = useState<boolean>(true);

  // Upload State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [isPlansModalOpen, setIsPlansModalOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [selectedFileForAi, setSelectedFileForAi] = useState<StorageFile | null>(null);

  // Check Subscription Status & Plan Access
  const checkSubscriptionStatus = useCallback(async (): Promise<{ active: boolean; pending: boolean; plan: string }> => {
    if (!token) return { active: false, pending: false, plan: '' };

    try {
      const res = await fetch('http://localhost:5000/api/v1/payments/my-subscriptions', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const storageActive = data.subscriptions?.storage;
        const storagePending = data.pending?.storage;
        const tenantPlan = data.tenantStoragePlan || (
          ['Starter Dev', 'Solo Dev', 'Pro Dev'].includes(tenant?.storagePlan || '') ? tenant?.storagePlan : null
        );

        if (storageActive || tenantPlan) {
          const plan = storageActive?.planName || tenantPlan || 'Starter Dev';
          setIsPlanActive(true);
          setIsPlanPending(false);
          setActivePlanName(plan);
          return { active: true, pending: false, plan };
        } else if (storagePending) {
          setIsPlanActive(false);
          setIsPlanPending(true);
          setPendingSubDetails(storagePending);
          return { active: false, pending: true, plan: storagePending.planName || '' };
        }
      }
    } catch (err) {
      console.error('Error verifying storage subscriptions:', err);
    }

    // Fallback: check if tenant has an approved storage plan
    const approvedTenantPlan = tenant?.storagePlan || tenant?.allocatedResources?.storagePlan;
    if (approvedTenantPlan && ['Starter Dev', 'Solo Dev', 'Pro Dev'].includes(approvedTenantPlan)) {
      setIsPlanActive(true);
      setIsPlanPending(false);
      setActivePlanName(approvedTenantPlan);
      return { active: true, pending: false, plan: approvedTenantPlan };
    }

    // Super Admin override if platform admin
    if (user?.role === 'Admin' || user?.email === 'admin@gmail.com') {
      setIsPlanActive(true);
      setIsPlanPending(false);
      setActivePlanName('Platform Admin Storage');
      return { active: true, pending: false, plan: 'Platform Admin' };
    }

    setIsPlanActive(false);
    setIsPlanPending(false);
    return { active: false, pending: false, plan: '' };
  }, [token, tenant, user]);

  // Fetch Storage Data
  const fetchStorageData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);

    try {
      const categoryParam = selectedCategory !== 'ALL' ? `&category=${selectedCategory}` : '';
      const searchParam = searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : '';

      const res = await fetch(`http://localhost:5000/api/v1/storage?limit=100${categoryParam}${searchParam}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching storage objects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedCategory, searchQuery]);

  // Initial Load
  const loadPageData = useCallback(async () => {
    setIsCheckingPlan(true);
    const subStatus = await checkSubscriptionStatus();
    if (subStatus.active) {
      await fetchStorageData();
    }
    setIsCheckingPlan(false);
  }, [checkSubscriptionStatus, fetchStorageData]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(Array.from(e.dataTransfer.files));
    }
  };

  // Upload handler with client-side quota validation
  const handleFilesUpload = async (uploadFiles: File[]) => {
    if (!token || uploadFiles.length === 0) return;
    setUploadFeedback(null);

    const totalIncomingBytes = uploadFiles.reduce((acc, f) => acc + f.size, 0);
    const totalIncomingMB = totalIncomingBytes / (1024 * 1024);

    if (summary) {
      const remainingMB = Math.max(0, summary.maxStorageMB - summary.totalUsedMB);
      if (totalIncomingMB > remainingMB) {
        setUploadFeedback({
          type: 'error',
          message: `Storage quota exceeded! Incoming files (${totalIncomingMB.toFixed(2)} MB) exceed remaining capacity (${remainingMB.toFixed(2)} MB). Please upgrade your plan.`,
        });
        return;
      }
    }

    setIsUploading(true);
    let successCount = 0;
    let errorMsg: string | null = null;

    try {
      for (const file of uploadFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('http://localhost:5000/api/v1/storage/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          if (res.status === 403 && data.upgradeRequired) {
            errorMsg = data.error || 'Your storage limit is exceeded. Please upgrade your plan.';
            break;
          }
          throw new Error(data.error || `Failed to upload "${file.name}"`);
        }
        successCount++;
      }

      if (errorMsg) {
        setUploadFeedback({ type: 'error', message: errorMsg });
      } else {
        setUploadFeedback({
          type: 'success',
          message: `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''} to S3 cloud storage.`,
        });
      }

      await fetchStorageData();
    } catch (err: any) {
      console.error('File upload error:', err);
      setUploadFeedback({
        type: 'error',
        message: err.message || 'An unexpected error occurred during file upload.',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Download file handler
  const handleDownload = async (file: StorageFile) => {
    if (!token) return;
    try {
      const downloadUrl = `http://localhost:5000/api/v1/storage/${file._id}/download`;
      const res = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Unable to download file. Please try again.');
    }
  };

  // Delete file handler
  const handleDelete = async (file: StorageFile) => {
    if (!token) return;
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete "${file.originalName}"?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`http://localhost:5000/api/v1/storage/${file._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to delete file');
      }

      setFiles((prev) => prev.filter((f) => f._id !== file._id));
      await fetchStorageData();
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(err.message || 'Failed to delete file.');
    }
  };

  // Trigger Gemini AI Modal
  const handleOpenAiAnalysis = (file: StorageFile) => {
    setSelectedFileForAi(file);
    setIsAiModalOpen(true);
  };

  // Callback when AI analysis finishes inside modal
  const handleAnalysisUpdated = (fileId: string, updatedAnalysis: IAiAnalysis) => {
    setFiles((prev) =>
      prev.map((f) => (f._id === fileId ? { ...f, aiAnalysis: updatedAnalysis } : f))
    );
    if (selectedFileForAi && selectedFileForAi._id === fileId) {
      setSelectedFileForAi((prev) => (prev ? { ...prev, aiAnalysis: updatedAnalysis } : null));
    }
  };

  // Helper: File Icon and Extension Badge
  const getFileBadge = (category: string, filename: string) => {
    const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
    switch (category) {
      case 'DATASET':
        return {
          icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" />,
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          ext: ext.slice(0, 4),
        };
      case 'DOCUMENT':
        return {
          icon: <FileText className="w-4 h-4 text-sky-600" />,
          bg: 'bg-sky-50 text-sky-700 border-sky-200/80',
          ext: ext.slice(0, 4),
        };
      case 'CODE':
        return {
          icon: <Code2 className="w-4 h-4 text-purple-600" />,
          bg: 'bg-purple-50 text-purple-700 border-purple-200/80',
          ext: ext.slice(0, 4),
        };
      case 'IMAGE':
        return {
          icon: <ImageIcon className="w-4 h-4 text-amber-600" />,
          bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
          ext: ext.slice(0, 4),
        };
      case 'ARCHIVE':
        return {
          icon: <Archive className="w-4 h-4 text-orange-600" />,
          bg: 'bg-orange-50 text-orange-700 border-orange-200/80',
          ext: ext.slice(0, 4),
        };
      default:
        return {
          icon: <FileGeneric className="w-4 h-4 text-slate-500" />,
          bg: 'bg-slate-100 text-slate-700 border-slate-200/80',
          ext: ext.slice(0, 4),
        };
    }
  };

  // Format bytes
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const isNearLimit = summary && summary.percentUsed >= 85;
  const isExceeded = summary && (summary.isQuotaExceeded || summary.percentUsed >= 100);

  // Segment widths for storage stacked progress bar
  const totalMaxMB = summary ? summary.maxStorageMB : 5120;
  const datasetMB = summary?.categoryCounts?.DATASET?.sizeMB || 0;
  const docMB = summary?.categoryCounts?.DOCUMENT?.sizeMB || 0;
  const codeMB = summary?.categoryCounts?.CODE?.sizeMB || 0;
  const imageMB = summary?.categoryCounts?.IMAGE?.sizeMB || 0;

  const datasetPct = Math.min(100, (datasetMB / totalMaxMB) * 100);
  const docPct = Math.min(100, (docMB / totalMaxMB) * 100);
  const codePct = Math.min(100, (codeMB / totalMaxMB) * 100);
  const imagePct = Math.min(100, (imageMB / totalMaxMB) * 100);

  // ─────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────
  if (isCheckingPlan) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl border-2 border-slate-200 border-t-slate-900 animate-spin" />
          <HardDrive className="w-5 h-5 text-slate-900 absolute inset-0 m-auto" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-4">Connecting to Storage Engine</p>
        <p className="text-sm text-slate-600 mt-1">Verifying subscription tier & quota allocations...</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // STATE 1: PAYMENT MADE, PENDING ADMIN APPROVAL
  // ─────────────────────────────────────────────────────────────
  if (isPlanPending && pendingSubDetails) {
    return (
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Storage</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-semibold">Provisioning Queue</span>
          </div>

          <button
            onClick={() => loadPageData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Check Status
          </button>
        </div>

        {/* Enterprise Pending Approval Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-xs relative overflow-hidden">
          <div className="flex flex-col items-center text-center max-w-xl mx-auto">
            {/* Animated Status Beacon */}
            <div className="relative mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shadow-xs">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 mb-3">
              Payment Verified • Awaiting Manual Admin Approval
            </div>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Storage Plan Activation in Progress
            </h2>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              We received your payment for the <span className="font-semibold text-slate-800">{pendingSubDetails.planName}</span> storage block ({pendingSubDetails.billing}).
              Platform administrators review and provision S3 quotas manually to ensure dedicated multi-tenant isolation.
            </p>

            {/* Stepper Timeline */}
            <div className="w-full mt-8 p-4 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-2 text-emerald-700">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-[10px]">✓</div>
                <span>Payment Done</span>
              </div>
              <div className="h-[1px] flex-1 bg-slate-200 mx-3" />
              <div className="flex items-center gap-2 text-amber-700 font-semibold">
                <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center font-bold text-[10px]">2</div>
                <span>Admin Review</span>
              </div>
              <div className="h-[1px] flex-1 bg-slate-200 mx-3" />
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px]">3</div>
                <span>S3 Bucket Active</span>
              </div>
            </div>

            {/* Order Summary Metadata */}
            <div className="w-full mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-100">
                <p className="text-[10px] font-medium text-slate-400 uppercase">Selected Plan</p>
                <p className="font-semibold text-slate-900 mt-0.5">{pendingSubDetails.planName}</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-100">
                <p className="text-[10px] font-medium text-slate-400 uppercase">Amount Paid</p>
                <p className="font-semibold text-emerald-600 mt-0.5">₹{pendingSubDetails.amountPaid}</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-100">
                <p className="text-[10px] font-medium text-slate-400 uppercase">Order ID</p>
                <p className="font-mono text-slate-700 mt-0.5 truncate">{pendingSubDetails.orderId || 'Direct'}</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-100">
                <p className="text-[10px] font-medium text-slate-400 uppercase">Status</p>
                <p className="font-semibold text-amber-600 mt-0.5">In Review</p>
              </div>
            </div>

            {/* Reassurance & Actions */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              <button
                onClick={() => loadPageData()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-[#c8f542] hover:bg-slate-800 text-xs font-semibold transition active:scale-95 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Check Approval Status
              </button>
              <button
                onClick={() => setIsPlansModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition"
              >
                View Storage Plans
              </button>
            </div>
          </div>
        </div>

        {/* Plans Modal */}
        <PlansModal
          isOpen={isPlansModalOpen}
          onClose={() => {
            setIsPlansModalOpen(false);
            loadPageData();
          }}
          initialCategory="storage"
          onSelectPlan={async () => {
            setIsPlansModalOpen(false);
            await loadPageData();
          }}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // STATE 2: NO STORAGE PLAN PURCHASED
  // ─────────────────────────────────────────────────────────────
  if (!isPlanActive) {
    return (
      <div className="max-w-4xl mx-auto py-6 space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cloud Storage Engine</h1>
            <p className="text-xs text-slate-500 mt-0.5">Dedicated AWS S3 bucket architecture & Gemini 2.5 Flash analysis</p>
          </div>

          <button
            onClick={() => setIsPlansModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-[#c8f542] hover:bg-slate-800 text-xs font-semibold transition shadow-sm active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#c8f542]" />
            Purchase Storage Plan
          </button>
        </div>

        {/* Enterprise Subscription Paywall Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-12 shadow-xs text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-[#c8f542] flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-6 h-6" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 mt-6">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
            Plan Subscription Required
          </div>

          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-3">
            Unlock AWS S3 Storage & Gemini AI Data Engine
          </h2>

          <p className="text-xs text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
            You do not currently have an active Storage subscription. Purchase any storage tier to provision an
            isolated AWS S3 bucket, upload tabular datasets & documents, and unlock Google Gemini 2.5 Flash neural data
            analysis.
          </p>

          {/* 3 Tier Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8 max-w-2xl mx-auto text-left">
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
                <HardDrive className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Tenant-Isolated S3</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                Dedicated prefix partitioning, high-speed streaming downloads, and presigned links.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-[#c8f542]/20 text-slate-900 flex items-center justify-center mb-2.5">
                <Brain className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Gemini 2.5 Flash</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                Automated statistical summaries, pattern discovery, and natural language Q&A.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Configurable Quotas</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                Starter Dev (5 GB), Solo Dev (25 GB), or Pro Dev (100 GB) storage allocations.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-3">
            <button
              onClick={() => setIsPlansModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#c8f542] text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              Purchase Storage Plan
            </button>
          </div>
        </div>

        {/* Plans Modal */}
        <PlansModal
          isOpen={isPlansModalOpen}
          onClose={() => {
            setIsPlansModalOpen(false);
            loadPageData();
          }}
          initialCategory="storage"
          onSelectPlan={async () => {
            setIsPlansModalOpen(false);
            await loadPageData();
          }}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // STATE 3: ACTIVE APPROVED STORAGE DASHBOARD
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Refined Executive Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cloud Storage</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {activePlanName || summary?.plan || 'Active Storage'}
            </span>
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              {summary?.s3Info?.region || 'us-east-1'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-tenant AWS S3 architecture with automated Google Gemini 2.5 Flash neural analytics
          </p>
        </div>

        {/* Top Control Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchStorageData()}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-xs active:scale-95"
            title="Refresh Objects"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-900' : ''}`} />
          </button>

          <button
            onClick={() => setIsPlansModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition shadow-xs active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Storage Plans
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#c8f542] text-xs font-semibold transition shadow-sm active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Objects
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesUpload(Array.from(e.target.files));
          }
        }}
        multiple
        className="hidden"
      />

      {/* 2. Quota Warning Banner (if near or exceeded limit) */}
      {isNearLimit && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs ${
            isExceeded
              ? 'bg-rose-50/90 border-rose-200 text-rose-900'
              : 'bg-amber-50/90 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${isExceeded ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold">
                {isExceeded ? 'Storage Quota Limit Reached' : 'Storage Space Running Low'}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {isExceeded
                  ? 'Your tenant storage allocation is full. Uploads are locked until you upgrade.'
                  : `You have consumed ${summary?.percentUsed}% of your allocated cloud block.`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPlansModalOpen(true)}
            className={`font-semibold px-3 py-1.5 rounded-lg transition shrink-0 inline-flex items-center gap-1.5 ${
              isExceeded
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Upgrade Plan
          </button>
        </motion.div>
      )}

      {/* 3. Storage Quota & Capacity Widget (Modern Stacked Progress Bar & Telemetry Dock) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        {/* Top Metric Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              <span>Storage Quota Telemetry</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                {summary ? (summary.totalUsedMB / 1024).toFixed(2) : '0.00'}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                / {summary ? (summary.maxStorageMB / 1024).toFixed(0) : '5'} GB
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                {summary?.percentUsed || 0}% used
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-[11px] font-medium text-slate-400">Available Headroom</p>
            <p className="text-sm font-bold text-emerald-600">
              {summary ? ((summary.maxStorageMB - summary.totalUsedMB) / 1024).toFixed(2) : '5.00'} GB Free
            </p>
          </div>
        </div>

        {/* Stacked Multi-Category Progress Bar */}
        <div className="pt-5 space-y-2.5">
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
            {datasetPct > 0 && (
              <div
                style={{ width: `${datasetPct}%` }}
                className="h-full bg-emerald-500 transition-all duration-500"
                title={`Datasets: ${datasetMB} MB`}
              />
            )}
            {docPct > 0 && (
              <div
                style={{ width: `${docPct}%` }}
                className="h-full bg-sky-500 transition-all duration-500"
                title={`Documents: ${docMB} MB`}
              />
            )}
            {codePct > 0 && (
              <div
                style={{ width: `${codePct}%` }}
                className="h-full bg-purple-500 transition-all duration-500"
                title={`Source Code: ${codeMB} MB`}
              />
            )}
            {imagePct > 0 && (
              <div
                style={{ width: `${imagePct}%` }}
                className="h-full bg-amber-500 transition-all duration-500"
                title={`Images: ${imageMB} MB`}
              />
            )}
          </div>

          {/* Interactive Category Filter Pills (Clicking filters the table!) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <button
              onClick={() => setSelectedCategory('DATASET')}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                selectedCategory === 'DATASET'
                  ? 'bg-emerald-50/60 border-emerald-200 ring-1 ring-emerald-300'
                  : 'bg-slate-50/60 border-slate-150 hover:bg-slate-100/70 hover:border-slate-200'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <p className="text-[11px] font-semibold text-slate-500">Datasets</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {summary?.categoryCounts?.DATASET?.count || 0} files <span className="text-slate-400 font-normal">({summary?.categoryCounts?.DATASET?.sizeMB || 0} MB)</span>
                </p>
              </div>
            </button>

            <button
              onClick={() => setSelectedCategory('DOCUMENT')}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                selectedCategory === 'DOCUMENT'
                  ? 'bg-sky-50/60 border-sky-200 ring-1 ring-sky-300'
                  : 'bg-slate-50/60 border-slate-150 hover:bg-slate-100/70 hover:border-slate-200'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700 shrink-0 mt-0.5">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <p className="text-[11px] font-semibold text-slate-500">Documents</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {summary?.categoryCounts?.DOCUMENT?.count || 0} files <span className="text-slate-400 font-normal">({summary?.categoryCounts?.DOCUMENT?.sizeMB || 0} MB)</span>
                </p>
              </div>
            </button>

            <button
              onClick={() => setSelectedCategory('CODE')}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                selectedCategory === 'CODE'
                  ? 'bg-purple-50/60 border-purple-200 ring-1 ring-purple-300'
                  : 'bg-slate-50/60 border-slate-150 hover:bg-slate-100/70 hover:border-slate-200'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700 shrink-0 mt-0.5">
                <Code2 className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <p className="text-[11px] font-semibold text-slate-500">Source Code</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {summary?.categoryCounts?.CODE?.count || 0} files <span className="text-slate-400 font-normal">({summary?.categoryCounts?.CODE?.sizeMB || 0} MB)</span>
                </p>
              </div>
            </button>

            <button
              onClick={() => setSelectedCategory('IMAGE')}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                selectedCategory === 'IMAGE'
                  ? 'bg-amber-50/60 border-amber-200 ring-1 ring-amber-300'
                  : 'bg-slate-50/60 border-slate-150 hover:bg-slate-100/70 hover:border-slate-200'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                <ImageIcon className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <p className="text-[11px] font-semibold text-slate-500">Media & Assets</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {summary?.categoryCounts?.IMAGE?.count || 0} files <span className="text-slate-400 font-normal">({summary?.categoryCounts?.IMAGE?.sizeMB || 0} MB)</span>
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Streamlined Dropzone Dock */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer group ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/40 scale-[1.002]'
            : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#c8f542] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
              {isUploading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {isUploading ? 'Streaming files to S3 bucket...' : 'Drop files here or click to browse'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Direct AWS S3 multipart push. Supports CSV, TSV, JSON, Code, Docs up to 100MB per file.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 shrink-0">
            <span className="px-2 py-0.5 bg-slate-100 rounded-md">.CSV</span>
            <span className="px-2 py-0.5 bg-slate-100 rounded-md">.JSON</span>
            <span className="px-2 py-0.5 bg-slate-100 rounded-md">.PDF</span>
            <span className="px-2 py-0.5 bg-slate-100 rounded-md">.TS / .PY</span>
          </div>
        </div>

        {/* Upload Feedback Toast */}
        {uploadFeedback && (
          <div
            className={`mt-3.5 mx-auto max-w-lg p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 ${
              uploadFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {uploadFeedback.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
            )}
            <span>{uploadFeedback.message}</span>
          </div>
        )}
      </div>

      {/* 5. Production-Grade Stored Objects Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Filter & Search Control Dock */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Segmented Category Pill Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Files', count: summary?.totalFiles || files.length },
              { id: 'DATASET', label: 'Datasets', count: summary?.categoryCounts?.DATASET?.count || 0 },
              { id: 'DOCUMENT', label: 'Docs', count: summary?.categoryCounts?.DOCUMENT?.count || 0 },
              { id: 'CODE', label: 'Code', count: summary?.categoryCounts?.CODE?.count || 0 },
              { id: 'IMAGE', label: 'Images', count: summary?.categoryCounts?.IMAGE?.count || 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5 ${
                  selectedCategory === tab.id
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search file name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition w-full"
            />
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-900" />
              <p className="text-xs font-medium">Indexing objects...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="py-16 text-center space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-150">
                <Database className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-800">No storage objects found</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {searchQuery || selectedCategory !== 'ALL'
                  ? 'No items match your active search or category filter.'
                  : 'Drop your first file above to start analyzing with Google Gemini.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Object Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Gemini AI Status</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {files.map((file) => {
                  const isAnalyzed = Boolean(file.aiAnalysis?.summary);
                  const badgeInfo = getFileBadge(file.category, file.originalName);

                  return (
                    <tr
                      key={file._id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Name & Badge */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg border shrink-0 ${badgeInfo.bg}`}>
                            {badgeInfo.icon}
                          </div>
                          <div className="truncate max-w-sm">
                            <p className="font-semibold text-slate-900 truncate" title={file.originalName}>
                              {file.originalName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(file.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 text-slate-700">
                          {badgeInfo.ext}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {formatFileSize(file.fileSizeBytes)}
                      </td>

                      {/* AI Status */}
                      <td className="py-3 px-4">
                        {isAnalyzed ? (
                          <button
                            onClick={() => handleOpenAiAnalysis(file)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 transition"
                          >
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            Analyzed
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <Brain className="w-3 h-3" />
                            Ready for AI
                          </span>
                        )}
                      </td>

                      {/* Uploaded By */}
                      <td className="py-3 px-4 text-slate-500">
                        <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                          <span className="w-4 h-4 rounded-full bg-slate-100 text-[9px] font-bold text-slate-600 flex items-center justify-center shrink-0">
                            {(file.uploadedBy?.firstName?.[0] || 'U').toUpperCase()}
                          </span>
                          <span className="truncate">
                            {file.uploadedBy ? file.uploadedBy.firstName : 'User'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Analyze AI Button */}
                          <button
                            onClick={() => handleOpenAiAnalysis(file)}
                            className="bg-slate-900 hover:bg-slate-800 text-[#c8f542] text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition shadow-2xs flex items-center gap-1 active:scale-95"
                            title="Analyze document with Gemini AI"
                          >
                            <Sparkles className="w-3 h-3" />
                            {isAnalyzed ? 'View Insights' : 'Analyze AI'}
                          </button>

                          {/* Download Button */}
                          <button
                            onClick={() => handleDownload(file)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                            title="Download Object"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(file)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Object"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 6. Gemini AI Data Analysis & Q&A Modal */}
      <AiAnalysisModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        file={selectedFileForAi}
        onAnalysisUpdated={handleAnalysisUpdated}
      />

      {/* 7. Plans Modal for Storage Upgrades */}
      <PlansModal
        isOpen={isPlansModalOpen}
        onClose={() => {
          setIsPlansModalOpen(false);
          loadPageData();
        }}
        initialCategory="storage"
        onSelectPlan={async () => {
          setIsPlansModalOpen(false);
          await loadPageData();
        }}
      />
    </div>
  );
};

export default Storage;
