import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Terminal as TerminalIcon,
  Activity,
  Cpu,
  Clock,
  Wifi,
  Trash2,
  Send,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useAuth } from '../context/AuthContext';

interface TerminalOutput {
  id: string;
  command: string;
  stdout: string;
  stderr?: string;
  exitCode: number;
  timestamp: string;
}

interface StatPoint {
  timestamp: string;
  timeLabel: string;
  cpuPercent: number;
  ramUsedMb: number;
  ramPercent: number;
  networkInKb: number;
  networkOutKb: number;
}

interface TerminalStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string | null;
  instanceName: string;
  template: string;
  status: string;
  initialTab?: 'stats' | 'terminal';
}

const API_BASE = 'http://localhost:5000/api/v1';

export const TerminalStatsModal: React.FC<TerminalStatsModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  instanceName,
  template,
  status,
  initialTab = 'stats',
}) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'terminal'>(initialTab);

  // Sync tab if initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // ===========================================================================
  // Telemetry & Stats State
  // ===========================================================================
  const [statsHistory, setStatsHistory] = useState<StatPoint[]>([]);
  const [uptimeStart, setUptimeStart] = useState<string | null>(null);
  const [liveUptime, setLiveUptime] = useState<string>('00:00:00');
  const [vCpu, setVCpu] = useState<number>(1);
  const [ramTotalMb, setRamTotalMb] = useState<number>(1024);
  const [currentCpu, setCurrentCpu] = useState<number>(0);
  const [currentRamMb, setCurrentRamMb] = useState<number>(0);
  const [currentRamPercent, setCurrentRamPercent] = useState<number>(0);
  const [netInKb, setNetInKb] = useState<number>(0);
  const [netOutKb, setNetOutKb] = useState<number>(0);
  const [_isStatsLoading, setIsStatsLoading] = useState(true);

  // ===========================================================================
  // Terminal State
  // ===========================================================================
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [terminalOutputs, setTerminalOutputs] = useState<TerminalOutput[]>([]);
  const [isExecRunning, setIsExecRunning] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const terminalInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch telemetry history
  const fetchStatsHistory = useCallback(async () => {
    if (!instanceId || !token) return;
    try {
      const res = await fetch(`${API_BASE}/compute/${instanceId}/stats/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatsHistory(data.history || []);
        if (data.uptimeStart) setUptimeStart(data.uptimeStart);
        if (data.vCpu) setVCpu(data.vCpu);
        if (data.ramTotalMb) setRamTotalMb(data.ramTotalMb);
        if (data.current) {
          setCurrentCpu(data.current.cpuUsagePercent || 0);
          setCurrentRamMb(data.current.ramUsedMb || 0);
          setCurrentRamPercent(data.current.ramPercent || 0);
          setNetInKb(data.current.networkInKb || 0);
          setNetOutKb(data.current.networkOutKb || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching stats history:', err);
    } finally {
      setIsStatsLoading(false);
    }
  }, [instanceId, token]);

  // Initial stats fetch & polling every 2.5s
  useEffect(() => {
    if (!isOpen || !instanceId) return;
    fetchStatsHistory();

    const interval = setInterval(() => {
      fetchStatsHistory();
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, instanceId, fetchStatsHistory]);

  // Live Uptime ticker ticking every 1000ms
  useEffect(() => {
    if (!isOpen) return;

    const tick = () => {
      if (!uptimeStart || status !== 'running') {
        setLiveUptime('—');
        return;
      }
      const diffMs = Date.now() - new Date(uptimeStart).getTime();
      if (diffMs < 0) {
        setLiveUptime('00:00:00');
        return;
      }
      const s = Math.floor(diffMs / 1000);
      const days = Math.floor(s / 86400);
      const hours = Math.floor((s % 86400) / 3600);
      const minutes = Math.floor((s % 3600) / 60);
      const seconds = s % 60;

      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      if (days > 0) {
        setLiveUptime(`${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
      } else {
        setLiveUptime(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isOpen, uptimeStart, status]);

  // Terminal scroll to bottom
  useEffect(() => {
    if (activeTab === 'terminal' && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalOutputs, activeTab]);

  // Focus terminal input when tab switches
  useEffect(() => {
    if (activeTab === 'terminal') {
      setTimeout(() => {
        terminalInputRef.current?.focus();
      }, 150);
    }
  }, [activeTab]);

  // Send terminal command
  const handleExecCommand = async (customCmd?: string) => {
    const cmdToRun = customCmd !== undefined ? customCmd : commandInput;
    if (!cmdToRun.trim() || !instanceId || !token || isExecRunning) return;

    const trimmed = cmdToRun.trim();

    // Check for clear command
    if (trimmed.toLowerCase() === 'clear') {
      setTerminalOutputs([]);
      setCommandInput('');
      return;
    }

    // Add to history
    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setCommandInput('');
    setIsExecRunning(true);

    try {
      const res = await fetch(`${API_BASE}/compute/${instanceId}/exec`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command: trimmed }),
      });

      const data = await res.json();
      setTerminalOutputs((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          command: trimmed,
          stdout: data.stdout || '',
          stderr: data.stderr || '',
          exitCode: data.exitCode ?? (res.ok ? 0 : 1),
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch {
      setTerminalOutputs((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          command: trimmed,
          stdout: '',
          stderr: 'Connection error: failed to communicate with container daemon.',
          exitCode: 1,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsExecRunning(false);
      setTimeout(() => {
        terminalInputRef.current?.focus();
      }, 50);
    }
  };

  // History navigation with Arrow keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCommandInput(commandHistory[nextIndex] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setCommandInput('');
      } else {
        setHistoryIndex(nextIndex);
        setCommandInput(commandHistory[nextIndex] || '');
      }
    }
  };

  if (!isOpen) return null;

  // Peak CPU
  const peakCpu = statsHistory.reduce((max, p) => Math.max(max, p.cpuPercent), 0);
  const avgCpu =
    statsHistory.length > 0
      ? Math.round(statsHistory.reduce((acc, p) => acc + p.cpuPercent, 0) / statsHistory.length)
      : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 md:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-[#0b0f17] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden text-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0f1422] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-[#c8f542] shadow-sm">
                {activeTab === 'stats' ? <Activity className="w-5 h-5" /> : <TerminalIcon className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">{instanceName}</h2>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {template}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      status === 'running'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    {status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {vCpu} vCPU · {ramTotalMb >= 1024 ? `${ramTotalMb / 1024}GB` : `${ramTotalMb}MB`} RAM · Linux
                  container
                </p>
              </div>
            </div>

            {/* Tab switchers + Close */}
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'stats'
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Real-time Stats
                </button>
                <button
                  onClick={() => setActiveTab('terminal')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'terminal'
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TerminalIcon className="w-3.5 h-3.5" />
                  Interactive Terminal
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ================================================================= */}
          {/* TAB 1: Real-time Stats & Telemetry */}
          {/* ================================================================= */}
          {activeTab === 'stats' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#080b11]">
              {/* Top Row: Digital Uptime Clock & Core KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Live Uptime Ticker */}
                <div className="bg-[#0f1422] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Live Uptime
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  </div>
                  <div className="text-xl md:text-2xl font-mono font-bold text-white tracking-wider my-1">
                    {liveUptime}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Started: {uptimeStart ? new Date(uptimeStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </div>
                </div>

                {/* CPU Usage Card */}
                <div className="bg-[#0f1422] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Cpu className="w-3.5 h-3.5 text-blue-400" />
                      CPU Utilization
                    </span>
                    <span className="text-[11px] text-slate-400">{vCpu} vCPU</span>
                  </div>
                  <div className="flex items-baseline gap-2 my-1">
                    <span className="text-2xl font-mono font-bold text-white">{currentCpu}%</span>
                    <span className="text-xs text-slate-400 font-mono">avg {avgCpu}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        currentCpu > 80 ? 'bg-rose-500' : currentCpu > 50 ? 'bg-amber-400' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, currentCpu)}%` }}
                    />
                  </div>
                </div>

                {/* RAM Usage Card */}
                <div className="bg-[#0f1422] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Activity className="w-3.5 h-3.5 text-purple-400" />
                      Memory (RAM)
                    </span>
                    <span className="text-[11px] text-slate-400">{currentRamPercent}%</span>
                  </div>
                  <div className="flex items-baseline gap-2 my-1">
                    <span className="text-2xl font-mono font-bold text-white">{currentRamMb} MB</span>
                    <span className="text-xs text-slate-400 font-mono">/ {ramTotalMb} MB</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, (currentRamMb / ramTotalMb) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Network Bandwidth */}
                <div className="bg-[#0f1422] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                      Network Throughput
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">
                      Live
                    </span>
                  </div>
                  <div className="flex items-center justify-between my-1">
                    <div>
                      <div className="text-xs text-slate-400">Inbound</div>
                      <div className="text-base font-mono font-bold text-white">{netInKb} KB/s</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Outbound</div>
                      <div className="text-base font-mono font-bold text-white">{netOutKb} KB/s</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500">Virtual bridge eth0: 10.244.0.18</div>
                </div>
              </div>

              {/* Real-time Graphs Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* CPU Real-time Area Chart */}
                <div className="bg-[#0f1422] border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-bold text-white">CPU Utilization (%)</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Real-time sliding window (last 80 seconds)</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-blue-400">Peak: {peakCpu}%</div>
                      <div className="text-[10px] text-slate-500">Threshold: 80%</div>
                    </div>
                  </div>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={statsHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="timeLabel"
                          stroke="#475569"
                          fontSize={10}
                          tickLine={false}
                          interval={4}
                        />
                        <YAxis
                          domain={[0, 100]}
                          stroke="#475569"
                          fontSize={10}
                          tickLine={false}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '0.75rem',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                          formatter={(value: any) => [`${value}%`, 'CPU Usage']}
                        />
                        <ReferenceLine y={80} stroke="#f43f5e" strokeDasharray="3 3" opacity={0.6} />
                        <Area
                          type="monotone"
                          dataKey="cpuPercent"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#cpuGradient)"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* RAM Real-time Area Chart */}
                <div className="bg-[#0f1422] border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-bold text-white">Memory Allocation (MB)</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Used memory vs total allocated capacity</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-purple-400">
                        {currentRamMb} / {ramTotalMb} MB
                      </div>
                      <div className="text-[10px] text-slate-500">Cap: {ramTotalMb} MB</div>
                    </div>
                  </div>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={statsHistory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="timeLabel"
                          stroke="#475569"
                          fontSize={10}
                          tickLine={false}
                          interval={4}
                        />
                        <YAxis
                          domain={[0, ramTotalMb]}
                          stroke="#475569"
                          fontSize={10}
                          tickLine={false}
                          tickFormatter={(v) => `${v}M`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '0.75rem',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                          formatter={(value: any) => [`${value} MB`, 'RAM Used']}
                        />
                        <ReferenceLine y={ramTotalMb} stroke="#a855f7" strokeDasharray="3 3" opacity={0.6} />
                        <Area
                          type="monotone"
                          dataKey="ramUsedMb"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#ramGradient)"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* System Details Footer Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#0f1422] border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Kernel Architecture</div>
                  <div className="text-xs font-mono font-medium text-white mt-1">Linux 5.15.0-aws x86_64</div>
                </div>
                <div className="bg-[#0f1422] border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Container Runtime</div>
                  <div className="text-xs font-mono font-medium text-white mt-1">containerd v1.7 / runc</div>
                </div>
                <div className="bg-[#0f1422] border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Swap Memory</div>
                  <div className="text-xs font-mono font-medium text-white mt-1">2048 MB (Virtual)</div>
                </div>
                <div className="bg-[#0f1422] border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Storage Quota</div>
                  <div className="text-xs font-mono font-medium text-white mt-1">40 GB NVMe SSD</div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: Interactive Terminal (Web CLI) */}
          {/* ================================================================= */}
          {activeTab === 'terminal' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#070a10]">
              {/* Quick Action Command Buttons */}
              <div className="px-5 py-2.5 border-b border-slate-800/80 bg-[#0c101a] flex items-center gap-2 overflow-x-auto shrink-0 select-none">
                <span className="text-[11px] font-semibold text-slate-400 shrink-0">Quick Run:</span>
                {[
                  { cmd: 'top', label: 'top' },
                  { cmd: 'free -m', label: 'free -m' },
                  { cmd: 'uptime', label: 'uptime' },
                  { cmd: 'ps aux', label: 'ps aux' },
                  { cmd: 'df -h', label: 'df -h' },
                  { cmd: 'netstat -tlpn', label: 'netstat' },
                  { cmd: 'env', label: 'env' },
                  { cmd: 'uname -a', label: 'uname' },
                  { cmd: 'help', label: 'help' },
                ].map((item) => (
                  <button
                    key={item.cmd}
                    onClick={() => handleExecCommand(item.cmd)}
                    disabled={isExecRunning || status !== 'running'}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {item.label}
                  </button>
                ))}

                <button
                  onClick={() => setTerminalOutputs([])}
                  className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Clear terminal screen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Terminal Viewport */}
              <div className="flex-1 p-5 overflow-y-auto font-mono text-xs space-y-4 select-text">
                {/* Welcome message */}
                <div className="text-slate-400 space-y-1 pb-2 border-b border-slate-800/60">
                  <div className="text-[#c8f542] font-bold">
                    Connected to {instanceName} (runtime: {template})
                  </div>
                  <div>Linux ts-{instanceName.toLowerCase()} 5.15.0-1048-aws #53-Ubuntu SMP x86_64</div>
                  <div className="text-slate-400">
                    Type <span className="text-white font-semibold">help</span> to view available commands, or click
                    any quick run button above.
                  </div>
                  {status !== 'running' && (
                    <div className="text-amber-400 font-semibold pt-1">
                      ⚠️ Instance is currently {status.toUpperCase()}. Start instance to execute commands.
                    </div>
                  )}
                </div>

                {/* Executed command history output blocks */}
                {terminalOutputs.map((item) => (
                  <div key={item.id} className="space-y-1.5">
                    {/* Command Prompt Line */}
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-[#c8f542] font-semibold">root@ts-{instanceName.toLowerCase()}</span>
                      <span className="text-slate-400">:</span>
                      <span className="text-blue-400">~#</span>
                      <span className="text-white font-bold">{item.command}</span>
                      <span className="text-[10px] text-slate-600 ml-auto select-none">{item.timestamp}</span>
                    </div>

                    {/* Stdout Output */}
                    {item.stdout && (
                      <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed pl-2 font-mono">
                        {item.stdout}
                      </pre>
                    )}

                    {/* Stderr Output */}
                    {item.stderr && (
                      <pre className="text-rose-400 whitespace-pre-wrap leading-relaxed pl-2 font-mono">
                        {item.stderr}
                      </pre>
                    )}
                  </div>
                ))}

                <div ref={terminalEndRef} />
              </div>

              {/* Terminal Input Prompt */}
              <div className="p-3 border-t border-slate-800/80 bg-[#0c101a] flex items-center gap-2 shrink-0">
                <span className="text-[#c8f542] font-mono text-xs font-semibold pl-2">
                  root@ts-{instanceName.toLowerCase()}:~#
                </span>
                <input
                  ref={terminalInputRef}
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isExecRunning || status !== 'running'}
                  placeholder={
                    status === 'running'
                      ? 'Type shell command (e.g., top, free -m, uptime)...'
                      : 'Instance stopped. Start instance to enable shell.'
                  }
                  className="flex-1 bg-transparent border-none text-xs font-mono text-white placeholder-slate-400 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => handleExecCommand()}
                  disabled={!commandInput.trim() || isExecRunning || status !== 'running'}
                  className="px-3 py-1.5 bg-[#c8f542] hover:bg-[#b5e032] disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition"
                >
                  <Send className="w-3 h-3" />
                  Run
                </button>
              </div>
            </div>
          )}

          {/* Footer Bar */}
          <div className="px-6 py-2.5 border-t border-slate-800/80 bg-[#0f1422] flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Telemetry Synchronized
              </span>
              <span>·</span>
              <span>Refresh: 2.5s</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-mono">Press Esc to close</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
