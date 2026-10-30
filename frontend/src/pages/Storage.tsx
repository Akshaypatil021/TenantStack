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
  ChevronRight,
  AlertTriangle,
  Terminal,
  ExternalLink,
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
    isHealthy?: boolean;
    isUnderMaintenance?: boolean;
    maintenanceMessage?: string | null;
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
  const [corruptedFileAlert, setCorruptedFileAlert] = useState<{
    fileId: string;
    fileName: string;
    sizeMB: number;
    message: string;
  } | null>(null);

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
  const fetchStorageData = useCallback(
    async (cat?: string, search?: string) => {
      if (!token) return;
      setIsLoading(true);

      try {
        const activeCat = cat !== undefined ? cat : selectedCategory;
        const activeSearch = search !== undefined ? search : searchQuery;

        const categoryParam = activeCat && activeCat !== 'ALL' ? `&category=${activeCat}` : '';
        const searchParam = activeSearch && activeSearch.trim() ? `&search=${encodeURIComponent(activeSearch.trim())}` : '';

        const res = await fetch(`http://localhost:5000/api/v1/storage?limit=100${categoryParam}${searchParam}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setFiles(data.files || []);
          if (data.summary) {
            setSummary(data.summary);
          }
        }
      } catch (err) {
        console.error('Error fetching storage objects:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [token, selectedCategory, searchQuery]
  );

  // Initial Load: Check Plan ONLY ONCE on mount
  const loadPageData = useCallback(async () => {
    setIsCheckingPlan(true);
    try {
      const subStatus = await checkSubscriptionStatus();
      if (subStatus.active) {
        await fetchStorageData('ALL', '');
      }
    } catch (err) {
      console.error('Error in initial load:', err);
    } finally {
      setIsCheckingPlan(false);
    }
  }, [checkSubscriptionStatus, token]); // Note: fetchStorageData is NOT in deps to avoid re-checking plan on filter/search

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Refetch files on category or search change WITHOUT triggering plan check or full page spinner
  const isInitialFilterMount = useRef(true);
  useEffect(() => {
    if (isInitialFilterMount.current) {
      isInitialFilterMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      fetchStorageData(selectedCategory, searchQuery);
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery, fetchStorageData]);

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory((prev) => (prev === cat ? 'ALL' : cat));
  };

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

    if (summary?.s3Info?.isUnderMaintenance) {
      setUploadFeedback({
        type: 'error',
        message: summary.s3Info.maintenanceMessage || 'AWS S3 Cloud Storage is currently under maintenance. File uploads are temporarily paused.',
      });
      return;
    }

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
          if (res.status === 503 || data.code === 'STORAGE_UNDER_MAINTENANCE') {
            errorMsg = data.error || '⚠️ AWS S3 Cloud Storage is currently under maintenance. Please try again after some time.';
            await fetchStorageData();
            break;
          }
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
        const errorData = await res.json().catch(() => null);
        if (res.status === 410 || errorData?.code === 'FILE_CORRUPTED') {
          setCorruptedFileAlert({
            fileId: file._id,
            fileName: file.originalName,
            sizeMB: file.fileSizeMB,
            message:
              errorData?.error ||
              `File Corrupted: The underlying storage block for "${file.originalName}" is missing or corrupted in cloud storage. This file occupies ${file.fileSizeMB} MB of your quota. Please delete this corrupted file to free up space.`,
          });
          return;
        }
        throw new Error(errorData?.error || 'Failed to download file');
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
    } catch (err: any) {
      console.error('Download error:', err);
      setUploadFeedback({
        type: 'error',
        message: err.message || 'Unable to download file. Please try again.',
      });
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

  // Open AI Workbench in New Browser Tab
  const handleOpenAiAnalysis = (file: StorageFile) => {
    window.open(`/storage/${file._id}/workbench`, '_blank');
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
          icon: <FileSpreadsheet className="w-4 h-4 text-emerald-500" />,
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          ext: ext.slice(0, 4),
        };
      case 'DOCUMENT':
        return {
          icon: <FileText className="w-4 h-4 text-sky-500" />,
          bg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
          ext: ext.slice(0, 4),
        };
      case 'CODE':
        return {
          icon: <Code2 className="w-4 h-4 text-purple-500" />,
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          ext: ext.slice(0, 4),
        };
      case 'IMAGE':
        return {
          icon: <ImageIcon className="w-4 h-4 text-amber-500" />,
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          ext: ext.slice(0, 4),
        };
      case 'ARCHIVE':
        return {
          icon: <Archive className="w-4 h-4 text-orange-500" />,
          bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
          ext: ext.slice(0, 4),
        };
      default:
        return {
          icon: <FileGeneric className="w-4 h-4 text-slate-400" />,
          bg: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
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
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-4">Connecting to Cloud Storage</p>
        <p className="text-sm text-slate-600 mt-1">Verifying S3 bucket & telemetry allocations...</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // STATE 1: PAYMENT MADE, PENDING ADMIN APPROVAL
  // ─────────────────────────────────────────────────────────────
  if (isPlanPending && pendingSubDetails) {
    return (
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-5">
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

        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-xs relative overflow-hidden">
          <div className="flex flex-col items-center text-center max-w-xl mx-auto">
            <div className="relative mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shadow-xs">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold mb-3">
              <span>Manual Review In Progress</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Storage Plan Activation Pending
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              We received your payment for the <strong className="text-slate-800 font-semibold">{pendingSubDetails.planName}</strong> plan. Our platform administrator is verifying your transaction details.
            </p>

            <div className="w-full mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-left font-mono text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Plan Tier:</span>
                <span className="font-bold text-slate-900">{pendingSubDetails.planName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Amount Paid:</span>
                <span className="font-bold text-slate-900">${pendingSubDetails.amountPaid} / {pendingSubDetails.billing}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Transaction Ref:</span>
                <span className="text-slate-500 truncate max-w-[200px]">{pendingSubDetails.transactionId}</span>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => loadPageData()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#c8f542] text-xs font-semibold shadow-xs transition active:scale-95 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Activation Status
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // STATE 2: NO ACTIVE STORAGE PLAN (PAYWALL)
  // ─────────────────────────────────────────────────────────────
  if (!isPlanActive) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-[#c8f542] text-xs font-semibold shadow-xs">
            <Lock className="w-3.5 h-3.5" />
            <span>Multi-Tenant S3 Storage Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Unlock High-Speed Cloud Storage
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Attach dedicated AWS S3 buckets to your workspace with automated neural document analysis powered by Google Gemini 2.5 Flash.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Starter Dev</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">$5/mo</span>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">5 GB</p>
                <p className="text-xs text-slate-400 mt-0.5">High-Speed NVMe Storage</p>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>1 Workspace Member</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Up to 3 Active Projects</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Gemini AI File Summarizer</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setIsPlansModalOpen(true)}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#c8f542] text-xs font-semibold transition active:scale-95"
            >
              Select Starter Dev
            </button>
          </div>

          <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#c8f542] text-slate-900 text-[10px] font-extrabold px-3 py-1 rounded-bl-xl tracking-wider uppercase">
              Popular
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Solo Dev</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-900 text-[#c8f542]">$15/mo</span>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">25 GB</p>
                <p className="text-xs text-slate-400 mt-0.5">High-Speed NVMe Storage</p>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Up to 5 Team Members</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Up to 15 Active Projects</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Priority S3 Multipart Push</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setIsPlansModalOpen(true)}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#c8f542] text-xs font-semibold transition active:scale-95 shadow-sm"
            >
              Select Solo Dev
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pro Dev</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">$35/mo</span>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">100 GB</p>
                <p className="text-xs text-slate-400 mt-0.5">Enterprise Cloud Volume</p>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Up to 15 Team Members</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Unlimited Active Projects</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Full Neural AI Q&A Suite</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setIsPlansModalOpen(true)}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#c8f542] text-xs font-semibold transition active:scale-95"
            >
              Select Pro Dev
            </button>
          </div>
        </div>

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
  // STATE 3: ACTIVE STORAGE DASHBOARD (REDESIGNED)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">
      {/* ─── 1. Header Bar: Sleek, Concise & Themed ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Cloud Storage Hub</span>
            </h1>

            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              {activePlanName || summary?.plan || 'Active Storage'}
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-1">
            Multi-tenant AWS S3 storage blocks with integrated Google Gemini 2.5 Flash neural analytics
          </p>
        </div>

        {/* Top Control Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchStorageData()}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-xs active:scale-95 cursor-pointer"
            title="Refresh Storage Objects"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-900' : ''}`} />
          </button>

          <button
            onClick={() => setIsPlansModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold transition shadow-xs active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Storage Plans
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#c8f542] text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#c8f542]" />
            Upload Files
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

      {/* S3 Maintenance Warning Banner */}
      {summary?.s3Info?.isUnderMaintenance && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 border border-amber-500/30 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-amber-950">Cloud Storage Under Maintenance</h4>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Paused
                </span>
              </div>
              <p className="text-xs text-amber-800/90 mt-0.5">
                {summary.s3Info.maintenanceMessage || 'AWS S3 Cloud Storage is currently undergoing maintenance. File uploads are temporarily paused and will resume shortly.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchStorageData()}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-300 shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Check Status
          </button>
        </motion.div>
      )}

      {/* Quota Exceeded / Low Warning Banner */}
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
            className={`font-semibold px-3 py-1.5 rounded-lg transition shrink-0 inline-flex items-center gap-1.5 cursor-pointer ${
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

      {/* ─── 2. Redesigned High-Impact Telemetry Hub (Sleek Dark Cockpit + 4 Active Category Pills) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Card: Dark High-Tech Telemetry Cockpit (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 text-white border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-[#c8f542]/10 via-transparent to-transparent pointer-events-none blur-2xl" />

          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#c8f542]/20 text-[#c8f542] flex items-center justify-center">
                  <HardDrive className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Storage Allocation Telemetry
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  NVMe Connected
                </span>
              </div>
            </div>

            {/* Metric Readout */}
            <div className="flex items-baseline justify-between mt-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono">
                    {summary ? (summary.totalUsedMB / 1024).toFixed(2) : '0.00'}
                  </span>
                  <span className="text-slate-400 font-semibold text-sm">
                    / {summary ? (summary.maxStorageMB / 1024).toFixed(0) : '5'} GB
                  </span>
                  <span className="ml-2 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#c8f542] text-slate-950">
                    {summary?.percentUsed || 0}% USED
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Total Objects Stored: <strong className="text-white font-semibold">{summary?.totalFiles || files.length} files</strong>
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Headroom</p>
                <p className="text-lg font-bold font-mono text-[#c8f542]">
                  {summary ? ((summary.maxStorageMB - summary.totalUsedMB) / 1024).toFixed(2) : '5.00'} GB Free
                </p>
              </div>
            </div>

            {/* Glowing Multi-Segment Progress Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex p-0.5 gap-0.5">
                {datasetPct > 0 && (
                  <div
                    style={{ width: `${Math.max(2, datasetPct)}%` }}
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    title={`Datasets: ${datasetMB} MB`}
                  />
                )}
                {docPct > 0 && (
                  <div
                    style={{ width: `${Math.max(2, docPct)}%` }}
                    className="h-full bg-sky-400 rounded-full transition-all duration-500"
                    title={`Documents: ${docMB} MB`}
                  />
                )}
                {codePct > 0 && (
                  <div
                    style={{ width: `${Math.max(2, codePct)}%` }}
                    className="h-full bg-purple-400 rounded-full transition-all duration-500"
                    title={`Source Code: ${codeMB} MB`}
                  />
                )}
                {imagePct > 0 && (
                  <div
                    style={{ width: `${Math.max(2, imagePct)}%` }}
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    title={`Media & Assets: ${imageMB} MB`}
                  />
                )}
                {summary && summary.totalUsedMB === 0 && (
                  <div className="h-full w-full bg-slate-800 rounded-full" />
                )}
              </div>
            </div>
          </div>

          {/* Bottom Telemetry Footer */}
          <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-800 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-[#c8f542]" />
              <span>Gemini 2.5 Flash Neural Engine Active</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Data
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Docs
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                Code
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Media
              </span>
            </div>
          </div>
        </div>

        {/* Right Cards: 4 Interactive Filter Blocks (5 Cols) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-2.5">
          {/* 1. Datasets */}
          <button
            type="button"
            onClick={() => handleCategoryClick('DATASET')}
            className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between group cursor-pointer relative overflow-hidden ${
              selectedCategory === 'DATASET'
                ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
                : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-105 transition">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                CSV / JSON
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xs font-bold text-slate-700">Datasets</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-extrabold text-slate-900 font-mono">
                  {summary?.categoryCounts?.DATASET?.count || 0}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  ({summary?.categoryCounts?.DATASET?.sizeMB || 0} MB)
                </span>
              </div>
            </div>
          </button>

          {/* 2. Documents */}
          <button
            type="button"
            onClick={() => handleCategoryClick('DOCUMENT')}
            className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between group cursor-pointer relative overflow-hidden ${
              selectedCategory === 'DOCUMENT'
                ? 'bg-sky-500/10 border-sky-500/40 ring-1 ring-sky-500/30'
                : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 group-hover:scale-105 transition">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                PDF / DOCX
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xs font-bold text-slate-700">Documents</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-extrabold text-slate-900 font-mono">
                  {summary?.categoryCounts?.DOCUMENT?.count || 0}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  ({summary?.categoryCounts?.DOCUMENT?.sizeMB || 0} MB)
                </span>
              </div>
            </div>
          </button>

          {/* 3. Source Code */}
          <button
            type="button"
            onClick={() => handleCategoryClick('CODE')}
            className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between group cursor-pointer relative overflow-hidden ${
              selectedCategory === 'CODE'
                ? 'bg-purple-500/10 border-purple-500/40 ring-1 ring-purple-500/30'
                : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 group-hover:scale-105 transition">
                <Code2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                TS / PY / GO
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xs font-bold text-slate-700">Source Code</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-extrabold text-slate-900 font-mono">
                  {summary?.categoryCounts?.CODE?.count || 0}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  ({summary?.categoryCounts?.CODE?.sizeMB || 0} MB)
                </span>
              </div>
            </div>
          </button>

          {/* 4. Media & Assets */}
          <button
            type="button"
            onClick={() => handleCategoryClick('IMAGE')}
            className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between group cursor-pointer relative overflow-hidden ${
              selectedCategory === 'IMAGE'
                ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 group-hover:scale-105 transition">
                <ImageIcon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                PNG / WEBP
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xs font-bold text-slate-700">Media & Assets</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-extrabold text-slate-900 font-mono">
                  {summary?.categoryCounts?.IMAGE?.count || 0}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  ({summary?.categoryCounts?.IMAGE?.sizeMB || 0} MB)
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ─── 3. Streamlined, High-Tech Dropzone Dock (Compact & Attractive) ─── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (summary?.s3Info?.isUnderMaintenance) {
            setUploadFeedback({
              type: 'error',
              message: summary.s3Info.maintenanceMessage || '⚠️ AWS S3 Cloud Storage is currently under maintenance. File uploads are temporarily paused.',
            });
            return;
          }
          fileInputRef.current?.click();
        }}
        className={`relative rounded-2xl p-4 sm:p-5 transition-all duration-200 border-2 border-dashed group ${
          summary?.s3Info?.isUnderMaintenance
            ? 'border-amber-300 bg-amber-50/40 cursor-not-allowed'
            : isDragging
            ? 'border-[#c8f542] bg-slate-900 text-white scale-[1.005] cursor-pointer shadow-lg'
            : 'border-slate-300/80 bg-white hover:border-slate-800 hover:bg-slate-50/50 cursor-pointer shadow-xs'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-3.5 text-left">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 ${
              summary?.s3Info?.isUnderMaintenance
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-900 text-[#c8f542] group-hover:scale-105'
            }`}>
              {summary?.s3Info?.isUnderMaintenance ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse" />
              ) : isUploading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#c8f542]" />
              ) : (
                <Upload className="w-4 h-4 text-[#c8f542]" />
              )}
            </div>

            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>
                  {summary?.s3Info?.isUnderMaintenance
                    ? 'Cloud Storage Maintenance Active'
                    : isUploading
                    ? 'Streaming files to S3 cloud storage...'
                    : 'Drop files to upload or click to browse'}
                </span>
                {!isUploading && !summary?.s3Info?.isUnderMaintenance && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#c8f542] text-slate-950 font-mono">
                    Direct S3
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Fast multipart streaming to bucket <strong className="text-slate-600 font-mono">{summary?.s3Info?.bucket || 'tenant-storage-akshay'}</strong> (up to 100MB per file)
              </p>
            </div>
          </div>

          {/* Formats & Action Pill */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-500">
              <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200/60 font-semibold">.CSV</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200/60 font-semibold">.JSON</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200/60 font-semibold">.PDF</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200/60 font-semibold">.DOCX</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200/60 font-semibold">.TS/.PY</span>
            </div>

            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 text-[#c8f542] group-hover:bg-slate-800 transition shadow-xs shrink-0">
              Select Files
            </span>
          </div>
        </div>

        {/* Feedback Message */}
        {uploadFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-3 mx-auto max-w-lg p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 ${
              uploadFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {uploadFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{uploadFeedback.message}</span>
          </motion.div>
        )}
      </div>

      {/* ─── 4. Stored Objects Table (High-Density & Clean Typography) ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Filter & Search Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Files', count: summary?.totalFiles || files.length },
              { id: 'DATASET', label: 'Datasets', count: summary?.categoryCounts?.DATASET?.count || 0 },
              { id: 'DOCUMENT', label: 'Docs', count: summary?.categoryCounts?.DOCUMENT?.count || 0 },
              { id: 'CODE', label: 'Code', count: summary?.categoryCounts?.CODE?.count || 0 },
              { id: 'IMAGE', label: 'Media', count: summary?.categoryCounts?.IMAGE?.count || 0 },
            ].map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === tab.id
                    ? 'bg-slate-900 text-[#c8f542] font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedCategory === tab.id
                      ? 'bg-white/20 text-[#c8f542]'
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
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition w-full"
            />
          </div>
        </div>

        {/* Table Rows */}
        <div className="overflow-x-auto relative">
          {isLoading && files.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-900" />
              <p className="text-xs font-semibold">Querying S3 object metadata...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="py-16 text-center space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-150">
                <Database className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-800">No objects found</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {searchQuery || selectedCategory !== 'ALL'
                  ? `No items match category "${selectedCategory}" or active search.`
                  : 'Drop your first file above to start analyzing with Google Gemini 2.5 Flash.'}
              </p>
            </div>
          ) : (
            <div className={`transition-opacity duration-150 ${isLoading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Object Name</th>
                  <th className="py-3 px-4">Category</th>
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
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Name & Badge */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border shrink-0 ${badgeInfo.bg} shadow-2xs`}>
                            {badgeInfo.icon}
                          </div>
                          <div className="truncate max-w-sm">
                            <p className="font-bold text-slate-900 truncate group-hover:text-slate-700 transition" title={file.originalName}>
                              {file.originalName}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400">
                              {new Date(file.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Extension Chip */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                          {badgeInfo.ext}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                        {formatFileSize(file.fileSizeBytes)}
                      </td>

                      {/* Gemini AI Status */}
                      <td className="py-3.5 px-4">
                        {isAnalyzed ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAiAnalysis(file)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900 text-[#c8f542] hover:bg-slate-800 transition shadow-2xs cursor-pointer group"
                            title="Open AI Workbench in New Tab"
                          >
                            <Sparkles className="w-3 h-3 text-[#c8f542]" />
                            <span>Analyzed</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover:text-[#c8f542] transition" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenAiAnalysis(file)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition cursor-pointer group"
                            title="Open AI Workbench in New Tab"
                          >
                            <Brain className="w-3 h-3 text-slate-400" />
                            <span>Ready for AI</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover:text-slate-700 transition" />
                          </button>
                        )}
                      </td>

                      {/* Uploaded By */}
                      <td className="py-3.5 px-4 text-slate-500">
                        <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-[10px] font-bold text-[#c8f542] flex items-center justify-center shrink-0">
                            {(file.uploadedBy?.firstName?.[0] || 'U').toUpperCase()}
                          </span>
                          <span className="truncate font-medium text-slate-700">
                            {file.uploadedBy ? file.uploadedBy.firstName : 'User'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Analyze / View Insights Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenAiAnalysis(file)}
                            className="bg-slate-900 hover:bg-slate-800 text-[#c8f542] text-[11px] font-mono font-bold px-3 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer border border-slate-750 group"
                            title="Open AI Workbench in New Browser Tab"
                          >
                            <Terminal className="w-3 h-3 text-[#c8f542]" />
                            <span>{isAnalyzed ? 'Workbench' : 'Analyze AI'}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#c8f542] transition" />
                          </button>

                          {/* Download Button */}
                          <button
                            onClick={() => handleDownload(file)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                            title="Download Object from S3"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(file)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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
            </div>
          )}
        </div>
      </div>

      {/* ─── 5. Gemini AI Data Analysis & Q&A Modal ─── */}
      <AiAnalysisModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        file={selectedFileForAi}
        onAnalysisUpdated={handleAnalysisUpdated}
      />

      {/* ─── 6. Plans Modal for Storage Upgrades ─── */}
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

      {/* ─── 7. Corrupted File Alert Modal ─── */}
      {corruptedFileAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>

              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">File Corrupted / Storage Inaccessible</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                  Storage Lost
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                The cloud storage block for <strong className="text-slate-800">{corruptedFileAlert.fileName}</strong> is unreachable or was removed from AWS S3.
              </p>

              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Allocated Quota Held:</span>
                  <span className="text-xs font-bold text-rose-600 font-mono">
                    {corruptedFileAlert.sizeMB} MB
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  This space remains locked in your quota until you delete the file record.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  onClick={async () => {
                    const fileObj = files.find((f) => f._id === corruptedFileAlert.fileId);
                    if (fileObj) {
                      await handleDelete(fileObj);
                    }
                    setCorruptedFileAlert(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete File & Free {corruptedFileAlert.sizeMB} MB
                </button>

                <button
                  onClick={() => setCorruptedFileAlert(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition active:scale-95 cursor-pointer"
                >
                  Keep Record (Do Not Free Space)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Storage;
