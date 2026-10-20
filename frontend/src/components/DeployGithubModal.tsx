import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Zap,
  Loader2,
  AlertCircle,
  Plus,
  Code2,
  Terminal,
  Globe,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Box,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

interface EnvVar {
  key: string;
  value: string;
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

interface DeployGithubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeployGithub: (data: any) => Promise<void>;
  quota: ComputeQuota | null;
  isDeploying: boolean;
}

export const TEMPLATE_PRESETS = [
  {
    id: 'nextjs',
    name: 'Next.js',
    subtitle: 'Fullstack / React SSR',
    icon: <Code2 className="w-4 h-4 text-white" />,
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    port: 3000,
    badge: 'Fullstack',
    color: '#000000',
    keywords: ['next', 'nextjs'],
  },
  {
    id: 'react',
    name: 'React / Vite',
    subtitle: 'Frontend SPA / Vue',
    icon: <Globe className="w-4 h-4 text-cyan-400" />,
    buildCommand: 'npm run build',
    startCommand: 'npx serve -s dist -l 3000',
    port: 3000,
    badge: 'Frontend',
    color: '#0891b2',
    keywords: ['react', 'vite', 'vue', 'frontend', 'client', 'ui', 'tailwind', 'spa'],
  },
  {
    id: 'nodejs',
    name: 'Node Express',
    subtitle: 'REST API / Fastify',
    icon: <Terminal className="w-4 h-4 text-emerald-400" />,
    buildCommand: 'npm install',
    startCommand: 'node index.js',
    port: 5000,
    badge: 'Backend',
    color: '#059669',
    keywords: ['express', 'node', 'nodejs', 'nest', 'backend', 'server', 'api'],
  },
  {
    id: 'python',
    name: 'Python',
    subtitle: 'FastAPI / Flask / Django',
    icon: <Sparkles className="w-4 h-4 text-amber-400" />,
    buildCommand: 'pip install -r requirements.txt',
    startCommand: 'uvicorn main:app --host 0.0.0.0 --port 8000',
    port: 8000,
    badge: 'AI & API',
    color: '#d97706',
    keywords: ['fastapi', 'flask', 'django', 'python', 'py', 'uvicorn', 'ai', 'ml', 'langchain'],
  },
  {
    id: 'go',
    name: 'Go (Golang)',
    subtitle: 'High-perf Microservice',
    icon: <Zap className="w-4 h-4 text-sky-400" />,
    buildCommand: 'go build -o main .',
    startCommand: './main',
    port: 8080,
    badge: 'Microservice',
    color: '#0284c7',
    keywords: ['go', 'golang', 'gin', 'fiber', 'microservice'],
  },
  {
    id: 'docker',
    name: 'Docker',
    subtitle: 'Universal Any Language',
    icon: <Box className="w-4 h-4 text-blue-400" />,
    buildCommand: 'docker build -t app .',
    startCommand: 'docker run -p 8080:8080 app',
    port: 8080,
    badge: 'Universal',
    color: '#2563eb',
    keywords: ['docker', 'dockerfile', 'compose', 'container'],
  },
];

export const DeployGithubModal: React.FC<DeployGithubModalProps> = ({
  isOpen,
  onClose,
  onDeployGithub,
  quota,
  isDeploying,
}) => {
  const [name, setName] = useState('');
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [selectedPresetId, setSelectedPresetId] = useState('nextjs');
  const [buildCommand, setBuildCommand] = useState('npm run build');
  const [startCommand, setStartCommand] = useState('npm start');
  const [customPort, setCustomPort] = useState<number | ''>('');
  const [rootDirectory, setRootDirectory] = useState('');
  const [envVars, setEnvVars] = useState<EnvVar[]>([{ key: '', value: '' }]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoDetectedBadge, setAutoDetectedBadge] = useState<string | null>(null);
  const [error, setError] = useState('');

  const addEnvVar = () => setEnvVars((prev) => [...prev, { key: '', value: '' }]);
  const removeEnvVar = (i: number) => setEnvVars((prev) => prev.filter((_, idx) => idx !== i));
  const updateEnvVar = (i: number, field: 'key' | 'value', val: string) => {
    setEnvVars((prev) => prev.map((e, idx) => (idx === i ? { ...e, [field]: val } : e)));
  };

  const handleApplyPreset = (preset: typeof TEMPLATE_PRESETS[0], isAuto = false) => {
    setSelectedPresetId(preset.id);
    setBuildCommand(preset.buildCommand);
    setStartCommand(preset.startCommand);
    // Keep customPort empty so Master EC2 automatically allocates next free collision-free port
    if (!name) {
      setName(`my-${preset.id}-app`);
    }
    if (!isAuto) {
      setAutoDetectedBadge(null);
    }
  };

  // Helper to parse complex GitHub URLs (including /tree/branch/subfolder)
  const parseGitHubUrl = (inputUrl: string) => {
    const trimmed = inputUrl.trim().replace(/\/$/, '');
    const match = trimmed.match(/^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/tree\/([a-zA-Z0-9_.-]+)(?:\/(.*))?)?$/);
    if (!match) return null;
    const owner = match[1];
    const repo = match[2].replace(/\.git$/, '');
    const branch = match[3] || null;
    const subfolder = match[4] || null;
    return {
      cleanRepoUrl: `https://github.com/${owner}/${repo}`,
      branch,
      subfolder,
      repo,
    };
  };

  // Vercel-Style Smart Auto Detection based on URL keywords and subfolders
  const handleRepoUrlChange = (url: string) => {
    setGithubRepoUrl(url);

    const parsed = parseGitHubUrl(url);
    if (parsed) {
      if (parsed.branch) {
        setGithubBranch(parsed.branch);
      }
      if (parsed.subfolder) {
        setRootDirectory(parsed.subfolder);
        setName(parsed.subfolder.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
      } else {
        setName(parsed.repo.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
      }
    } else {
      // Fallback extraction
      const clean = url.trim().replace(/\/$/, '');
      const parts = clean.split('/');
      const repoSlug = parts[parts.length - 1];
      if (repoSlug && !repoSlug.includes('github.com')) {
        const sanitizedName = repoSlug.replace(/\.git$/, '').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
        setName(sanitizedName);
      }
    }

    // Auto-detect framework preset
    const lower = url.toLowerCase();
    for (const preset of TEMPLATE_PRESETS) {
      if (preset.keywords.some((k) => lower.includes(k))) {
        handleApplyPreset(preset, true);
        setAutoDetectedBadge(preset.name);
        return;
      }
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) {
      setError('Application name is required.');
      return;
    }
    if (!githubRepoUrl.trim()) {
      setError('GitHub Repository URL is required.');
      return;
    }

    const parsed = parseGitHubUrl(githubRepoUrl.trim());
    if (!parsed) {
      setError('Invalid GitHub URL. Must be in format: https://github.com/username/repository');
      return;
    }

    const cleanRepoUrl = parsed.cleanRepoUrl;
    const effectiveBranch = (githubBranch.trim() && githubBranch.trim() !== 'main')
      ? githubBranch.trim()
      : (parsed.branch || githubBranch.trim() || 'main');
    const effectiveRootDir = rootDirectory.trim() || parsed.subfolder || undefined;

    const filteredEnv = envVars.filter((e) => e.key.trim() && e.value.trim());

    await onDeployGithub({
      name: name.trim(),
      template: selectedPresetId,
      githubRepoUrl: cleanRepoUrl,
      githubBranch: effectiveBranch,
      buildCommand: buildCommand.trim(),
      startCommand: startCommand.trim(),
      rootDirectory: effectiveRootDir,
      envVars: filteredEnv,
      customPort: customPort ? Number(customPort) : undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] my-auto flex flex-col overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 shrink-0 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                <GithubIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">Deploy from GitHub</h2>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#c8f542]/25 text-slate-900 border border-[#c8f542]">
                    Zero-Config PaaS
                  </span>
                </div>
                {quota && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Plan: <span className="font-semibold text-slate-700">{quota.planName}</span> ·{' '}
                    {quota.usedInstances}/{quota.maxInstances} instances active
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {/* Step 1: GitHub Repo URL with Auto-Detection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <GithubIcon className="w-3.5 h-3.5" />
                  GitHub Repository URL <span className="text-rose-500">*</span>
                </label>
                {autoDetectedBadge && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 animate-fadeIn">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Auto-Detected: {autoDetectedBadge}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="url"
                  required
                  value={githubRepoUrl}
                  onChange={(e) => handleRepoUrlChange(e.target.value)}
                  placeholder="https://github.com/username/my-awesome-app"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c8f542] focus:border-slate-400 transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Enter any public GitHub repo. Framework, dependencies, and build steps will be automatically configured.
              </p>
            </div>

            {/* Step 2: Visual Framework Presets (1-Click Selector) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Select Project Framework / Runtime
                </label>
                <span className="text-[11px] text-slate-400">Click to switch preset</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TEMPLATE_PRESETS.map((p) => {
                  const isSelected = selectedPresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className={`relative flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                          : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white text-slate-800'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'bg-white/10' : 'bg-slate-900'
                        }`}
                      >
                        {p.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {p.name}
                          </span>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#c8f542] animate-pulse" />
                          )}
                        </div>
                        <span className={`text-[10px] block truncate ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                          {p.subtitle}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: App Name & Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                  Application Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. my-production-api"
                  maxLength={40}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c8f542] focus:border-slate-400 transition"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                  Git Branch
                </label>
                <input
                  type="text"
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c8f542] focus:border-slate-400 transition"
                />
              </div>
            </div>

            {/* Step 4: Collapsible Advanced Settings (Beginner Friendly, Power User Ready) */}
            <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/40">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100/60 transition"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span>Advanced Configuration</span>
                  <span className="text-[10px] font-normal text-slate-400">(Build Command, Port, Root Dir, Env Vars)</span>
                </div>
                {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 pt-0 space-y-4 border-t border-slate-200/80"
                  >
                    {/* Root Directory & Custom Port */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                          Root Directory (Monorepo)
                        </label>
                        <input
                          type="text"
                          value={rootDirectory}
                          onChange={(e) => setRootDirectory(e.target.value)}
                          placeholder="./ or /frontend or /backend"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Leave blank for root of repository</span>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                          Port Allocation Override
                        </label>
                        <input
                          type="number"
                          value={customPort}
                          onChange={(e) => setCustomPort(e.target.value ? Number(e.target.value) : '')}
                          placeholder="Auto-assigned (e.g. 3001, 3002...)"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Auto-assigns zero-collision port on Master EC2</span>
                      </div>
                    </div>

                    {/* Build & Start Command Overrides */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                          Build Command Override
                        </label>
                        <input
                          type="text"
                          value={buildCommand}
                          onChange={(e) => setBuildCommand(e.target.value)}
                          placeholder="npm run build"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                          Start Command Override
                        </label>
                        <input
                          type="text"
                          value={startCommand}
                          onChange={(e) => setStartCommand(e.target.value)}
                          placeholder="npm start"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                    </div>

                    {/* Environment Variables */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Environment Variables & Secrets
                        </label>
                        <button
                          type="button"
                          onClick={addEnvVar}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Variable
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {envVars.map((ev, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={ev.key}
                              onChange={(e) => updateEnvVar(i, 'key', e.target.value)}
                              placeholder="KEY (e.g. DATABASE_URL)"
                              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                            <span className="text-slate-400 text-xs">=</span>
                            <input
                              type="text"
                              value={ev.value}
                              onChange={(e) => updateEnvVar(i, 'value', e.target.value)}
                              placeholder="Value"
                              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() => removeEnvVar(i)}
                              className="p-1 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/70 shrink-0">
            <button
              onClick={onClose}
              disabled={isDeploying}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isDeploying || !name.trim() || !githubRepoUrl.trim()}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-[#c8f542] font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-lg shadow-slate-900/10"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deploying to EC2...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" /> Deploy Application
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
