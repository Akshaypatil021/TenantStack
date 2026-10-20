import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  GitCommit,
  GitBranch,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

interface BuildLog {
  step: string;
  message: string;
  timestamp: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed';
}

interface BuildLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string | null;
  instanceName: string;
  publicEndpoint: string;
  githubRepoUrl?: string;
  githubBranch?: string;
  lastCommitHash?: string;
  onRedeployed?: () => void;
}

const API_BASE = 'http://localhost:5000/api/v1';

export const BuildLogsModal: React.FC<BuildLogsModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  instanceName,
  publicEndpoint,
  githubRepoUrl,
  githubBranch = 'main',
  lastCommitHash,
  onRedeployed,
}) => {
  const { token } = useAuth();
  const [buildLogs, setBuildLogs] = useState<BuildLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeploying, setIsRedeploying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch build logs
  const fetchLogs = async () => {
    if (!instanceId || !token) return;
    try {
      const res = await fetch(`${API_BASE}/compute/${instanceId}/build-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBuildLogs(data.buildLogs || []);
      }
    } catch (err) {
      console.error('Error fetching build logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchLogs();
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, instanceId]);

  // Trigger redeploy
  const handleRedeploy = async () => {
    if (!instanceId || !token || isRedeploying) return;
    setIsRedeploying(true);
    try {
      const res = await fetch(`${API_BASE}/compute/${instanceId}/redeploy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        onRedeployed?.();
        setTimeout(fetchLogs, 800);
      }
    } catch (err) {
      console.error('Error triggering redeploy:', err);
    } finally {
      setTimeout(() => setIsRedeploying(false), 2000);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(publicEndpoint).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-[#0b0f17] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-[#0f1422] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white shadow-sm">
                <GithubIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">{instanceName}</h2>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Deployment Pipeline
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  {githubRepoUrl && (
                    <a
                      href={githubRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-white flex items-center gap-1 transition"
                    >
                      <GithubIcon className="w-3 h-3" />
                      <span className="truncate max-w-[200px]">{githubRepoUrl.replace('https://github.com/', '')}</span>
                    </a>
                  )}
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-slate-500" />
                    <span>{githubBranch}</span>
                  </span>
                  {lastCommitHash && (
                    <span className="flex items-center gap-1 font-mono text-[11px] text-[#c8f542]">
                      <GitCommit className="w-3 h-3" />
                      <span>{lastCommitHash}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRedeploy}
                disabled={isRedeploying}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition disabled:opacity-50"
                title="Pull latest code from GitHub and redeploy"
              >
                {isRedeploying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Redeploying...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 text-[#c8f542]" /> Redeploy
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Public Endpoint Banner */}
          <div className="px-5 py-3 bg-[#0d121e] border-b border-slate-800/80 flex items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-slate-400">Live URL:</span>
              <span className="font-mono text-[#c8f542] font-semibold truncate">{publicEndpoint}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={copyUrl}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Copy link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a
                href={publicEndpoint}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#c8f542] hover:bg-[#b5e032] text-slate-950 font-bold text-xs transition"
              >
                Visit Site <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Stepper & Logs */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 font-mono text-xs bg-[#080b11]">
            {isLoading ? (
              <div className="py-12 flex items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading build history...</span>
              </div>
            ) : buildLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No build logs recorded yet.</div>
            ) : (
              <div className="space-y-3">
                {buildLogs.map((log, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-800/80 bg-[#0f1422] transition"
                  >
                    {/* Status Icon */}
                    <div className="mt-0.5 shrink-0">
                      {log.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : log.status === 'in_progress' ? (
                        <Loader2 className="w-4 h-4 text-[#c8f542] animate-spin" />
                      ) : log.status === 'failed' ? (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-600" />
                      )}
                    </div>

                    {/* Step details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold uppercase tracking-wider text-slate-400">
                          Step {i + 1}: {log.step.replace(/_/g, ' ')}
                        </span>
                        <span className="text-slate-600">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                        </span>
                      </div>
                      <p className="text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">{log.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 border-t border-slate-800/80 bg-[#0f1422] flex items-center justify-between text-[11px] text-slate-500 shrink-0">
            <span>Powered by TenantStack AWS EC2 Automation Engine</span>
            <span>Auto-refreshing</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
