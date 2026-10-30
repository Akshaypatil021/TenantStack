import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  GitPullRequest,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  GitBranch,
  Key,
  ShieldCheck,
  Radio,
  ExternalLink,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:5000/api/v1';

interface WebhookDeployEvent {
  commitHash: string;
  commitMessage: string;
  branch: string;
  pusher: string;
  triggeredAt: string;
  status: 'success' | 'failed' | 'in_progress';
  error?: string;
  deploymentDurationMs?: number;
}

interface WebhookConfigData {
  instanceId: string;
  name: string;
  githubRepoUrl?: string;
  githubBranch: string;
  autoDeployEnabled: boolean;
  webhookSecret: string;
  webhookUrl: string;
  lastWebhookTriggeredAt?: string;
  recentDeployments: WebhookDeployEvent[];
}

interface GitOpsWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string | null;
  instanceName: string;
  githubRepoUrl?: string;
  githubBranch?: string;
  onConfigUpdated?: () => void;
}

export const GitOpsWebhookModal: React.FC<GitOpsWebhookModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  instanceName,
  githubRepoUrl,
  githubBranch = 'main',
  onConfigUpdated,
}) => {
  const { token } = useAuth();
  const [config, setConfig] = useState<WebhookConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Webhook Configuration & Recent Deployments
  useEffect(() => {
    if (!isOpen || !instanceId || !token) return;

    let isMounted = true;
    const fetchWebhookConfig = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/compute/${instanceId}/webhook`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (isMounted) {
          if (res.ok) {
            setConfig(data);
          } else {
            setError(data.error || 'Failed to load webhook configuration');
          }
        }
      } catch (err: any) {
        if (isMounted) setError('Network error loading webhook details.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchWebhookConfig();

    return () => {
      isMounted = false;
    };
  }, [isOpen, instanceId, token]);

  if (!isOpen) return null;

  // Toggle Auto-Deploy ON/OFF
  const handleToggleAutoDeploy = async () => {
    if (!instanceId || !token || !config) return;
    setIsToggling(true);
    const newStatus = !config.autoDeployEnabled;
    try {
      const res = await fetch(`${API_BASE}/compute/${instanceId}/webhook`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ autoDeployEnabled: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfig((prev) => (prev ? { ...prev, autoDeployEnabled: newStatus } : null));
        showToast(
          'success',
          newStatus ? 'Auto-Deploy enabled! Git pushes will trigger deployments.' : 'Auto-Deploy paused.'
        );
        onConfigUpdated?.();
      } else {
        showToast('error', data.error || 'Failed to update auto-deploy status');
      }
    } catch {
      showToast('error', 'Network error updating auto-deploy.');
    } finally {
      setIsToggling(false);
    }
  };

  // Regenerate Webhook Secret
  const handleRegenerateSecret = async () => {
    if (!instanceId || !token) return;
    const confirmed = window.confirm(
      'Are you sure you want to regenerate the Webhook Secret? Any existing webhook configured in GitHub with the old secret will need to be updated.'
    );
    if (!confirmed) return;

    setIsRegenerating(true);
    try {
      const res = await fetch(`${API_BASE}/compute/${instanceId}/webhook`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ regenerateSecret: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfig((prev) =>
          prev
            ? {
                ...prev,
                webhookSecret: data.webhookSecret,
                webhookUrl: data.webhookUrl,
              }
            : null
        );
        showToast('success', 'New Webhook Secret generated! Remember to update your GitHub webhook.');
        onConfigUpdated?.();
      } else {
        showToast('error', data.error || 'Failed to regenerate secret');
      }
    } catch {
      showToast('error', 'Network error regenerating secret.');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Copy helpers
  const copyWebhookUrl = () => {
    if (!config?.webhookUrl) return;
    navigator.clipboard.writeText(config.webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    showToast('success', 'Payload URL copied to clipboard!');
  };

  const copySecret = () => {
    if (!config?.webhookSecret) return;
    navigator.clipboard.writeText(config.webhookSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    showToast('success', 'Secret token copied!');
  };

  const cleanRepo = (githubRepoUrl || '').replace('https://github.com/', '');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-900 text-white shrink-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
                <GitPullRequest className="w-5 h-5 text-[#c8f542]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-white truncate tracking-tight">
                    GitOps Auto-Deploy Webhook
                  </h2>
                  <span className="flex items-center gap-1 text-[10px] font-mono bg-purple-500/20 text-purple-200 border border-purple-500/30 px-2 py-0.5 rounded-full">
                    <GitBranch className="w-3 h-3 text-purple-300" />
                    {githubBranch}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {instanceName} · {cleanRepo || 'GitHub Repository'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toast Notification */}
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mx-6 mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{toast.message}</span>
            </motion.div>
          )}

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
                <span className="text-xs font-medium">Loading webhook credentials...</span>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : (
              <>
                {/* 1. Auto-Deploy ON / OFF Status Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        config?.autoDeployEnabled ? 'bg-emerald-500/15 text-emerald-600' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <Zap className={`w-5 h-5 ${config?.autoDeployEnabled ? 'fill-current' : ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          Auto-Deploy on Git Push
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            config?.autoDeployEnabled
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {config?.autoDeployEnabled ? 'ACTIVE' : 'PAUSED'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {config?.autoDeployEnabled
                          ? `Every 'git push' to ${githubBranch} instantly rebuilds your live app.`
                          : 'Webhook events are received but deployment execution is paused.'}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={handleToggleAutoDeploy}
                    disabled={isToggling}
                    className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                      config?.autoDeployEnabled ? 'bg-slate-900' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        config?.autoDeployEnabled ? 'translate-x-6 bg-[#c8f542]' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Webhook Payload URL Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      GitHub Payload URL (Ready to Paste)
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      HTTP POST · JSON
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2.5 shadow-inner">
                    <input
                      type="text"
                      readOnly
                      value={config?.webhookUrl || ''}
                      className="bg-transparent text-xs font-mono text-emerald-400 focus:outline-none flex-1 px-2 select-all truncate"
                    />
                    <button
                      onClick={copyWebhookUrl}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c8f542] hover:bg-[#b5e032] text-slate-950 rounded-xl text-xs font-bold transition shadow-sm shrink-0"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUrl ? 'Copied!' : 'Copy URL'}</span>
                    </button>
                  </div>
                </div>

                {/* Secret Key Display & Regenerate */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Key className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="text-slate-600 font-medium shrink-0">Secret Token:</span>
                    <span className="font-mono text-slate-800 font-semibold truncate">
                      {showSecret ? config?.webhookSecret : '••••••••••••••••••••••••••••••'}
                    </span>
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 underline ml-1 shrink-0"
                    >
                      {showSecret ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={copySecret}
                      className="p-1 rounded hover:bg-slate-200 text-slate-500 transition shrink-0"
                      title="Copy Secret Token"
                    >
                      {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    onClick={handleRegenerateSecret}
                    disabled={isRegenerating}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-red-600 transition shrink-0"
                    title="Regenerate secret if compromised"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>
                </div>

                {/* 3. GitHub 3-Step Setup Instructions */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    How to setup in GitHub (1 Minute Setup)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Step 1 */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <div className="w-6 h-6 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center mb-2">
                        1
                      </div>
                      <div className="text-xs font-bold text-slate-900 mb-1">Open Webhooks</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        In your repo on GitHub, go to <span className="font-semibold text-slate-700">Settings</span> ➔ <span className="font-semibold text-slate-700">Webhooks</span> ➔ click <span className="font-semibold text-slate-700">Add webhook</span>.
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <div className="w-6 h-6 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center mb-2">
                        2
                      </div>
                      <div className="text-xs font-bold text-slate-900 mb-1">Paste Payload URL</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Paste the <span className="font-semibold text-slate-700">Payload URL</span> above. Set Content type to <span className="font-semibold text-slate-700 font-mono">application/json</span>.
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <div className="w-6 h-6 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center mb-2">
                        3
                      </div>
                      <div className="text-xs font-bold text-slate-900 mb-1">Just the Push Event</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Select <span className="font-semibold text-slate-700">"Just the push event"</span>, click <span className="font-semibold text-slate-700">Add webhook</span>. Done!
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Recent Webhook Deployments History */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                      Recent Git Pushes Activity
                    </h3>
                    {config?.lastWebhookTriggeredAt && (
                      <span className="text-[11px] text-slate-500">
                        Last triggered: {new Date(config.lastWebhookTriggeredAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {!config?.recentDeployments || config.recentDeployments.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">
                      <GitPullRequest className="w-6 h-6 text-slate-400 mx-auto mb-2 opacity-60" />
                      <p className="text-xs font-semibold text-slate-700">No Webhook Deployments Yet</p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                        Once you add the Webhook to GitHub and push a commit to <span className="font-mono text-slate-700 font-bold">{githubBranch}</span>, the real-time activity log will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                      {config.recentDeployments.map((evt, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-white hover:bg-slate-50/80 transition flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {evt.status === 'success' ? (
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              </div>
                            ) : evt.status === 'in_progress' ? (
                              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                  {evt.commitHash || 'commit'}
                                </span>
                                <span className="font-semibold text-slate-900 truncate max-w-md">
                                  {evt.commitMessage}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Pushed by <span className="font-medium text-slate-700">@{evt.pusher}</span> · {new Date(evt.triggeredAt).toLocaleString()}
                                {evt.deploymentDurationMs && (
                                  <span className="ml-1.5 text-emerald-600 font-medium">
                                    · Took {(evt.deploymentDurationMs / 1000).toFixed(1)}s
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                evt.status === 'success'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : evt.status === 'in_progress'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {evt.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            {githubRepoUrl ? (
              <a
                href={`${githubRepoUrl}/settings/hooks`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition"
              >
                <span>Open GitHub Webhook Settings</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            ) : (
              <span />
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
