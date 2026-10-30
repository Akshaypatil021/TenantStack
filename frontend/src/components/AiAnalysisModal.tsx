import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Terminal,
  Code2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Download,
  RefreshCw,
  AlertTriangle,
  Send,
  Activity,
  ArrowRight,
  Cpu,
  HardDrive,
  FileCode,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface IAiMetric {
  label: string;
  value: string;
}

export interface IAiAnalysis {
  summary?: string;
  keyMetrics?: IAiMetric[];
  insights?: string[];
  recommendations?: string[];
  dataColumns?: string[];
  rowCount?: number;
  analyzedAt?: string;
  modelUsed?: string;
}

export interface StorageFile {
  _id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileSizeMB: number;
  category: 'DOCUMENT' | 'DATASET' | 'IMAGE' | 'CODE' | 'ARCHIVE' | 'OTHER';
  s3Key: string;
  s3Bucket: string;
  storageProvider: 'AWS_S3' | 'LOCAL';
  aiAnalysis?: IAiAnalysis;
  uploadedBy?: {
    _id: string;
    firstName: string;
    lastName?: string;
    email: string;
  };
  createdAt: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  latencyMs?: number;
}

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: StorageFile | null;
  onAnalysisUpdated?: (fileId: string, updatedAnalysis: IAiAnalysis) => void;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  isOpen,
  onClose,
  file,
  onAnalysisUpdated,
}) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'console' | 'insights' | 'raw_json'>('console');
  const [activeSnippetTab, setActiveSnippetTab] = useState<'node' | 'python' | 'curl'>('node');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<IAiAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial Load / Sync
  useEffect(() => {
    if (!isOpen || !file) {
      setAnalysis(null);
      setMessages([]);
      setInputQuestion('');
      setAnalysisError(null);
      setIsFullscreen(false);
      return;
    }

    if (file.aiAnalysis && file.aiAnalysis.summary) {
      setAnalysis(file.aiAnalysis);
    } else {
      runAnalysis(false);
    }
  }, [isOpen, file]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (activeTab === 'console') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, isAnswering]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const runAnalysis = async (force: boolean = false) => {
    if (!file) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch(`http://localhost:5000/api/v1/storage/${file._id}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ force }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete AI data analysis');
      }

      setAnalysis(data.analysis);
      if (onAnalysisUpdated) {
        onAnalysisUpdated(file._id, data.analysis);
      }
    } catch (err: any) {
      console.error('Error running AI analysis:', err);
      setAnalysisError(err.message || 'An unexpected error occurred during AI analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendQuestion = async (presetQuestion?: string) => {
    const questionToSend = (presetQuestion || inputQuestion).trim();
    if (!questionToSend || !file || isAnswering) return;

    const startTime = Date.now();
    const userMsg: ChatMessage = {
      role: 'user',
      text: questionToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsAnswering(true);

    try {
      const res = await fetch(`http://localhost:5000/api/v1/storage/${file._id}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: questionToSend,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const latencyMs = Date.now() - startTime;
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to answer document question');
      }

      const botMsg: ChatMessage = {
        role: 'model',
        text: data.answer || 'No response returned from the model.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        latencyMs,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errorMsg: ChatMessage = {
        role: 'model',
        text: `⚠️ Execution error: ${err.message || 'Failed to reach AI engine'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        latencyMs,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAnswering(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleDownloadReport = () => {
    if (!analysis || !file) return;
    const report = `# Cloud Object Workbench Report: ${file.originalName}
Date: ${analysis.analyzedAt ? new Date(analysis.analyzedAt).toISOString() : new Date().toISOString()}
Model: ${analysis.modelUsed || 'gemini-2.0-flash'}
S3 Bucket: ${file.s3Bucket || 'tenant-storage-akshay'}
S3 Key: ${file.s3Key}
MIME: ${file.mimeType}
Payload Size: ${file.fileSizeMB} MB (${file.fileSizeBytes} bytes)

## 1. Executive Summary
${analysis.summary || 'N/A'}

## 2. Key Metrics & Telemetry KPIs
${(analysis.keyMetrics || []).map((m) => `- **${m.label}:** ${m.value}`).join('\n')}

## 3. Discovered Trends & Patterns
${(analysis.insights || []).map((i) => `- ${i}`).join('\n')}

## 4. Architectural & Operational Recommendations
${(analysis.recommendations || []).map((r) => `- [ ] ${r}`).join('\n')}

## 5. Schema & Fields (${analysis.dataColumns?.length || 0})
${(analysis.dataColumns || []).map((c) => `- \`${c}\``).join('\n')}
`;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${file.originalName}.workbench-report.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || !file) return null;

  const s3Uri = `s3://${file.s3Bucket || 'tenant-storage-akshay'}/${file.s3Key}`;
  const modelName = analysis?.modelUsed || 'gemini-2.0-flash';

  // Code Snippets for Developers
  const nodeSnippet = `// AWS SDK v3 for Node.js
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'ap-south-1' });
const response = await s3.send(new GetObjectCommand({
  Bucket: '${file.s3Bucket || 'tenant-storage-akshay'}',
  Key: '${file.s3Key}',
}));
const fileStream = response.Body;`;

  const pythonSnippet = `# Boto3 for Python
import boto3

s3 = boto3.client('s3', region_name='ap-south-1')
response = s3.get_object(
    Bucket='${file.s3Bucket || 'tenant-storage-akshay'}',
    Key='${file.s3Key}'
)
data = response['Body'].read()`;

  const curlSnippet = `# Fetch via TenantStack REST API
curl -X GET "http://localhost:5000/api/v1/storage/${file._id}/download" \\
  -H "Authorization: Bearer $TENANT_TOKEN" \\
  -o "${file.originalName}"`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Developer Console Modal Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 12 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={`relative w-full ${
            isFullscreen ? 'h-full max-w-full rounded-none' : 'max-w-7xl h-[92vh] rounded-2xl'
          } bg-[#0A0D14] border border-slate-800 shadow-2xl text-slate-100 overflow-hidden flex flex-col z-10 transition-all duration-200`}
        >
          {/* ─── 1. Developer Console Header ─── */}
          <div className="h-14 px-4 sm:px-6 bg-[#0D111A] border-b border-slate-800 flex items-center justify-between shrink-0 select-none">
            {/* Left: Console identity & target */}
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center text-[#c8f542] shrink-0">
                <Terminal className="w-4 h-4" />
              </div>

              <div className="flex items-center gap-2 overflow-hidden">
                <span className="font-mono text-xs font-bold text-white tracking-tight shrink-0">
                  Object Workbench
                </span>
                <span className="text-slate-600 hidden sm:inline">/</span>
                <span className="font-mono text-xs font-semibold text-[#c8f542] truncate max-w-[200px] sm:max-w-xs">
                  {file.originalName}
                </span>

                {/* Model Engine Tag */}
                <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-900 border border-slate-700 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  engine:{modelName}
                </span>

                <span className="hidden lg:inline-flex px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700">
                  {file.category}
                </span>
              </div>
            </div>

            {/* Right: Quick Dev Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => copyToClipboard(s3Uri, 's3uri')}
                title="Copy S3 URI (s3://...)"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-[11px] font-mono transition cursor-pointer"
              >
                {copiedKey === 's3uri' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#c8f542]" />
                    <span className="text-[#c8f542]">URI Copied</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy S3 URI</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => runAnalysis(true)}
                disabled={isAnalyzing}
                title="Re-run pipeline analysis"
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-[11px] font-mono transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-[#c8f542]' : ''}`} />
                <span className="hidden sm:inline">{isAnalyzing ? 'Analyzing...' : 'Re-run'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadReport}
                disabled={!analysis}
                title="Export technical Markdown report"
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Restore window (Esc)' : 'Maximize workbench'}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer hidden md:inline-flex"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                title="Close Workbench (Esc)"
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/80 transition ml-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ─── 2. Split Workspace Layout ─── */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* ─── LEFT PANEL: Object Technical Telemetry & SDK Hub (35%) ─── */}
            <div className="w-full lg:w-[380px] xl:w-[420px] bg-[#090C12] border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col shrink-0 overflow-y-auto">
              <div className="p-4 sm:p-5 space-y-5">
                {/* Section A: S3 Object Specifications */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                      Object Specifications
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.2 rounded">
                      200 OK
                    </span>
                  </div>

                  <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-3 font-mono text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-500 text-[11px]">S3 Bucket:</span>
                      <span className="text-slate-200 text-right truncate font-semibold" title={file.s3Bucket || 'tenant-storage-akshay'}>
                        {file.s3Bucket || 'tenant-storage-akshay'}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-500 text-[11px]">AWS Region:</span>
                      <span className="text-slate-300 text-right">ap-south-1</span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-500 text-[11px]">Payload Size:</span>
                      <span className="text-[#c8f542] text-right font-bold">
                        {file.fileSizeMB} MB <span className="text-slate-500 text-[10px]">({file.fileSizeBytes.toLocaleString()} B)</span>
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-500 text-[11px]">MIME Type:</span>
                      <span className="text-slate-300 text-right truncate max-w-[190px]" title={file.mimeType}>
                        {file.mimeType}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-500 text-[11px]">Storage Class:</span>
                      <span className="text-sky-400 text-right font-semibold">STANDARD</span>
                    </div>

                    <div className="pt-1.5 border-t border-slate-800/80 flex items-start justify-between gap-2">
                      <span className="text-slate-500 text-[11px]">Object Key:</span>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-slate-400 text-[10px] truncate max-w-[160px]" title={file.s3Key}>
                          {file.s3Key}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(file.s3Key, 'key')}
                          className="text-slate-400 hover:text-white p-0.5"
                          title="Copy S3 Key"
                        >
                          {copiedKey === 'key' ? <Check className="w-3 h-3 text-[#c8f542]" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section B: Neural Analysis Telemetry */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#c8f542]" />
                      Runtime Intelligence
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {analysis?.analyzedAt ? new Date(analysis.analyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ready'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-3">
                      <p className="text-[10px] font-mono text-slate-500">Rows / Records</p>
                      <p className="text-sm font-mono font-bold text-white mt-0.5">
                        {analysis?.rowCount !== undefined ? analysis.rowCount.toLocaleString() : 'N/A'}
                      </p>
                    </div>

                    <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-3">
                      <p className="text-[10px] font-mono text-slate-500">Schema Fields</p>
                      <p className="text-sm font-mono font-bold text-cyan-400 mt-0.5">
                        {analysis?.dataColumns?.length || 0}
                      </p>
                    </div>
                  </div>

                  {/* Schema fields tag cloud */}
                  {analysis?.dataColumns && analysis.dataColumns.length > 0 && (
                    <div className="mt-2.5 bg-[#0D111A] border border-slate-800 rounded-xl p-3">
                      <p className="text-[10px] font-mono text-slate-500 mb-2">Detected Fields:</p>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {analysis.dataColumns.map((col, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section C: Developer SDK Integration Snippets */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-purple-400" />
                      Programmatic Access (SDK)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const snippet = activeSnippetTab === 'node' ? nodeSnippet : activeSnippetTab === 'python' ? pythonSnippet : curlSnippet;
                        copyToClipboard(snippet, 'snippet');
                      }}
                      className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'snippet' ? <Check className="w-3 h-3 text-[#c8f542]" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'snippet' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="bg-[#0D111A] border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
                    {/* Snippet Tabs */}
                    <div className="flex border-b border-slate-800 bg-slate-950/60">
                      {(['node', 'python', 'curl'] as const).map((tab) => (
                        <button
                          type="button"
                          key={tab}
                          onClick={() => setActiveSnippetTab(tab)}
                          className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider transition cursor-pointer ${
                            activeSnippetTab === tab
                              ? 'text-[#c8f542] border-b border-[#c8f542] bg-slate-900/60'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {tab === 'node' ? 'Node.js' : tab === 'python' ? 'Python' : 'cURL'}
                        </button>
                      ))}
                    </div>

                    <pre className="p-3 text-[11px] leading-relaxed text-slate-300 overflow-x-auto selection:bg-[#c8f542]/20">
                      {activeSnippetTab === 'node' && nodeSnippet}
                      {activeSnippetTab === 'python' && pythonSnippet}
                      {activeSnippetTab === 'curl' && curlSnippet}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── RIGHT PANEL: Terminal REPL & Technical Insights (65%) ─── */}
            <div className="flex-1 flex flex-col bg-[#0A0D14] overflow-hidden">
              {/* Console Mode Tab Switcher */}
              <div className="h-11 px-4 border-b border-slate-800 bg-[#0D111A] flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('console')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      activeTab === 'console'
                        ? 'bg-slate-900 text-[#c8f542] border border-slate-700 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>&gt;_ Query Console</span>
                    {messages.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#c8f542]/10 text-[#c8f542] border border-[#c8f542]/30">
                        {messages.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('insights')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      activeTab === 'insights'
                        ? 'bg-slate-900 text-[#c8f542] border border-slate-700 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Structured Metrics & KPIs</span>
                    {analysis?.keyMetrics && analysis.keyMetrics.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                        {analysis.keyMetrics.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('raw_json')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      activeTab === 'raw_json'
                        ? 'bg-slate-900 text-[#c8f542] border border-slate-700 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Raw Model JSON</span>
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-slate-500">
                  <span>session: <strong className="text-slate-400">{file._id.slice(-6)}</strong></span>
                </div>
              </div>

              {/* Console Work Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {/* Analyzing Banner */}
                {isAnalyzing && (
                  <div className="h-64 flex flex-col items-center justify-center text-center space-y-3 font-mono">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl border-2 border-slate-800 border-t-[#c8f542] animate-spin" />
                      <Cpu className="w-5 h-5 text-[#c8f542] absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">
                        Executing Pipeline: {modelName}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Streaming object buffer from S3 & parsing structured telemetry...
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {!isAnalyzing && analysisError && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold">Pipeline Execution Error</p>
                      <p className="text-slate-300 text-[11px] mt-1">{analysisError}</p>
                      <button
                        type="button"
                        onClick={() => runAnalysis(true)}
                        className="mt-2.5 px-3 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] transition cursor-pointer font-bold"
                      >
                        Retry Pipeline
                      </button>
                    </div>
                  </div>
                )}

                {!isAnalyzing && (
                  <>
                    {/* ─── TAB 1: INTERACTIVE REPL CONSOLE ─── */}
                    {activeTab === 'console' && (
                      <div className="flex flex-col h-full min-h-[460px]">
                        {/* Terminal Log Stream */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                          {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-[#c8f542] flex items-center justify-center">
                                <Terminal className="w-6 h-6" />
                              </div>

                              <div>
                                <h4 className="text-sm font-mono font-bold text-white">
                                  Neural Query Console Ready
                                </h4>
                                <p className="text-xs text-slate-400 mt-1 max-w-md font-sans">
                                  Execute natural language data queries against <strong className="text-slate-300 font-mono">{file.originalName}</strong>. Results are grounded in real S3 file context.
                                </p>
                              </div>

                              {/* Developer Command Chips */}
                              <div className="pt-2 flex flex-wrap justify-center gap-2 max-w-lg">
                                {[
                                  '--summarize-key-anomalies',
                                  '--extract-highest-values',
                                  '--schema-structure-breakdown',
                                  '--business-impact-takeaways',
                                ].map((cmd, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSendQuestion(cmd.replace('--', '').replace(/-/g, ' '))}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-[#c8f542] border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                                  >
                                    <span className="text-[#c8f542] mr-1">&gt;</span>
                                    {cmd}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            messages.map((msg, idx) => (
                              <div key={idx} className="space-y-1.5">
                                {/* Prompt command banner */}
                                {msg.role === 'user' ? (
                                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200">
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1">
                                      <span className="text-[#c8f542] font-bold">dev@tenantstack:~$</span>
                                      <span>query --object "{file.originalName}"</span>
                                      <span className="ml-auto">{msg.timestamp}</span>
                                    </div>
                                    <p className="text-[#c8f542] font-semibold pl-2 border-l-2 border-[#c8f542]">
                                      {msg.text}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-4 font-sans text-xs text-slate-200">
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-[10px] font-mono text-slate-500 mb-3">
                                      <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                                        <Sparkles className="w-3 h-3" />
                                        response: {modelName}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        {msg.latencyMs && (
                                          <span className="text-slate-400 font-mono">
                                            {msg.latencyMs}ms
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => copyToClipboard(msg.text, `msg-${idx}`)}
                                          className="hover:text-white p-0.5"
                                          title="Copy response"
                                        >
                                          {copiedKey === `msg-${idx}` ? (
                                            <Check className="w-3 h-3 text-[#c8f542]" />
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                        </button>
                                      </div>
                                    </div>

                                    <div className="whitespace-pre-wrap leading-relaxed space-y-2 text-slate-200">
                                      {msg.text}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}

                          {/* Reasoning Loader */}
                          {isAnswering && (
                            <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-3 flex items-center gap-3 font-mono text-xs text-slate-400">
                              <div className="w-2 h-2 rounded-full bg-[#c8f542] animate-ping" />
                              <span>Model reasoning over {file.originalName} buffer...</span>
                            </div>
                          )}

                          <div ref={chatEndRef} />
                        </div>

                        {/* REPL Input Bar */}
                        <div className="pt-3 border-t border-slate-800/90 mt-2">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleSendQuestion();
                            }}
                            className="flex items-center gap-2 bg-[#0D111A] border border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-[#c8f542] transition"
                          >
                            <span className="text-[#c8f542] font-mono font-bold text-sm select-none">&gt;</span>
                            <input
                              ref={inputRef}
                              type="text"
                              value={inputQuestion}
                              onChange={(e) => setInputQuestion(e.target.value)}
                              placeholder={`Query "${file.originalName}" (e.g. 'Identify highest outlier or summarize columns')...`}
                              disabled={isAnswering}
                              className="flex-1 bg-transparent py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
                            />
                            <button
                              type="submit"
                              disabled={!inputQuestion.trim() || isAnswering}
                              className="bg-slate-900 hover:bg-slate-800 text-[#c8f542] px-3 py-1.5 rounded-lg border border-slate-750 text-xs font-mono font-bold transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Run</span>
                              <Send className="w-3 h-3" />
                            </button>
                          </form>
                          <p className="text-[10px] font-mono text-slate-500 mt-1.5 text-right">
                            Press <kbd className="px-1 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400">Enter ↵</kbd> to execute
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ─── TAB 2: STRUCTURED METRICS & RECOMMENDATIONS ─── */}
                    {activeTab === 'insights' && (
                      <div className="space-y-5">
                        {/* Executive Summary */}
                        <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-4 sm:p-5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#c8f542]">
                              Executive Summary
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                            {analysis?.summary || 'No summary generated for this object.'}
                          </p>
                        </div>

                        {/* Extracted Metrics Grid */}
                        {analysis?.keyMetrics && analysis.keyMetrics.length > 0 && (
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                              Extracted KPIs & Telemetry Attributes
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              {analysis.keyMetrics.map((metric, idx) => (
                                <div
                                  key={idx}
                                  className="p-3.5 rounded-xl bg-[#0D111A] border border-slate-800 hover:border-slate-700 transition"
                                >
                                  <p className="text-[11px] font-mono text-slate-400">{metric.label}</p>
                                  <p className="text-base font-mono font-bold text-[#c8f542] mt-1 truncate" title={metric.value}>
                                    {metric.value}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Discovered Patterns & Trends */}
                        {analysis?.insights && analysis.insights.length > 0 && (
                          <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-4 sm:p-5">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 block mb-3">
                              Observed Trends & Structural Patterns
                            </span>
                            <ul className="space-y-2">
                              {analysis.insights.map((insight, idx) => (
                                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                                  <ArrowRight className="w-3.5 h-3.5 text-[#c8f542] shrink-0 mt-0.5" />
                                  <span>{insight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Actionable Engineering Recommendations */}
                        {analysis?.recommendations && analysis.recommendations.length > 0 && (
                          <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-4 sm:p-5">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block mb-3">
                              Actionable Architectural Recommendations
                            </span>
                            <ul className="space-y-2">
                              {analysis.recommendations.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                                  <div className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </div>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ─── TAB 3: RAW MODEL JSON ─── */}
                    {activeTab === 'raw_json' && (
                      <div className="space-y-3 font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Serialized AI Model Output
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(JSON.stringify(analysis, null, 2), 'raw_json')}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                          >
                            {copiedKey === 'raw_json' ? <Check className="w-3 h-3 text-[#c8f542]" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedKey === 'raw_json' ? 'Copied' : 'Copy JSON'}</span>
                          </button>
                        </div>

                        <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-4 overflow-x-auto max-h-[520px]">
                          <pre className="text-[11px] text-cyan-300 leading-relaxed">
                            {JSON.stringify(analysis, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ─── 3. Developer Console Status Footer ─── */}
          <div className="h-9 px-4 bg-[#090C12] border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500 shrink-0 select-none">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                s3:active
              </span>
              <span className="text-slate-600">|</span>
              <span className="truncate max-w-xs sm:max-w-md text-slate-400" title={s3Uri}>
                {s3Uri}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline">status: ready</span>
              <span className="text-slate-600 hidden sm:inline">|</span>
              <span>esc: close</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AiAnalysisModal;
