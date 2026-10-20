import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Terminal,
  Play,
  Pause,
  Trash2,
  Copy,
  Check,
  Download,
  Search,
  ArrowDown,
  Radio,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'stdout' | 'stderr';
  source: string;
  message: string;
}

interface LiveLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string | null;
  instanceName: string;
  template: string;
  status: string;
}

const API_BASE = 'http://localhost:5000/api/v1';

export const LiveLogsModal: React.FC<LiveLogsModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  instanceName,
  template,
  status: initialStatus,
}) => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'stdout'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Update current status when prop changes
  useEffect(() => {
    setCurrentStatus(initialStatus);
  }, [initialStatus]);

  // Connect to SSE stream
  useEffect(() => {
    if (!isOpen || !instanceId || !token) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    if (!isStreaming) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Initialize EventSource with token in query param
    const streamUrl = `${API_BASE}/compute/${instanceId}/logs/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
          setIsConnected(true);
          if (data.status) setCurrentStatus(data.status);
        } else if (data.type === 'log') {
          setLogs((prev) => {
            // Keep maximum 500 lines in memory
            const updated = [...prev, data.log];
            if (updated.length > 500) return updated.slice(-500);
            return updated;
          });
          if (data.status) setCurrentStatus(data.status);
        } else if (data.type === 'status') {
          if (data.status) setCurrentStatus(data.status);
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      // Fallback: fetch historical logs if EventSource disconnects
      fetchHistoricalLogs();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [isOpen, instanceId, token, isStreaming]);

  // Initial fetch / fallback
  const fetchHistoricalLogs = async () => {
    if (!instanceId || !token) return;
    try {
      const res = await fetch(`${API_BASE}/compute/${instanceId}/logs?tail=60`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        if (data.status) setCurrentStatus(data.status);
      }
    } catch (e) {
      console.error('Failed to fetch historical logs:', e);
    }
  };

  // On open, reset and load initial batch
  useEffect(() => {
    if (isOpen) {
      setLogs([]);
      fetchHistoricalLogs();
      setAutoScroll(true);
    }
  }, [isOpen, instanceId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Detect manual scroll up to disable auto-scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  // Filter logs by search query and level
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.source.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLevel && matchesSearch;
    });
  }, [logs, levelFilter, searchQuery]);

  // Copy logs
  const handleCopy = () => {
    const text = filteredLogs
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Download logs
  const handleDownload = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${instanceName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-logs.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Clear log buffer
  const handleClear = () => {
    setLogs([]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 md:p-6"
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
          {/* Top Bar Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-[#0f1422] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-[#c8f542] shadow-sm">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm md:text-base font-bold text-white tracking-tight">{instanceName}</h2>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {template}
                  </span>
                  {/* Status Indicator */}
                  {currentStatus === 'running' ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {isStreaming ? 'Streaming Live' : 'Paused'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {currentStatus}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                  <span>Container Log Stream</span>
                  <span>·</span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {filteredLogs.length} line{filteredLogs.length === 1 ? '' : 's'}
                  </span>
                </p>
              </div>
            </div>

            {/* Window controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsStreaming(!isStreaming)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  isStreaming
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                }`}
                title={isStreaming ? 'Pause live stream' : 'Resume live stream'}
              >
                {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span className="hidden sm:inline">{isStreaming ? 'Pause' : 'Resume'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="px-5 py-3 border-b border-slate-800/80 bg-[#0c101a] flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Search Filter */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs (regex or keyword)..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Level Selector Pills */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-[11px]">
              {(['all', 'info', 'warn', 'error', 'stdout'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider transition ${
                    levelFilter === lvl
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Actions: AutoScroll, Copy, Download, Clear */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
                  autoScroll
                    ? 'bg-[#c8f542]/10 border-[#c8f542]/30 text-[#c8f542]'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title={autoScroll ? 'Auto-scroll is ON' : 'Auto-scroll is OFF'}
              >
                <ArrowDown className={`w-3.5 h-3.5 ${autoScroll ? 'animate-bounce' : ''}`} />
                <span className="hidden md:inline">Auto-scroll</span>
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
                title="Copy visible logs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
                title="Download log file"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Export</span>
              </button>

              <button
                onClick={handleClear}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700 transition"
                title="Clear log console"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Logs Viewport */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1 select-text bg-[#080b11]"
          >
            {filteredLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16">
                <Radio className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
                <p className="text-sm font-semibold text-slate-400">
                  {searchQuery ? 'No log lines matched your query' : 'Awaiting container log stream...'}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {currentStatus === 'stopped'
                    ? 'Instance is stopped. Start the instance to resume container execution.'
                    : 'Log stream is active. New output will appear automatically.'}
                </p>
              </div>
            ) : (
              filteredLogs.map((log, idx) => {
                const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                // Level colors
                let levelBadge = 'bg-slate-800 text-slate-400 border-slate-700';
                let textColor = 'text-slate-300';

                if (log.level === 'info') {
                  levelBadge = 'bg-sky-950/80 text-sky-400 border-sky-800/50';
                  textColor = 'text-slate-200';
                } else if (log.level === 'warn') {
                  levelBadge = 'bg-amber-950/80 text-amber-400 border-amber-800/50';
                  textColor = 'text-amber-200';
                } else if (log.level === 'error' || log.level === 'stderr') {
                  levelBadge = 'bg-rose-950/80 text-rose-400 border-rose-800/50';
                  textColor = 'text-rose-200';
                } else if (log.level === 'stdout') {
                  levelBadge = 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50';
                  textColor = 'text-emerald-100';
                }

                return (
                  <div
                    key={log.id || idx}
                    className="flex items-start gap-2.5 py-0.5 px-2 rounded hover:bg-slate-900/60 transition-colors group"
                  >
                    {/* Line Index */}
                    <span className="text-[10px] text-slate-600 select-none w-8 text-right shrink-0">
                      {idx + 1}
                    </span>

                    {/* Timestamp */}
                    <span className="text-slate-500 text-[11px] select-none shrink-0">{timeStr}</span>

                    {/* Level Badge */}
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border select-none shrink-0 ${levelBadge}`}
                    >
                      {log.level}
                    </span>

                    {/* Source tag */}
                    <span className="text-slate-400 text-[11px] select-none shrink-0">[{log.source}]</span>

                    {/* Message */}
                    <span className={`flex-1 break-all whitespace-pre-wrap leading-relaxed ${textColor}`}>
                      {searchQuery ? highlightMatch(log.message, searchQuery) : log.message}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>

          {/* Footer Bar */}
          <div className="px-5 py-2.5 border-t border-slate-800/80 bg-[#0f1422] flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {isConnected ? 'SSE Live Stream Active' : 'Polling Sync Mode'}
              </span>
              <span>·</span>
              <span>Buffer: {logs.length} / 500 lines</span>
            </div>

            <div className="flex items-center gap-3">
              {!autoScroll && (
                <button
                  onClick={() => {
                    setAutoScroll(true);
                    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-[#c8f542] hover:underline flex items-center gap-1 text-[11px] font-medium"
                >
                  <ArrowDown className="w-3 h-3" /> Jump to newest
                </button>
              )}
              <span className="text-slate-500 font-mono">Press Esc to exit</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper: Highlight matching text
const highlightMatch = (text: string, query: string) => {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-[#c8f542]/30 text-[#c8f542] px-0.5 rounded font-semibold">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
