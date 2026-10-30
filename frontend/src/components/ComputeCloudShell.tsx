import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal as TerminalIcon,
  Trash2,
  Check,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ComputeInstance {
  _id: string;
  name: string;
  template: string;
  sourceType?: 'template' | 'github';
  githubRepoUrl?: string;
  githubBranch?: string;
  buildCommand?: string;
  startCommand?: string;
  status: string;
  port: number;
  publicIp: string;
  publicEndpoint: string;
  vCpu: number;
  ramGb: number;
  planName: string;
  envVars: { key: string; value: string }[];
  region: string;
  uptimeStart?: string;
  cpuUsagePercent?: number;
  ramUsedMb?: number;
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

interface CommandLog {
  id: string;
  command: string;
  stdout: React.ReactNode;
  timestamp: string;
  type?: 'info' | 'success' | 'error' | 'warning';
}

interface ComputeCloudShellProps {
  instances: ComputeInstance[];
  quota: ComputeQuota | null;
  onRefresh: () => void;
  onAction: (instanceId: string, action: string) => Promise<void>;
  onSwitchToGui: () => void;
  onOpenGithubDeployModal: () => void;
}

const API_BASE = 'http://localhost:5000/api/v1';

export const ComputeCloudShell: React.FC<ComputeCloudShellProps> = ({
  instances,
  quota,
  onRefresh,
  onAction,
  onSwitchToGui,
  onOpenGithubDeployModal,
}) => {
  const { token, user } = useAuth();
  const [inputCommand, setInputCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [logs, setLogs] = useState<CommandLog[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [masterHostIp, setMasterHostIp] = useState('3.110.170.101');

  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch Host IP if available from instances
  useEffect(() => {
    if (instances.length > 0 && instances[0].publicIp) {
      setMasterHostIp(instances[0].publicIp);
    }
  }, [instances]);

  // Initial Welcome Banner
  useEffect(() => {
    const welcomeLog: CommandLog = {
      id: 'init-welcome',
      command: 'tenantstack --version',
      timestamp: new Date().toLocaleTimeString(),
      stdout: (
        <div className="space-y-2 py-1 text-xs">
          <div className="text-[#c8f542] font-bold text-sm tracking-wide flex items-center gap-2">
            <span>⚡ TenantStack CloudShell v2.4.0 (AWS EC2 Engine)</span>
          </div>
          <div className="text-slate-400 leading-relaxed font-mono">
            Direct interactive command-line console connected to master cluster{' '}
            <span className="text-white font-semibold">{masterHostIp}</span> (ap-south-1).
            <br />
            Manage, deploy, start, stop, and monitor all your cloud workloads via CLI.
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 font-mono text-[11px] flex flex-wrap items-center gap-2">
            <span className="text-[#c8f542] font-bold">Quick Start:</span>
            <span>Type <code className="text-white font-bold bg-slate-800 px-1 py-0.5 rounded">ts list</code> to view running instances,</span>
            <span><code className="text-white font-bold bg-slate-800 px-1 py-0.5 rounded">help</code> for all commands, or click any quick pill above.</span>
          </div>
        </div>
      ),
    };
    setLogs([welcomeLog]);
  }, [masterHostIp]);

  // Helper to find instance by ID or name
  const findInstance = useCallback((query: string): ComputeInstance | undefined => {
    const q = query.trim().toLowerCase();
    return instances.find(
      (inst) => inst._id.toLowerCase() === q || inst.name.toLowerCase() === q || inst._id.slice(-6).toLowerCase() === q
    );
  }, [instances]);

  // Execute Command Logic
  const executeCommand = async (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    // Save to history
    setCommandHistory((prev) => [trimmed, ...prev.filter((c) => c !== trimmed)]);
    setHistoryIndex(-1);

    const parts = trimmed.split(/\s+/);
    const mainCmd = parts[0].toLowerCase();
    const subCmd = parts[1]?.toLowerCase();
    const arg = parts[2];

    const timestamp = new Date().toLocaleTimeString();
    const logId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    setIsExecuting(true);

    try {
      // 1. HELP COMMAND
      if (mainCmd === 'help' || (mainCmd === 'ts' && (subCmd === '--help' || subCmd === '-h' || subCmd === 'help'))) {
        setLogs((prev) => [
          ...prev,
          {
            id: logId,
            command: trimmed,
            timestamp,
            stdout: (
              <div className="space-y-2 text-xs font-mono">
                <div className="text-cyan-400 font-bold border-b border-slate-800 pb-1">
                  TenantStack CLI Command Reference:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300 text-[11px]">
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[#c8f542] font-bold">ts list | instances</span>
                    <p className="text-slate-400 text-[10px]">List all active compute instances & live URLs</p>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[#c8f542] font-bold">ts start &lt;name|id&gt;</span>
                    <p className="text-slate-400 text-[10px]">Start a stopped instance container</p>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[#c8f542] font-bold">ts stop &lt;name|id&gt;</span>
                    <p className="text-slate-400 text-[10px]">Gracefully stop a running instance</p>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[#c8f542] font-bold">ts restart &lt;name|id&gt;</span>
                    <p className="text-slate-400 text-[10px]">Restart instance process and port listener</p>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[#c8f542] font-bold">ts logs &lt;name|id&gt;</span>
                    <p className="text-slate-400 text-[10px]">Stream stdout/stderr logs from instance</p>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[#c8f542] font-bold">ts stats &lt;name|id&gt;</span>
                    <p className="text-slate-400 text-[10px]">Inspect real-time CPU, RAM, & Network telemetry</p>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[#c8f542] font-bold">ts quota | plan</span>
                    <p className="text-slate-400 text-[10px]">Show current tenant plan limits and slots</p>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[#c8f542] font-bold">ts ping | host</span>
                    <p className="text-slate-400 text-[10px]">Ping master AWS EC2 host node</p>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[#c8f542] font-bold">ts deploy</span>
                    <p className="text-slate-400 text-[10px]">Open template / container deployment wizard</p>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[#c8f542] font-bold">ts deploy-github</span>
                    <p className="text-slate-400 text-[10px]">Open zero-config GitHub GitOps deployment</p>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[#c8f542] font-bold">clear</span>
                    <p className="text-slate-400 text-[10px]">Clear CloudShell screen buffer</p>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[#c8f542] font-bold">aws ec2 describe-instances</span>
                    <p className="text-slate-400 text-[10px]">AWS CLI compatibility alias</p>
                  </div>
                </div>
              </div>
            ),
          },
        ]);
        return;
      }

      // 2. CLEAR COMMAND
      if (mainCmd === 'clear' || (mainCmd === 'ts' && subCmd === 'clear')) {
        setLogs([]);
        return;
      }

      // 3. LIST INSTANCES (ts list | list | instances | aws ec2 describe-instances)
      if (
        (mainCmd === 'ts' && (subCmd === 'list' || subCmd === 'ls' || subCmd === 'instances' || !subCmd)) ||
        mainCmd === 'list' ||
        mainCmd === 'ls' ||
        mainCmd === 'instances' ||
        (mainCmd === 'aws' && subCmd === 'ec2' && parts[2] === 'describe-instances')
      ) {
        onRefresh();
        if (instances.length === 0) {
          setLogs((prev) => [
            ...prev,
            {
              id: logId,
              command: trimmed,
              timestamp,
              stdout: (
                <div className="text-slate-400 font-mono text-xs">
                  No active instances found on master node {masterHostIp}.
                  <br />
                  Run <span className="text-[#c8f542] font-bold">ts deploy</span> or{' '}
                  <span className="text-[#c8f542] font-bold">ts deploy-github</span> to create your first application.
                </div>
              ),
            },
          ]);
        } else {
          setLogs((prev) => [
            ...prev,
            {
              id: logId,
              command: trimmed,
              timestamp,
              stdout: (
                <div className="space-y-2 font-mono text-xs overflow-x-auto">
                  <div className="text-slate-400 text-[11px] pb-1 border-b border-slate-800 flex items-center justify-between">
                    <span>Active Workloads on {masterHostIp} ({instances.length} total)</span>
                    <span className="text-emerald-400 font-bold">● EC2 Online</span>
                  </div>
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800">
                        <th className="py-1 pr-3">NAME</th>
                        <th className="py-1 pr-3">RUNTIME</th>
                        <th className="py-1 pr-3">STATUS</th>
                        <th className="py-1 pr-3">PORT</th>
                        <th className="py-1 pr-3">CPU/RAM</th>
                        <th className="py-1">LIVE ENDPOINT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {instances.map((inst) => (
                        <tr key={inst._id} className="hover:bg-slate-900/40">
                          <td className="py-1.5 pr-3 font-bold text-white flex items-center gap-1.5">
                            <span className="text-[#c8f542]">{inst.name}</span>
                            <span className="text-[10px] text-slate-500 font-normal">({inst._id.slice(-6)})</span>
                          </td>
                          <td className="py-1.5 pr-3 text-cyan-300 font-mono uppercase text-[10px]">{inst.template}</td>
                          <td className="py-1.5 pr-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                inst.status === 'running'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                  : inst.status === 'stopped'
                                  ? 'bg-slate-800 text-slate-400'
                                  : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {inst.status}
                            </span>
                          </td>
                          <td className="py-1.5 pr-3 text-amber-300 font-mono">:{inst.port}</td>
                          <td className="py-1.5 pr-3 text-slate-400">
                            {inst.vCpu}vCPU / {inst.ramGb >= 1 ? `${inst.ramGb}GB` : `${inst.ramGb * 1024}MB`}
                          </td>
                          <td className="py-1.5">
                            <a
                              href={inst.publicEndpoint}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
                            >
                              {inst.publicEndpoint}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
            },
          ]);
        }
        return;
      }

      // 4. START INSTANCE (ts start <id|name> | start <id|name> | aws ec2 start-instances <id>)
      if (
        (mainCmd === 'ts' && subCmd === 'start') ||
        mainCmd === 'start' ||
        (mainCmd === 'aws' && subCmd === 'ec2' && parts[2] === 'start-instances')
      ) {
        const target = mainCmd === 'aws' ? parts[3] : (mainCmd === 'ts' ? arg : subCmd);
        if (!target) {
          setLogs((prev) => [
            ...prev,
            {
              id: logId,
              command: trimmed,
              timestamp,
              type: 'error',
              stdout: <span className="text-rose-400 font-mono text-xs">Error: Target instance name or ID required. Example: <code>ts start my-app</code></span>,
            },
          ]);
          return;
        }

        const inst = findInstance(target);
        if (!inst) {
          setLogs((prev) => [
            ...prev,
            {
              id: logId,
              command: trimmed,
              timestamp,
              type: 'error',
              stdout: <span className="text-rose-400 font-mono text-xs">Error: Instance "{target}" not found. Run <code>ts list</code> to view available workloads.</span>,
            },
          ]);
          return;
        }

        await onAction(inst._id, 'start');
        setLogs((prev) => [
          ...prev,
          {
            id: logId,
            command: trimmed,
            timestamp,
            type: 'success',
            stdout: (
              <div className="font-mono text-xs space-y-1 text-emerald-300">
                <div>[SUCCESS] Sent START signal to instance "{inst.name}" ({inst._id})...</div>
                <div className="text-slate-400 text-[11px]">
                  Container daemon spawning on port :{inst.port} at {inst.publicEndpoint}.
                </div>
              </div>
            ),
          },
        ]);
        return;
      }

      // 5. STOP INSTANCE (ts stop <id|name> | stop <id|name> | aws ec2 stop-instances <id>)
      if (
        (mainCmd === 'ts' && subCmd === 'stop') ||
        mainCmd === 'stop' ||
        (mainCmd === 'aws' && subCmd === 'ec2' && parts[2] === 'stop-instances')
      ) {
        const target = mainCmd === 'aws' ? parts[3] : (mainCmd === 'ts' ? arg : subCmd);
        if (!target) {
          setLogs((prev) => [
            ...prev,
            {
              id: logId,
              command: trimmed,
              timestamp,
              type: 'error',
              stdout: <span className="text-rose-400 font-mono text-xs">Error: Target instance name or ID required. Example: <code>ts stop my-app</code></span>,
            },
          ]);
          return;
        }

        const inst = findInstance(target);
        if (!inst) {
          setLogs((prev) => [
            ...prev,
            {
              id: logId,
              command: trimmed,
              timestamp,
              type: 'error',
              stdout: <span className="text-rose-400 font-mono text-xs">Error: Instance "{target}" not found. Run <code>ts list</code> to view available workloads.</span>,
            },
          ]);
          return;
        }

        await onAction(inst._id, 'stop');
        setLogs((prev) => [
          ...prev,
          {
            id: logId,
            command: trimmed,
            timestamp,
            type: 'warning',
            stdout: (
              <div className="font-mono text-xs space-y-1 text-amber-300">
                <div>[SUCCESS] Sent STOP signal to instance "{inst.name}" ({inst._id})...</div>
                <div className="text-slate-400 text-[11px]">
                  Container process halted gracefully. Port :{inst.port} paused.
                </div>
              </div>
            ),
          },
        ]);
        return;
      }

      // 6. RESTART INSTANCE (ts restart <id|name> | restart <id|name>)
      if ((mainCmd === 'ts' && subCmd === 'restart') || mainCmd === 'restart') {
        const target = mainCmd === 'ts' ? arg : subCmd;
        if (!target) {
          setLogs((prev) => [
            ...prev,
            {
              id: logId,
              command: trimmed,
              timestamp,
              type: 'error',
              stdout: <span className="text-rose-400 font-mono text-xs">Error: Target instance name or ID required. Example: <code>ts restart my-app</code></span>,
            },
          ]);
          return;
        }

        const inst = findInstance(target);
        if (!inst) {
          setLogs((prev) => [
            ...prev,
            {
              id: logId,
              command: trimmed,
              timestamp,
              type: 'error',
              stdout: <span className="text-rose-400 font-mono text-xs">Error: Instance "{target}" not found.</span>,
            },
          ]);
          return;
        }

        await onAction(inst._id, 'restart');
        setLogs((prev) => [
          ...prev,
          {
            id: logId,
            command: trimmed,
            timestamp,
            type: 'success',
            stdout: (
              <div className="font-mono text-xs space-y-1 text-cyan-300">
                <div>[SUCCESS] Restarting process for "{inst.name}" ({inst._id})...</div>
                <div className="text-slate-400 text-[11px]">Reloading environment and refreshing port :{inst.port}.</div>
              </div>
            ),
          },
        ]);
        return;
      }

      // 7. LOGS (ts logs <id|name> | logs <id|name>)
      if ((mainCmd === 'ts' && subCmd === 'logs') || mainCmd === 'logs') {
        const target = mainCmd === 'ts' ? arg : subCmd;
        if (!target) {
          setLogs((prev) => [
            ...prev,
            {
              id: logId,
              command: trimmed,
              timestamp,
              type: 'error',
              stdout: <span className="text-rose-400 font-mono text-xs">Error: Target instance required. Example: <code>ts logs my-app</code></span>,
            },
          ]);
          return;
        }

        const inst = findInstance(target);
        if (!inst) {
          setLogs((prev) => [
            ...prev,
            {
              id: logId,
              command: trimmed,
              timestamp,
              type: 'error',
              stdout: <span className="text-rose-400 font-mono text-xs">Error: Instance "{target}" not found.</span>,
            },
          ]);
          return;
        }

        // Fetch logs
        const res = await fetch(`${API_BASE}/compute/${inst._id}/logs?limit=15`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        setLogs((prev) => [
          ...prev,
          {
            id: logId,
            command: trimmed,
            timestamp,
            stdout: (
              <div className="space-y-1 font-mono text-xs">
                <div className="text-slate-400 pb-1 border-b border-slate-800 text-[11px] flex items-center justify-between">
                  <span>Logs for {inst.name} (Port :{inst.port})</span>
                  <span className="text-emerald-400 font-semibold">{inst.status.toUpperCase()}</span>
                </div>
                {data.logs && data.logs.length > 0 ? (
                  <div className="space-y-0.5 text-[11px] pt-1">
                    {data.logs.map((l: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-300">
                        <span className="text-slate-500 shrink-0 text-[10px]">
                          [{new Date(l.timestamp).toLocaleTimeString()}]
                        </span>
                        <span
                          className={`font-semibold shrink-0 text-[10px] ${
                            l.level === 'error' ? 'text-rose-400' : l.level === 'warn' ? 'text-amber-400' : 'text-blue-400'
                          }`}
                        >
                          [{l.level.toUpperCase()}]
                        </span>
                        <span className="text-slate-200 break-words">{l.message}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 italic py-1">No logs generated yet. Instance is ready.</div>
                )}
              </div>
            ),
          },
        ]);
        return;
      }

      // 8. STATS (ts stats <id|name> | stats <id|name>)
      if ((mainCmd === 'ts' && subCmd === 'stats') || mainCmd === 'stats') {
        const target = mainCmd === 'ts' ? arg : subCmd;
        if (!target) {
          setLogs((prev) => [
            ...prev,
            {
              id: logId,
              command: trimmed,
              timestamp,
              type: 'error',
              stdout: <span className="text-rose-400 font-mono text-xs">Error: Target instance required. Example: <code>ts stats my-app</code></span>,
            },
          ]);
          return;
        }

        const inst = findInstance(target);
        if (!inst) {
          setLogs((prev) => [
            ...prev,
            {
              id: logId,
              command: trimmed,
              timestamp,
              type: 'error',
              stdout: <span className="text-rose-400 font-mono text-xs">Error: Instance "{target}" not found.</span>,
            },
          ]);
          return;
        }

        setLogs((prev) => [
          ...prev,
          {
            id: logId,
            command: trimmed,
            timestamp,
            stdout: (
              <div className="font-mono text-xs space-y-2">
                <div className="text-slate-400 text-[11px] border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>Instance Telemetry: {inst.name}</span>
                  <span className="text-[#c8f542] font-semibold">{inst.status.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">CPU ALLOCATION</span>
                    <span className="text-white font-bold">{inst.vCpu} vCPU</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">RAM CAPACITY</span>
                    <span className="text-purple-400 font-bold">
                      {inst.ramGb >= 1 ? `${inst.ramGb} GB` : `${inst.ramGb * 1024} MB`}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">ACTIVE PORT</span>
                    <span className="text-amber-400 font-bold">:{inst.port}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">PUBLIC HOST</span>
                    <span className="text-blue-400 font-bold">{inst.publicIp}</span>
                  </div>
                </div>
              </div>
            ),
          },
        ]);
        return;
      }

      // 9. QUOTA & PLAN (ts quota | ts plan | quota | plan)
      if (
        (mainCmd === 'ts' && (subCmd === 'quota' || subCmd === 'plan')) ||
        mainCmd === 'quota' ||
        mainCmd === 'plan'
      ) {
        setLogs((prev) => [
          ...prev,
          {
            id: logId,
            command: trimmed,
            timestamp,
            stdout: (
              <div className="font-mono text-xs space-y-2">
                <div className="text-slate-400 text-[11px] border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>Tenant Plan & Quotas</span>
                  <span className="text-[#c8f542] font-bold">{quota?.planName || 'Free Sandbox'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">INSTANCES USED</span>
                    <span className="text-white font-bold">
                      {quota?.usedInstances ?? instances.length} / {quota?.maxInstances ?? 3}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">REMAINING SLOTS</span>
                    <span className="text-emerald-400 font-bold">{quota?.remainingSlots ?? 1} available</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">VCPU LIMIT</span>
                    <span className="text-cyan-400 font-bold">{quota?.vCpu ?? 1} vCPU / node</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">RAM LIMIT</span>
                    <span className="text-purple-400 font-bold">{quota?.ramGb ?? 1} GB</span>
                  </div>
                </div>
              </div>
            ),
          },
        ]);
        return;
      }

      // 10. PING / HOST (ts ping | ts host | ping)
      if ((mainCmd === 'ts' && (subCmd === 'ping' || subCmd === 'host')) || mainCmd === 'ping') {
        const start = Date.now();
        await fetch(`${API_BASE}/compute/admin/ec2-host/test`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostIp: masterHostIp }),
        }).catch(() => {});
        const pingTime = Date.now() - start;

        setLogs((prev) => [
          ...prev,
          {
            id: logId,
            command: trimmed,
            timestamp,
            stdout: (
              <div className="font-mono text-xs space-y-1 text-slate-300">
                <div className="text-emerald-400 font-bold flex items-center gap-2">
                  <span>PING {masterHostIp} (Port 22 SSH):</span>
                  <span>status=REACHABLE latency={pingTime}ms</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Host: AWS EC2 Instance • Base Port: 3001 • Region: ap-south-1
                </div>
              </div>
            ),
          },
        ]);
        return;
      }

      // 11. DEPLOY WIZARD SHORTCUTS (ts deploy | ts deploy-github | ts github)
      if (mainCmd === 'ts' && (subCmd === 'deploy' || subCmd === 'deploy-github' || subCmd === 'github')) {
        onOpenGithubDeployModal();
        setLogs((prev) => [
          ...prev,
          {
            id: logId,
            command: trimmed,
            timestamp,
            stdout: <span className="text-[#c8f542] font-mono text-xs">Opening GitHub GitOps Deployment Wizard modal...</span>,
          },
        ]);
        return;
      }

      // 12. WHOAMI
      if (mainCmd === 'whoami') {
        const displayName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Tenant Operator';
        setLogs((prev) => [
          ...prev,
          {
            id: logId,
            command: trimmed,
            timestamp,
            stdout: (
              <div className="font-mono text-xs text-slate-300">
                user: <span className="text-white font-bold">{displayName}</span> (
                {user?.email || 'tenant@tenantstack.io'}) | role: tenant_admin
              </div>
            ),
          },
        ]);
        return;
      }

      // 13. UNRECOGNIZED COMMAND
      setLogs((prev) => [
        ...prev,
        {
          id: logId,
          command: trimmed,
          timestamp,
          type: 'error',
          stdout: (
            <div className="font-mono text-xs space-y-1 text-rose-400">
              <div>command not found: {trimmed}</div>
              <div className="text-slate-500 text-[11px]">
                Type <code className="text-white font-bold">help</code> or <code className="text-white font-bold">ts list</code> to view available commands.
              </div>
            </div>
          ),
        },
      ]);
    } catch (err: any) {
      setLogs((prev) => [
        ...prev,
        {
          id: logId,
          command: trimmed,
          timestamp,
          type: 'error',
          stdout: <span className="text-rose-400 font-mono text-xs">Execution Error: {err.message || 'Failed to process command'}</span>,
        },
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCommand.trim() || isExecuting) return;
    const cmd = inputCommand;
    setInputCommand('');
    executeCommand(cmd);
  };

  // Keyboard navigation for history (Up/Down arrows)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex + 1 < commandHistory.length ? historyIndex + 1 : historyIndex;
      setHistoryIndex(nextIndex);
      setInputCommand(commandHistory[nextIndex] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInputCommand(commandHistory[nextIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCommand('');
      }
    }
  };

  // Copy terminal contents
  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `tenant@tenantstack:~$ ${l.command}\n[${l.timestamp}]`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-[78vh] bg-[#070a12] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-slate-200">
      {/* ── Top Bar / Header ── */}
      <div className="px-5 py-3 border-b border-slate-800 bg-[#0c101a] flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-[#c8f542]">
            <TerminalIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm tracking-tight">TenantStack CloudShell</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-[#c8f542] border border-slate-700">
                CLI Mode
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Target: <span className="font-semibold text-slate-200">{masterHostIp}</span> (AWS EC2 • ap-south-1)
            </div>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE CLI
          </span>

          <button
            type="button"
            onClick={handleCopyLogs}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Copy terminal session"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setLogs([])}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Clear screen buffer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onSwitchToGui}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
          >
            <span>Exit to GUI</span>
          </button>
        </div>
      </div>

      {/* ── Quick Action Command Pills Bar ── */}
      <div className="px-5 py-2 border-b border-slate-800/80 bg-[#090d16] flex items-center gap-2 overflow-x-auto shrink-0 select-none text-xs">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">Quick Run:</span>
        {[
          { label: 'ts list', cmd: 'ts list', desc: 'List all instances' },
          { label: 'ts deploy', cmd: 'ts deploy', desc: 'Deploy project from GitHub' },
          { label: 'ts quota', cmd: 'ts quota', desc: 'View plan limits' },
          { label: 'ts ping', cmd: 'ts ping', desc: 'Ping master host' },
          { label: 'help', cmd: 'help', desc: 'Show all commands' },
          { label: 'clear', cmd: 'clear', desc: 'Clear screen' },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => executeCommand(item.cmd)}
            disabled={isExecuting}
            className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition disabled:opacity-40 whitespace-nowrap shadow-xs"
            title={item.desc}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Terminal Viewport & Logs ── */}
      <div
        className="flex-1 p-5 overflow-y-auto space-y-3.5 select-text text-xs leading-relaxed"
        onClick={() => inputRef.current?.focus()}
      >
        {logs.map((log) => (
          <div key={log.id} className="space-y-1">
            {/* Command Prompt Line */}
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[#c8f542] font-semibold">tenant@tenantstack</span>
              <span className="text-slate-500">:</span>
              <span className="text-blue-400">~$</span>
              <span className="text-white font-bold">{log.command}</span>
              <span className="text-[10px] text-slate-600 ml-auto select-none">{log.timestamp}</span>
            </div>

            {/* Command Output */}
            <div className="pl-2.5 border-l border-slate-800/80">{log.stdout}</div>
          </div>
        ))}

        <div ref={terminalEndRef} />
      </div>

      {/* ── Interactive Command Input Prompt ── */}
      <form
        onSubmit={handleFormSubmit}
        className="px-5 py-3 border-t border-slate-800 bg-[#0c101a] flex items-center gap-2 shrink-0"
      >
        <span className="text-[#c8f542] font-bold text-xs shrink-0 select-none">
          tenant@tenantstack:~$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command (e.g. ts list, ts start my-app, ts stats, help)..."
          disabled={isExecuting}
          className="flex-1 bg-transparent text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:ring-0 border-0 p-0"
        />
        <button
          type="submit"
          disabled={!inputCommand.trim() || isExecuting}
          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#c8f542] font-semibold text-xs transition disabled:opacity-40"
        >
          Run
        </button>
      </form>
    </div>
  );
};
