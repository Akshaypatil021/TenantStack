import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server,
  Zap,
  Plus,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Cpu,
  Activity,
  Wifi,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Lock,
  ExternalLink,
  Globe,
  Shield,
  Terminal,
  Code2,
  Database,
  Box,
  HardDrive,
  Copy,
  Check,
  Settings,
} from 'lucide-react';

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);
import { useAuth } from '../context/AuthContext';
import { PlansModal } from '../components/PlansModal';
import { LiveLogsModal } from '../components/LiveLogsModal';
import { TerminalStatsModal } from '../components/TerminalStatsModal';
import { DeployGithubModal } from '../components/DeployGithubModal';
import { AdminEc2SettingsModal } from '../components/AdminEc2SettingsModal';
import { BuildLogsModal } from '../components/BuildLogsModal';
import { ComputeCloudShell } from '../components/ComputeCloudShell';

// ===========================================================================
// Types
// ===========================================================================
type InstanceStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'restarting' | 'error' | 'terminated';
type InstanceTemplate = 'nodejs' | 'python' | 'go' | 'nginx' | 'ubuntu' | 'alpine' | 'postgres' | 'redis' | 'nextjs' | 'react' | 'static' | 'docker';

interface EnvVar { key: string; value: string; }

interface ComputeInstance {
  _id: string;
  name: string;
  template: InstanceTemplate;
  sourceType?: 'template' | 'github';
  githubRepoUrl?: string;
  githubBranch?: string;
  buildCommand?: string;
  startCommand?: string;
  rootDirectory?: string;
  lastCommitHash?: string;
  status: InstanceStatus;
  port: number;
  publicIp: string;
  publicEndpoint: string;
  vCpu: number;
  ramGb: number;
  planName: string;
  envVars: EnvVar[];
  region: string;
  uptimeStart?: string;
  cpuUsagePercent?: number;
  ramUsedMb?: number;
  networkInKb?: number;
  networkOutKb?: number;
  createdAt: string;
}

interface ComputeQuota {
  hasPlan: boolean;
  planName: string | null;
  maxInstances: number;
  vCpu: number;
  ramGb: number;
  usedInstances: number;
  activeInstances: number;
  remainingSlots: number;
  isAtLimit: boolean;
}

// ===========================================================================
// Template Config
// ===========================================================================
const TEMPLATES: Record<InstanceTemplate, { label: string; icon: React.ReactNode; description: string; defaultPort: number; color: string; badge: string }> = {
  nextjs:   { label: 'Next.js', icon: <Code2 className="w-5 h-5" />, description: 'React fullstack framework with SSR', defaultPort: 3000, color: '#000000', badge: 'Fullstack' },
  react:    { label: 'React / Vite', icon: <Globe className="w-5 h-5" />, description: 'Frontend single page application (SPA)', defaultPort: 3000, color: '#06b6d4', badge: 'Frontend' },
  nodejs:   { label: 'Node.js 20', icon: <Code2 className="w-5 h-5" />, description: 'JavaScript runtime — Express, Fastify, NestJS', defaultPort: 3000, color: '#68a063', badge: 'Runtime' },
  python:   { label: 'Python 3.11', icon: <Terminal className="w-5 h-5" />, description: 'Python runtime — FastAPI, Flask, Django', defaultPort: 8000, color: '#3572A5', badge: 'Runtime' },
  go:       { label: 'Go 1.22', icon: <Zap className="w-5 h-5" />, description: 'High-performance Go application server', defaultPort: 8080, color: '#00ADD8', badge: 'Runtime' },
  docker:   { label: 'Docker App', icon: <Box className="w-5 h-5" />, description: 'Universal containerized application', defaultPort: 8080, color: '#2563eb', badge: 'Universal' },
  static:   { label: 'Static HTML', icon: <Globe className="w-5 h-5" />, description: 'Lightweight static HTML/CSS/JS website', defaultPort: 3000, color: '#f59e0b', badge: 'Frontend' },
  nginx:    { label: 'Nginx', icon: <Globe className="w-5 h-5" />, description: 'Reverse proxy & static file server', defaultPort: 80, color: '#009900', badge: 'Server' },
  ubuntu:   { label: 'Ubuntu 22.04', icon: <HardDrive className="w-5 h-5" />, description: 'Full Ubuntu LTS Linux VM', defaultPort: 22, color: '#E95420', badge: 'Linux VM' },
  alpine:   { label: 'Alpine Linux', icon: <Shield className="w-5 h-5" />, description: 'Lightweight container OS (5MB base)', defaultPort: 22, color: '#0D597F', badge: 'Linux VM' },
  postgres: { label: 'PostgreSQL 16', icon: <Database className="w-5 h-5" />, description: 'Managed PostgreSQL database server', defaultPort: 5432, color: '#336791', badge: 'Database' },
  redis:    { label: 'Redis 7', icon: <Box className="w-5 h-5" />, description: 'In-memory cache & message broker', defaultPort: 6379, color: '#DC382D', badge: 'Cache' },
};

// ===========================================================================
// Status Config
// ===========================================================================
const STATUS_CONFIG: Record<InstanceStatus, { label: string; color: string; bg: string; dot: string; pulse: boolean }> = {
  starting:    { label: 'Starting',    color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200',  dot: 'bg-amber-500',  pulse: true },
  running:     { label: 'Running',     color: 'text-emerald-600',bg: 'bg-emerald-50 border-emerald-200',dot: 'bg-emerald-500',pulse: true },
  stopping:    { label: 'Stopping',    color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500', pulse: true },
  stopped:     { label: 'Stopped',     color: 'text-slate-500',  bg: 'bg-slate-50 border-slate-200',   dot: 'bg-slate-400',  pulse: false },
  restarting:  { label: 'Restarting', color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200',     dot: 'bg-blue-500',   pulse: true },
  error:       { label: 'Error',       color: 'text-red-600',    bg: 'bg-red-50 border-red-200',       dot: 'bg-red-500',    pulse: false },
  terminated:  { label: 'Terminated',  color: 'text-red-400',    bg: 'bg-red-50/50 border-red-100',    dot: 'bg-red-300',    pulse: false },
};

// ===========================================================================
// Helpers
// ===========================================================================
const formatUptime = (uptimeStart?: string): string => {
  if (!uptimeStart) return '—';
  const diff = Date.now() - new Date(uptimeStart).getTime();
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
};

const API_BASE = 'http://localhost:5000/api/v1';

// ===========================================================================
// Sub-components
// ===========================================================================

const StatusBadge: React.FC<{ status: InstanceStatus }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  );
};

const MetricChip: React.FC<{ icon: React.ReactNode; label: string; value: string; color?: string }> = ({ icon, label, value, color = 'text-slate-600' }) => (
  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
    <span className={`${color} opacity-70`}>{icon}</span>
    <div>
      <div className="text-[10px] text-slate-400 leading-none">{label}</div>
      <div className="text-xs font-semibold text-slate-700 mt-0.5">{value}</div>
    </div>
  </div>
);

// ===========================================================================
// Deploy Instance Modal
// ===========================================================================
interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (data: any) => Promise<void>;
  quota: ComputeQuota | null;
  isDeploying: boolean;
}

const DeployModal: React.FC<DeployModalProps> = ({ isOpen, onClose, onDeploy, quota, isDeploying }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<InstanceTemplate>('nodejs');
  const [name, setName] = useState('');
  const [port, setPort] = useState<number>(3000);
  const [isLoadingPort, setIsLoadingPort] = useState<boolean>(false);
  const [region, setRegion] = useState('ap-south-1');
  const [envVars, setEnvVars] = useState<EnvVar[]>([{ key: '', value: '' }]);
  const [error, setError] = useState('');

  // Automatically fetch next conflict-free port when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const fetchNextPort = async () => {
      setIsLoadingPort(true);
      try {
        const token = localStorage.getItem('tenant_token') || localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/compute/next-port`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.nextPort) {
            setPort(data.nextPort);
          }
        }
      } catch (err) {
        console.error('Failed to fetch next conflict-free port:', err);
      } finally {
        setIsLoadingPort(false);
      }
    };
    fetchNextPort();
  }, [isOpen]);

  const addEnvVar = () => setEnvVars(prev => [...prev, { key: '', value: '' }]);
  const removeEnvVar = (i: number) => setEnvVars(prev => prev.filter((_, idx) => idx !== i));
  const updateEnvVar = (i: number, field: 'key' | 'value', val: string) => {
    setEnvVars(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  };

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) { setError('Instance name is required.'); return; }
    if (name.trim().length < 3) { setError('Name must be at least 3 characters.'); return; }

    const filteredEnv = envVars.filter(e => e.key.trim() && e.value.trim());
    await onDeploy({ name: name.trim(), template: selectedTemplate, port, region, envVars: filteredEnv });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Deploy New Instance</h2>
              {quota && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {quota.usedInstances}/{quota.maxInstances} instances used · <span className="font-medium text-slate-700">{quota.planName}</span>
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Template Selection */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-3 block">Choose Runtime / Template</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(TEMPLATES) as [InstanceTemplate, typeof TEMPLATES[InstanceTemplate]][]).map(([key, tmpl]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTemplate(key)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedTemplate === key
                        ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={selectedTemplate === key ? 'text-[#c8f542]' : ''} style={{ color: selectedTemplate === key ? '#c8f542' : tmpl.color }}>
                      {tmpl.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-semibold truncate ${selectedTemplate === key ? 'text-white' : 'text-slate-800'}`}>{tmpl.label}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide shrink-0 ${
                          selectedTemplate === key ? 'bg-white/20 text-white/80' : 'bg-slate-100 text-slate-500'
                        }`}>{tmpl.badge}</span>
                      </div>
                      <p className={`text-[11px] mt-0.5 leading-tight ${selectedTemplate === key ? 'text-white/70' : 'text-slate-400'}`}>{tmpl.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Instance Name */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Instance Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={`e.g., my-${selectedTemplate}-server`}
                maxLength={50}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
              />
            </div>

            {/* Port & Region */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-slate-700">Expose Port</label>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-emerald-600" />
                    Conflict-Free
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={port}
                    readOnly
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-sm font-mono font-semibold text-slate-800 cursor-not-allowed select-none transition"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-slate-500 font-medium select-none pointer-events-none">
                    {isLoadingPort ? (
                      <span className="text-blue-500 animate-pulse">Allocating...</span>
                    ) : (
                      <span className="bg-slate-200/70 px-2 py-0.5 rounded text-slate-600 font-mono">
                        Auto :{port}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Unique port automatically allocated to prevent host collisions.
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Region</label>
                <select
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                >
                  <option value="ap-south-1">🇮🇳 ap-south-1 (Mumbai)</option>
                  <option value="us-east-1">🇺🇸 us-east-1 (N. Virginia)</option>
                  <option value="eu-west-1">🇪🇺 eu-west-1 (Ireland)</option>
                </select>
              </div>
            </div>

            {/* Quota Info */}
            {quota && (
              <div className="flex items-center gap-3 bg-slate-900 rounded-xl p-3 text-xs">
                <div className="p-2 rounded-lg bg-[#c8f542]/20">
                  <Server className="w-4 h-4 text-[#c8f542]" />
                </div>
                <div>
                  <span className="text-white font-semibold">{quota.planName}</span>
                  <span className="text-white/60 ml-2">· {quota.vCpu} vCPU · {quota.ramGb >= 1 ? `${quota.ramGb}GB` : `${quota.ramGb * 1024}MB`} RAM · max {quota.maxInstances} instance{quota.maxInstances > 1 ? 's' : ''}</span>
                </div>
              </div>
            )}

            {/* Environment Variables */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">Environment Variables</label>
                <button
                  onClick={addEnvVar}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Variable
                </button>
              </div>
              <div className="space-y-2">
                {envVars.map((ev, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ev.key}
                      onChange={e => updateEnvVar(i, 'key', e.target.value)}
                      placeholder="KEY"
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 uppercase"
                    />
                    <span className="text-slate-400 text-sm">=</span>
                    <input
                      type="text"
                      value={ev.value}
                      onChange={e => updateEnvVar(i, 'value', e.target.value)}
                      placeholder="value"
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <button
                      onClick={() => removeEnvVar(i)}
                      className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-100 sticky bottom-0 bg-white">
            <button
              onClick={onClose}
              disabled={isDeploying}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isDeploying || !name.trim()}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-[#c8f542] font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-slate-900/20"
            >
              {isDeploying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</>
              ) : (
                <><Zap className="w-4 h-4" /> Deploy Instance</>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ===========================================================================
// Instance Card
// ===========================================================================
interface InstanceCardProps {
  instance: ComputeInstance;
  onAction: (id: string, action: string) => void;
  actionLoading: string | null;
  onOpenLogs: (instance: ComputeInstance) => void;
  onOpenTerminalStats: (instance: ComputeInstance, tab?: 'stats' | 'terminal') => void;
  onOpenBuildLogs?: (instance: ComputeInstance) => void;
  onRedeploy?: (instance: ComputeInstance) => void;
}

const InstanceCard: React.FC<InstanceCardProps> = ({
  instance,
  onAction,
  actionLoading,
  onOpenLogs,
  onOpenTerminalStats,
  onOpenBuildLogs,
  onRedeploy,
}) => {
  const [copied, setCopied] = useState(false);
  const isLoading = actionLoading === instance._id;
  const isTransitioning = ['starting', 'stopping', 'restarting'].includes(instance.status);
  const tmpl = TEMPLATES[instance.template];

  const copyEndpoint = () => {
    navigator.clipboard.writeText(instance.publicEndpoint).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md ${
        instance.status === 'terminated' ? 'opacity-50' : ''
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between p-5 pb-4 border-b border-slate-50">
        <div className="flex items-center gap-3 min-w-0">
          {/* Template icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${tmpl.color}15` }}>
            {instance.sourceType === 'github' ? (
              <GithubIcon className="w-5 h-5 text-slate-800" />
            ) : (
              <span style={{ color: tmpl.color }}>{tmpl.icon}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm truncate">{instance.name}</h3>
              <StatusBadge status={instance.status} />
            </div>
            {instance.sourceType === 'github' && instance.githubRepoUrl ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <span className="font-mono text-[11px] truncate max-w-[140px]">
                  {instance.githubRepoUrl.replace('https://github.com/', '')}
                </span>
                <span>·</span>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {instance.githubBranch || 'main'}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">{tmpl.label} · {instance.region}</p>
            )}
          </div>
        </div>
      </div>

      {/* Endpoint */}
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs font-mono text-slate-600 truncate flex-1">{instance.publicEndpoint}</span>
          <button onClick={copyEndpoint} className="shrink-0 p-1 rounded hover:bg-slate-200 transition-colors text-slate-400">
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          </button>
          <a
            href={instance.publicEndpoint}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 p-1 rounded hover:bg-slate-200 transition-colors text-slate-400"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Metrics */}
      <div className="p-5 grid grid-cols-2 gap-2">
        <MetricChip
          icon={<Cpu className="w-3.5 h-3.5" />}
          label="CPU"
          value={instance.status === 'running' ? `${instance.cpuUsagePercent ?? 0}%` : '—'}
          color="text-blue-600"
        />
        <MetricChip
          icon={<Activity className="w-3.5 h-3.5" />}
          label="RAM"
          value={instance.status === 'running' ? `${instance.ramUsedMb ?? 0} MB / ${instance.ramGb >= 1 ? `${instance.ramGb}GB` : `${instance.ramGb * 1024}MB`}` : '—'}
          color="text-purple-600"
        />
        <MetricChip
          icon={<Wifi className="w-3.5 h-3.5" />}
          label="Network In"
          value={instance.status === 'running' ? `${instance.networkInKb ?? 0} KB/s` : '—'}
          color="text-emerald-600"
        />
        <MetricChip
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Uptime"
          value={instance.status === 'running' ? formatUptime(instance.uptimeStart) : '—'}
          color="text-amber-600"
        />
      </div>

      {/* Plan + vCPU/RAM */}
      <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-medium">{instance.planName}</span>
        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-medium">{instance.vCpu} vCPU</span>
        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-medium">{instance.ramGb >= 1 ? `${instance.ramGb}GB RAM` : `${instance.ramGb * 1024}MB RAM`}</span>
        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-medium">:{instance.port}</span>
      </div>

      {/* Advanced Controls: Live Logs & Terminal / Stats */}
      {instance.status !== 'terminated' && (
        <div className="px-5 pb-3 flex items-center gap-2">
          <button
            onClick={() => onOpenLogs(instance)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition"
            title="Stream Live Container Logs"
          >
            <Terminal className="w-3.5 h-3.5 text-[#c8f542]" />
            <span>Logs</span>
            {instance.status === 'running' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>
          <button
            onClick={() => onOpenTerminalStats(instance, 'stats')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-semibold transition"
            title="Real-time CPU/RAM Telemetry & Uptime"
          >
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>Stats</span>
          </button>
          {instance.sourceType === 'github' && (
            <button
              onClick={() => onOpenBuildLogs?.(instance)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 transition"
              title="View GitHub Build & Pipeline Logs"
            >
              <GithubIcon className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onOpenTerminalStats(instance, 'terminal')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 transition"
            title="Open Interactive Shell (Terminal)"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Action Buttons */}
      {instance.status !== 'terminated' && (
        <div className="px-5 pb-5 flex items-center gap-2 flex-wrap">
          {/* Start/Stop toggle */}
          {instance.status === 'stopped' ? (
            <button
              onClick={() => onAction(instance._id, 'start')}
              disabled={isLoading || isTransitioning}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              Start
            </button>
          ) : (
            <button
              onClick={() => onAction(instance._id, 'stop')}
              disabled={isLoading || isTransitioning}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
              Stop
            </button>
          )}

          {/* Redeploy for GitHub instances */}
          {instance.sourceType === 'github' ? (
            <button
              onClick={() => onRedeploy?.(instance)}
              disabled={isLoading || isTransitioning}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold transition disabled:opacity-50"
              title="Pull latest code from GitHub and redeploy"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Redeploy
            </button>
          ) : (
            <button
              onClick={() => onAction(instance._id, 'restart')}
              disabled={isLoading || isTransitioning || instance.status === 'stopped'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Restart
            </button>
          )}

          {/* Terminate */}
          <button
            onClick={() => onAction(instance._id, 'terminate')}
            disabled={isLoading}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Terminate
          </button>
        </div>
      )}
    </motion.div>
  );
};

// ===========================================================================
// Main Compute Page
// ===========================================================================
export const Compute: React.FC = () => {
  const { token, tenant, user } = useAuth();
  const isSuperAdmin = user?.email === 'admin@gmail.com';

  const [instances, setInstances] = useState<ComputeInstance[]>([]);
  const [quota, setQuota] = useState<ComputeQuota | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'gui' | 'cloudshell'>('gui');
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Advanced Controls Modals State
  const [selectedInstanceForLogs, setSelectedInstanceForLogs] = useState<ComputeInstance | null>(null);
  const [selectedInstanceForTerminalStats, setSelectedInstanceForTerminalStats] = useState<{
    instance: ComputeInstance;
    tab: 'stats' | 'terminal';
  } | null>(null);

  // GitHub & EC2 Host Modals State
  const [isDeployGithubModalOpen, setIsDeployGithubModalOpen] = useState(false);
  const [isDeployingGithub, setIsDeployingGithub] = useState(false);
  const [isAdminEc2ModalOpen, setIsAdminEc2ModalOpen] = useState(false);
  const [selectedInstanceForBuildLogs, setSelectedInstanceForBuildLogs] = useState<ComputeInstance | null>(null);

  // Check compute plan from tenant context
  const computePlan = tenant?.computePlan || tenant?.allocatedResources?.computePlan;
  const hasComputePlan = !!computePlan;

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch instances and quota
  const fetchData = useCallback(async () => {
    if (!token || !hasComputePlan) {
      setIsLoading(false);
      return;
    }
    try {
      const [instRes, quotaRes] = await Promise.all([
        fetch(`${API_BASE}/compute`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/compute/quota`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const instData = await instRes.json();
      const quotaData = await quotaRes.json();
      if (instRes.ok) setInstances(instData.instances || []);
      if (quotaRes.ok) setQuota(quotaData);
    } catch (err) {
      setError('Failed to load compute instances. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, [token, hasComputePlan]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 8 seconds for live telemetry
  useEffect(() => {
    if (!hasComputePlan) return;
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData, hasComputePlan]);

  // Deploy handler
  const handleDeploy = async (data: any) => {
    if (!token) return;
    setIsDeploying(true);
    try {
      const res = await fetch(`${API_BASE}/compute/deploy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.code === 'QUOTA_EXCEEDED') {
          showToast('error', `Quota exceeded: ${json.error}`);
          setIsDeployModalOpen(false);
          setIsPlansModalOpen(true);
        } else {
          showToast('error', json.error || 'Failed to deploy instance');
        }
        return;
      }
      showToast('success', `Instance "${data.name}" is starting up!`);
      setIsDeployModalOpen(false);
      setTimeout(fetchData, 1500);
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setIsDeploying(false);
    }
  };

  // Deploy from GitHub handler
  const handleDeployGithub = async (data: any) => {
    if (!token) return;
    setIsDeployingGithub(true);
    try {
      const res = await fetch(`${API_BASE}/compute/deploy-github`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.code === 'QUOTA_EXCEEDED') {
          showToast('error', `Quota exceeded: ${json.error}`);
          setIsDeployGithubModalOpen(false);
          setIsPlansModalOpen(true);
        } else {
          showToast('error', json.error || 'Failed to deploy from GitHub');
        }
        return;
      }
      showToast('success', `GitHub application "${data.name}" deployed to EC2!`);
      setIsDeployGithubModalOpen(false);
      setTimeout(fetchData, 1500);
    } catch {
      showToast('error', 'Network error deploying from GitHub.');
    } finally {
      setIsDeployingGithub(false);
    }
  };

  // Redeploy GitHub instance handler
  const handleRedeploy = async (instance: ComputeInstance) => {
    if (!token) return;
    setActionLoading(instance._id);
    try {
      const res = await fetch(`${API_BASE}/compute/${instance._id}/redeploy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) {
        showToast('success', json.message || 'Redeployment triggered!');
        setTimeout(fetchData, 2000);
      } else {
        showToast('error', json.error || 'Failed to redeploy');
      }
    } catch {
      showToast('error', 'Network error during redeployment.');
    } finally {
      setActionLoading(null);
    }
  };

  // Action handler
  const handleAction = async (instanceId: string, action: string) => {
    if (!token) return;

    if (action === 'terminate') {
      const confirmed = window.confirm('Are you sure you want to terminate this instance? This action cannot be undone.');
      if (!confirmed) return;
    }

    setActionLoading(instanceId);
    try {
      const res = await fetch(`${API_BASE}/compute/${instanceId}/action`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast('error', json.error || `Action "${action}" failed`);
        return;
      }
      showToast('success', json.message);
      // Optimistic UI update
      setInstances(prev => prev.map(inst =>
        inst._id === instanceId ? { ...inst, status: json.status } : inst
      ));
      // Refresh after transition
      setTimeout(fetchData, json.transitionDelay + 500 || 3000);
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // ===========================================================================
  // Render: No Compute Plan
  // ===========================================================================
  if (!hasComputePlan && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Compute Services</h1>
            <p className="text-sm text-slate-500 mt-1">Manage and provision virtual machines and containers</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="relative p-12 flex flex-col items-center text-center">
            {/* Decorative gradient bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 pointer-events-none" />
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Server className="w-9 h-9 text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">No Compute Plan Active</h2>
              <p className="text-sm text-slate-500 max-w-sm leading-relaxed mb-8">
                Deploy virtual machines and containers by activating a Compute plan. Choose from Sandbox, Dev Pro, or Compute Node.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg text-left">
                {[
                  { plan: 'Sandbox / Testing', vcpu: '1 vCPU', ram: '512MB RAM', instances: '1 instance', price: '₹449/mo' },
                  { plan: 'Dev Pro', vcpu: '2 vCPU', ram: '2GB RAM', instances: '3 instances', price: '₹1,299/mo' },
                  { plan: 'Compute Node', vcpu: '4 vCPU', ram: '8GB RAM', instances: '5 instances', price: '₹3,499/mo' },
                ].map((p) => (
                  <div key={p.plan} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="text-xs font-bold text-slate-900 mb-2">{p.plan}</div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-slate-500">{p.vcpu}</div>
                      <div className="text-[11px] text-slate-500">{p.ram}</div>
                      <div className="text-[11px] text-slate-500">{p.instances}</div>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 mt-3">{p.price}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setIsPlansModalOpen(true)}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-[#c8f542] font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-lg shadow-slate-900/20"
              >
                <Zap className="w-4 h-4" />
                Activate Compute Plan
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <PlansModal
          isOpen={isPlansModalOpen}
          onClose={() => setIsPlansModalOpen(false)}
          initialCategory="compute"
        />
      </div>
    );
  }

  // ===========================================================================
  // Render: Loading
  // ===========================================================================
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Compute Services</h1>
            <p className="text-sm text-slate-500 mt-1">Manage and provision virtual machines and containers</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading compute instances...</span>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // Render: Main Dashboard
  // ===========================================================================
  const runningCount = instances.filter(i => i.status === 'running').length;
  const stoppedCount = instances.filter(i => i.status === 'stopped').length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Compute Services</h1>
          <p className="text-sm text-slate-500 mt-1">Manage, deploy and host applications on cloud infrastructure</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Switcher: GUI vs CloudShell CMD */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setViewMode('gui')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'gui'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>GUI Dashboard</span>
            </button>
            <button
              onClick={() => setViewMode('cloudshell')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'cloudshell'
                  ? 'bg-slate-900 text-[#c8f542] shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>CloudShell CMD</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>
          </div>

          {/* Super Admin: Master EC2 Host Button */}
          {isSuperAdmin && (
            <button
              onClick={() => setIsAdminEc2ModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs transition shadow-sm"
              title="Super Admin: Configure Master AWS EC2 Server"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
              <span>Master EC2 Host</span>
            </button>
          )}

          {/* Deploy from GitHub Button */}
          <button
            onClick={() => (quota?.isAtLimit ? setIsPlansModalOpen(true) : setIsDeployGithubModalOpen(true))}
            className="flex items-center gap-2 font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition shadow-md"
            title={quota?.isAtLimit ? 'Upgrade plan to deploy more' : 'Deploy website directly from GitHub repository'}
          >
            <GithubIcon className="w-4 h-4 text-white" />
            <span>Deploy from GitHub</span>
          </button>

          {/* Deploy Instance Button */}
          <button
            onClick={() => (quota?.isAtLimit ? setIsPlansModalOpen(true) : setIsDeployModalOpen(true))}
            className={`flex items-center gap-2 font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition shadow-lg ${
              quota?.isAtLimit
                ? 'bg-slate-200 text-slate-500 shadow-slate-200/50 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-slate-800 text-[#c8f542] shadow-slate-900/10'
            }`}
            title={quota?.isAtLimit ? 'Upgrade to deploy more instances' : undefined}
          >
            {quota?.isAtLimit ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>Deploy Instance</span>
            {quota?.isAtLimit && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full ml-1">
                Limit
              </span>
            )}
          </button>
        </div>
      </div>

      {viewMode === 'cloudshell' ? (
        <ComputeCloudShell
          instances={instances}
          quota={quota}
          onRefresh={fetchData}
          onAction={handleAction}
          onSwitchToGui={() => setViewMode('gui')}
          onOpenDeployModal={() => (quota?.isAtLimit ? setIsPlansModalOpen(true) : setIsDeployModalOpen(true))}
          onOpenGithubDeployModal={() => (quota?.isAtLimit ? setIsPlansModalOpen(true) : setIsDeployGithubModalOpen(true))}
        />
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Instances', value: instances.length, icon: <Server className="w-4 h-4" />, color: 'text-slate-700', bg: 'bg-slate-100' },
              { label: 'Running', value: runningCount, icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-100' },
              { label: 'Stopped', value: stoppedCount, icon: <Square className="w-4 h-4" />, color: 'text-slate-500', bg: 'bg-slate-100' },
              { label: 'Slots Available', value: quota?.remainingSlots ?? 0, icon: <Zap className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-100' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <span className={stat.color}>{stat.icon}</span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                    <div className="text-xs text-slate-500">{stat.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quota Bar */}
          {quota && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-[#c8f542]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{quota.planName} Plan</div>
                    <div className="text-xs text-slate-500">{quota.vCpu} vCPU · {quota.ramGb >= 1 ? `${quota.ramGb}GB` : `${quota.ramGb * 1024}MB`} RAM per instance</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">{quota.usedInstances} / {quota.maxInstances}</div>
                  <div className="text-xs text-slate-500">Instances Used</div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (quota.usedInstances / quota.maxInstances) * 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    quota.isAtLimit ? 'bg-red-500' : quota.usedInstances / quota.maxInstances > 0.6 ? 'bg-amber-500' : 'bg-slate-900'
                  }`}
                />
              </div>
              {quota.isAtLimit && (
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-amber-700">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Instance limit reached. Upgrade to deploy more.
                  </div>
                  <button
                    onClick={() => setIsPlansModalOpen(true)}
                    className="text-xs font-semibold text-slate-900 hover:underline flex items-center gap-1"
                  >
                    Upgrade Plan <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Instances Grid */}
          {instances.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Server className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">No instances deployed yet</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mb-5">
                Deploy your first instance to get started. Choose from Node.js, Python, Go, Linux VMs, databases, and more.
              </p>
              <button
                onClick={() => setIsDeployModalOpen(true)}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-[#c8f542] font-semibold text-sm px-5 py-2.5 rounded-xl transition shadow-lg shadow-slate-900/10"
              >
                <Plus className="w-4 h-4" />
                Deploy First Instance
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-700">Active Instances ({instances.length})</h2>
                <button onClick={fetchData} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {instances.map((instance) => (
                    <InstanceCard
                      key={instance._id}
                      instance={instance}
                      onAction={handleAction}
                      actionLoading={actionLoading}
                      onOpenLogs={(inst) => setSelectedInstanceForLogs(inst)}
                      onOpenTerminalStats={(inst, tab = 'stats') =>
                        setSelectedInstanceForTerminalStats({ instance: inst, tab })
                      }
                      onOpenBuildLogs={(inst) => setSelectedInstanceForBuildLogs(inst)}
                      onRedeploy={(inst) => handleRedeploy(inst)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
        </>
      )}

      {/* Deploy Template Instance Modal */}
      <DeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        onDeploy={handleDeploy}
        quota={quota}
        isDeploying={isDeploying}
      />

      {/* Deploy from GitHub Modal */}
      <DeployGithubModal
        isOpen={isDeployGithubModalOpen}
        onClose={() => setIsDeployGithubModalOpen(false)}
        onDeployGithub={handleDeployGithub}
        quota={quota}
        isDeploying={isDeployingGithub}
      />

      {/* Super Admin: Master EC2 Node Configuration Modal */}
      {isSuperAdmin && (
        <AdminEc2SettingsModal
          isOpen={isAdminEc2ModalOpen}
          onClose={() => setIsAdminEc2ModalOpen(false)}
          onSaved={fetchData}
        />
      )}

      {/* GitHub Deployment & Build Logs Pipeline Modal */}
      <BuildLogsModal
        isOpen={!!selectedInstanceForBuildLogs}
        onClose={() => setSelectedInstanceForBuildLogs(null)}
        instanceId={selectedInstanceForBuildLogs?._id || null}
        instanceName={selectedInstanceForBuildLogs?.name || ''}
        publicEndpoint={selectedInstanceForBuildLogs?.publicEndpoint || ''}
        githubRepoUrl={selectedInstanceForBuildLogs?.githubRepoUrl}
        githubBranch={selectedInstanceForBuildLogs?.githubBranch || 'main'}
        lastCommitHash={selectedInstanceForBuildLogs?.lastCommitHash}
        onRedeployed={fetchData}
      />

      {/* Plans Modal */}
      <PlansModal
        isOpen={isPlansModalOpen}
        onClose={() => setIsPlansModalOpen(false)}
        initialCategory="compute"
      />

      {/* Phase 2: Live Logs Viewer Modal */}
      <LiveLogsModal
        isOpen={!!selectedInstanceForLogs}
        onClose={() => setSelectedInstanceForLogs(null)}
        instanceId={selectedInstanceForLogs?._id || null}
        instanceName={selectedInstanceForLogs?.name || ''}
        template={selectedInstanceForLogs?.template || 'nodejs'}
        status={selectedInstanceForLogs?.status || 'stopped'}
      />

      {/* Phase 2: Interactive Terminal & Real-time Stats Modal */}
      <TerminalStatsModal
        isOpen={!!selectedInstanceForTerminalStats}
        onClose={() => setSelectedInstanceForTerminalStats(null)}
        instanceId={selectedInstanceForTerminalStats?.instance._id || null}
        instanceName={selectedInstanceForTerminalStats?.instance.name || ''}
        template={selectedInstanceForTerminalStats?.instance.template || 'nodejs'}
        status={selectedInstanceForTerminalStats?.instance.status || 'stopped'}
        initialTab={selectedInstanceForTerminalStats?.tab || 'stats'}
      />
    </div>
  );
};
