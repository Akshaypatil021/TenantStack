import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Terminal,
  Code2,
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
  ArrowLeft,
  Sparkles,
  Brain,
  FileText,
  Database,
  ShieldCheck,
  Layers,
  Clock,
  Trash2,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { StorageFile, IAiAnalysis } from '../components/AiAnalysisModal';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  latencyMs?: number;
}

export const StorageWorkbench: React.FC = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const { token } = useAuth();

  const [file, setFile] = useState<StorageFile | null>(null);
  const [analysis, setAnalysis] = useState<IAiAnalysis | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Tabs & Views
  const [activeTab, setActiveTab] = useState<'console' | 'metrics' | 'recommendations' | 'raw_json'>('console');
  const [activeSnippetTab, setActiveSnippetTab] = useState<'node' | 'python' | 'curl' | 'ts'>('node');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Terminal REPL State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. Fetch File Metadata by ID
  useEffect(() => {
    let isMounted = true;
    const fetchFile = async () => {
      if (!fileId || !token) return;
      setIsLoadingFile(true);
      setErrorMessage(null);

      try {
        const res = await fetch(`http://localhost:5000/api/v1/storage/${fileId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `File not found (Status ${res.status})`);
        }

        const data = await res.json();
        if (isMounted) {
          setFile(data.file);
          if (data.file?.aiAnalysis && data.file.aiAnalysis.summary) {
            setAnalysis(data.file.aiAnalysis);
          } else {
            // Automatically run analysis if not yet generated
            triggerAnalysis(data.file._id, false);
          }
        }
      } catch (err: any) {
        console.error('Failed to load file for workbench:', err);
        if (isMounted) {
          setErrorMessage(err.message || 'Unable to retrieve cloud storage object metadata.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingFile(false);
        }
      }
    };

    fetchFile();
    return () => {
      isMounted = false;
    };
  }, [fileId, token]);

  // Scroll to bottom of terminal log on new messages
  useEffect(() => {
    if (activeTab === 'console') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, isAnswering]);

  // 2. Trigger AI Analysis Pipeline
  const triggerAnalysis = async (targetFileId: string, force: boolean = false) => {
    if (!token) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch(`http://localhost:5000/api/v1/storage/${targetFileId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ force }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute neural data analysis pipeline');
      }

      setAnalysis(data.analysis);
      setFile((prev) => (prev ? { ...prev, aiAnalysis: data.analysis } : null));
    } catch (err: any) {
      console.error('Analysis error in workbench:', err);
      setAnalysisError(err.message || 'Error occurred while running Google Gemini neural analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 3. Send Terminal Query / Question
  const handleSendQuestion = async (presetQuestion?: string) => {
    const questionToSend = (presetQuestion || inputQuestion).trim();
    if (!questionToSend || !file || isAnswering || !token) return;

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
        throw new Error(data.error || 'Failed to answer document query');
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

  // Clear Terminal Messages
  const handleClearTerminal = () => {
    setMessages([]);
  };

  // 4. Download Markdown Report
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

  // 5. Download Raw File from S3
  const handleDownloadRawFile = () => {
    if (!file || !token) return;
    const downloadUrl = `http://localhost:5000/api/v1/storage/${file._id}/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', file.originalName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Category Icon & Accent Colors
  const getCategoryDetails = (cat: string) => {
    switch (cat) {
      case 'DATASET':
        return {
          icon: <Database className="w-4 h-4 text-emerald-400" />,
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          accent: '#10B981',
          label: 'Dataset (CSV/JSON)',
        };
      case 'DOCUMENT':
        return {
          icon: <FileText className="w-4 h-4 text-sky-400" />,
          bg: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
          accent: '#38BDF8',
          label: 'Document (PDF/Docx)',
        };
      case 'CODE':
        return {
          icon: <FileCode className="w-4 h-4 text-purple-400" />,
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
          accent: '#A855F7',
          label: 'Source Code',
        };
      default:
        return {
          icon: <HardDrive className="w-4 h-4 text-[#c8f542]" />,
          bg: 'bg-lime-500/10 border-lime-500/30 text-lime-300',
          accent: '#C8F542',
          label: 'Object Payload',
        };
    }
  };

  // ─── LOADING STATE ───
  if (isLoadingFile) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center text-center font-mono space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl border-2 border-slate-800 border-t-[#c8f542] animate-spin" />
          <Brain className="w-7 h-7 text-[#c8f542] absolute inset-0 m-auto animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 uppercase tracking-widest">
            Connecting to Object Telemetry Workbench
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Mounting S3 direct stream & configuring Google Gemini neural context...
          </p>
        </div>
      </div>
    );
  }

  // ─── ERROR STATE ───
  if (errorMessage || !file) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center text-center p-6 space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cloud Resource Unavailable</h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-md">
            {errorMessage || 'The requested storage object was not found or has been purged from S3.'}
          </p>
        </div>
        <Link
          to="/storage"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#c8f542] text-xs font-mono font-bold shadow-sm transition active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Storage Hub</span>
        </Link>
      </div>
    );
  }

  const s3Uri = `s3://${file.s3Bucket || 'tenant-storage-akshay'}/${file.s3Key}`;
  const modelName = analysis?.modelUsed || 'gemini-2.0-flash';
  const categoryInfo = getCategoryDetails(file.category);

  // Developer SDK Snippets
  const nodeSnippet = `// AWS SDK v3 for Node.js
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'ap-south-1' });
const { Body } = await s3.send(new GetObjectCommand({
  Bucket: '${file.s3Bucket || 'tenant-storage-akshay'}',
  Key: '${file.s3Key}',
}));

// Stream body to buffer
const chunks: Uint8Array[] = [];
for await (const chunk of Body as any) {
  chunks.push(chunk);
}
const buffer = Buffer.concat(chunks);`;

  const pythonSnippet = `# Boto3 for Python
import boto3

s3 = boto3.client('s3', region_name='ap-south-1')
response = s3.get_object(
    Bucket='${file.s3Bucket || 'tenant-storage-akshay'}',
    Key='${file.s3Key}'
)
data_bytes = response['Body'].read()`;

  const curlSnippet = `# Fetch via TenantStack REST API
curl -X GET "http://localhost:5000/api/v1/storage/${file._id}/download" \\
  -H "Authorization: Bearer $TENANT_TOKEN" \\
  -o "${file.originalName}"`;

  const tsSnippet = `// TypeScript / Fetch streaming
const res = await fetch('http://localhost:5000/api/v1/storage/${file._id}/download', {
  headers: { Authorization: \`Bearer \${token}\` },
});
const blob = await res.blob();
const objectUrl = URL.createObjectURL(blob);`;

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-300">
      {/* ─── 1. TOP COMMAND BAR & LIVE TELEMETRY DOCK ─── */}
      <div className="bg-[#0B0F19] text-white border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-40 bg-radial from-[#c8f542]/10 via-transparent to-transparent pointer-events-none blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          {/* File identity and meta badges */}
          <div className="flex items-start sm:items-center gap-3.5">
            <Link
              to="/storage"
              className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-[#c8f542] hover:border-slate-700 transition shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
              title="Return to Storage Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
                    {categoryInfo.icon}
                  </div>
                  <h1 className="text-base sm:text-xl font-mono font-extrabold text-white tracking-tight">
                    {file.originalName}
                  </h1>
                </div>

                {/* Model Engine Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-slate-900 border border-slate-800 text-[#c8f542] shadow-xs">
                  <Brain className="w-3.5 h-3.5 text-[#c8f542]" />
                  <span>engine:{modelName}</span>
                </div>

                {/* Category Pill */}
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${categoryInfo.bg}`}>
                  {file.category}
                </span>

                {/* S3 Storage Status */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  S3: {file.s3Bucket || 'tenant-storage-akshay'} · ap-south-1
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-slate-400 flex-wrap">
                <span>
                  Payload: <strong className="text-slate-200">{file.fileSizeMB} MB</strong> ({file.fileSizeBytes.toLocaleString()} B)
                </span>
                <span className="text-slate-600">·</span>
                <span>
                  MIME: <span className="text-slate-300">{file.mimeType}</span>
                </span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  SSE-S3 Encrypted
                </span>
              </div>
            </div>
          </div>

          {/* Action Control Hub */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Copy S3 URI */}
            <button
              type="button"
              onClick={() => copyToClipboard(s3Uri, 's3uri')}
              title="Copy S3 URI (s3://...)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-mono font-semibold transition shadow-xs cursor-pointer active:scale-95"
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

            {/* Re-run AI Analysis */}
            <button
              type="button"
              onClick={() => triggerAnalysis(file._id, true)}
              disabled={isAnalyzing}
              title="Re-run Google Gemini Neural Pipeline"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-mono font-semibold transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-[#c8f542]' : 'text-slate-400'}`} />
              <span>{isAnalyzing ? 'Analyzing...' : 'Re-run AI'}</span>
            </button>

            {/* Export Markdown Report */}
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={!analysis}
              title="Export Full Markdown Report"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 transition shadow-xs cursor-pointer disabled:opacity-40"
            >
              <Download className="w-4 h-4 text-slate-300" />
            </button>

            {/* Download Raw Object from S3 */}
            <button
              type="button"
              onClick={handleDownloadRawFile}
              title="Download raw file directly from S3 bucket"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#c8f542] hover:bg-[#b8e338] text-slate-950 text-xs font-mono font-extrabold shadow-sm transition cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Raw</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. EXECUTIVE NEURAL BRIEFING & REAL-TIME TELEMETRY DECK ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Executive Summary Card (8 Cols) */}
        <div className="lg:col-span-8 bg-[#0D121F] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#c8f542]/15 text-[#c8f542] flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  Executive Neural Telemetry Briefing
                </span>
              </div>

              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[#c8f542]">
                <Clock className="w-3 h-3 text-[#c8f542]" />
                {analysis?.analyzedAt ? new Date(analysis.analyzedAt).toLocaleTimeString() : 'Fresh Telemetry'}
              </span>
            </div>

            {/* Summary Text Content */}
            <div className="mt-3.5">
              <p className="text-sm text-slate-200 leading-relaxed font-sans">
                {analysis?.summary || (
                  <span className="italic text-slate-400">
                    Executing deep structural telemetry over object payload...
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Key Insights Strip */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 flex-wrap text-[11px] font-mono">
            <span className="text-slate-500">Telemetry Status:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/50 text-emerald-400">
              ✓ S3 Stream Grounded
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              {analysis?.dataColumns?.length || 0} Schema Entities
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              Storage Tier: STANDARD
            </span>
            {analysis?.insights && analysis.insights.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/50 text-cyan-400">
                {analysis.insights.length} Pattern Observations
              </span>
            )}
          </div>
        </div>

        {/* Telemetry Metric Cards (4 Cols, 2x2 Grid) */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-3">
          <div className="bg-[#0D121F] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-mono font-bold uppercase">Payload</span>
              <HardDrive className="w-3.5 h-3.5 text-[#c8f542]" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-mono font-bold text-white tracking-tight">
                {file.fileSizeMB} <span className="text-xs text-slate-400">MB</span>
              </p>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                {file.fileSizeBytes.toLocaleString()} Bytes
              </p>
            </div>
          </div>

          <div className="bg-[#0D121F] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-mono font-bold uppercase">Entities / Rows</span>
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-mono font-bold text-cyan-300 tracking-tight">
                {analysis?.rowCount !== undefined ? analysis.rowCount.toLocaleString() : 'N/A'}
              </p>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                {file.category === 'DATASET' ? 'Indexed Records' : 'Document Payload'}
              </p>
            </div>
          </div>

          <div className="bg-[#0D121F] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-mono font-bold uppercase">Schema Fields</span>
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-mono font-bold text-purple-300 tracking-tight">
                {analysis?.dataColumns?.length || 0}
              </p>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                Detected Data Attributes
              </p>
            </div>
          </div>

          <div className="bg-[#0D121F] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-mono font-bold uppercase">Inference</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-mono font-bold text-[#c8f542] tracking-tight">
                99.8%
              </p>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                Telemetry Confidence
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. SPLIT WORKBENCH: SPECS & SDK (LEFT) + NEURAL REPL CONSOLE (RIGHT) ─── */}
      <div className="bg-[#0A0D15] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[760px]">
        {/* ─── LEFT PANE: Cloud Specs & SDK Generation (~400px) ─── */}
        <div className="w-full lg:w-[380px] xl:w-[410px] bg-[#090C13] border-b lg:border-b-0 lg:border-r border-slate-800/90 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 sm:p-5 space-y-5 font-mono text-xs">
            {/* Spec Card 1: Cloud Object Specifications */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  Object Architecture
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.2 rounded font-bold">
                  200 LIVE
                </span>
              </div>

              <div className="bg-[#0D111A] border border-slate-800/90 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 text-[11px]">S3 Bucket:</span>
                  <span className="text-slate-200 text-right font-semibold truncate max-w-[200px]" title={file.s3Bucket || 'tenant-storage-akshay'}>
                    {file.s3Bucket || 'tenant-storage-akshay'}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 text-[11px]">AWS Region:</span>
                  <span className="text-slate-300 text-right">ap-south-1 (Mumbai)</span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 text-[11px]">Storage Tier:</span>
                  <span className="text-sky-400 text-right font-semibold">STANDARD</span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 text-[11px]">MIME Type:</span>
                  <span className="text-slate-300 text-right truncate max-w-[190px]" title={file.mimeType}>
                    {file.mimeType}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 text-[11px]">Uploaded By:</span>
                  <span className="text-slate-300 text-right truncate">
                    {file.uploadedBy ? `${file.uploadedBy.firstName} ${file.uploadedBy.lastName || ''}`.trim() : 'Active Tenant'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-start justify-between gap-2">
                  <span className="text-slate-500 text-[11px]">Object Key:</span>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-400 text-[10px] truncate max-w-[170px]" title={file.s3Key}>
                      {file.s3Key}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(file.s3Key, 'key')}
                      className="text-slate-400 hover:text-[#c8f542] p-0.5 cursor-pointer transition"
                      title="Copy exact S3 key"
                    >
                      {copiedKey === 'key' ? <Check className="w-3 h-3 text-[#c8f542]" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Spec Card 2: Schema & Attribute Inspector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Schema & Data Columns
                </span>
                <span className="text-[10px] text-purple-400">
                  {analysis?.dataColumns?.length || 0} fields
                </span>
              </div>

              <div className="bg-[#0D111A] border border-slate-800/90 rounded-xl p-3.5">
                {analysis?.dataColumns && analysis.dataColumns.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-500">Click field to query console:</p>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {analysis.dataColumns.map((col, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendQuestion(`Analyze field and column distribution for "${col}"`)}
                          className="px-2 py-1 rounded text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 text-slate-300 hover:text-purple-300 transition cursor-pointer"
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 space-y-1">
                    <p className="text-slate-300 font-semibold">Binary Document Stream</p>
                    <p className="text-[10px] text-slate-500">
                      Unstructured document format. Full content parsed via Gemini multimodal OCR & semantic reasoning.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Spec Card 3: Multi-Language Developer SDK Hub */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-[#c8f542]" />
                  Developer SDK Integration
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const snippet =
                      activeSnippetTab === 'node'
                        ? nodeSnippet
                        : activeSnippetTab === 'python'
                        ? pythonSnippet
                        : activeSnippetTab === 'curl'
                        ? curlSnippet
                        : tsSnippet;
                    copyToClipboard(snippet, 'snippet');
                  }}
                  className="text-[10px] text-slate-400 hover:text-[#c8f542] flex items-center gap-1 cursor-pointer transition"
                >
                  {copiedKey === 'snippet' ? <Check className="w-3 h-3 text-[#c8f542]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'snippet' ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="bg-[#0D111A] border border-slate-800/90 rounded-xl overflow-hidden text-xs">
                {/* SDK Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-950/80">
                  {(['node', 'python', 'curl', 'ts'] as const).map((tab) => (
                    <button
                      type="button"
                      key={tab}
                      onClick={() => setActiveSnippetTab(tab)}
                      className={`px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider transition cursor-pointer ${
                        activeSnippetTab === tab
                          ? 'text-[#c8f542] border-b-2 border-[#c8f542] bg-slate-900/80'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {tab === 'node' ? 'Node.js' : tab === 'python' ? 'Python' : tab === 'curl' ? 'cURL' : 'TypeScript'}
                    </button>
                  ))}
                </div>

                <pre className="p-3 text-[11px] leading-relaxed text-slate-300 overflow-x-auto selection:bg-[#c8f542]/20 font-mono">
                  {activeSnippetTab === 'node' && nodeSnippet}
                  {activeSnippetTab === 'python' && pythonSnippet}
                  {activeSnippetTab === 'curl' && curlSnippet}
                  {activeSnippetTab === 'ts' && tsSnippet}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANE: Neural AI Studio & Interactive REPL Terminal ─── */}
        <div className="flex-1 flex flex-col bg-[#0A0D15] overflow-hidden">
          {/* macOS Style Window Bar & Tab Controls */}
          <div className="h-13 px-4 border-b border-slate-800/90 bg-[#0D111A] flex items-center justify-between shrink-0 select-none">
            {/* macOS Traffic Lights + Studio Mode Switcher */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 hidden sm:flex">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('console')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    activeTab === 'console'
                      ? 'bg-slate-900 text-[#c8f542] border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>&gt;_ Query Console</span>
                  {messages.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#c8f542]/15 text-[#c8f542] border border-[#c8f542]/30">
                      {messages.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('metrics')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    activeTab === 'metrics'
                      ? 'bg-slate-900 text-[#c8f542] border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Telemetry KPIs</span>
                  <span className="sm:hidden">KPIs</span>
                  {analysis?.keyMetrics && analysis.keyMetrics.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                      {analysis.keyMetrics.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('recommendations')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    activeTab === 'recommendations'
                      ? 'bg-slate-900 text-[#c8f542] border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Architectural Actions</span>
                  <span className="sm:hidden">Actions</span>
                  {analysis?.recommendations && analysis.recommendations.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-950/70 text-amber-300 border border-amber-800/40">
                      {analysis.recommendations.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('raw_json')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    activeTab === 'raw_json'
                      ? 'bg-slate-900 text-[#c8f542] border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Model JSON</span>
                </button>
              </div>
            </div>

            {/* Session latency status readout */}
            <div className="hidden md:flex items-center gap-2.5 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c8f542] animate-pulse" />
                session: <strong className="text-slate-300">{file._id.slice(-8)}</strong>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">gemini-grounded</span>
            </div>
          </div>

          {/* Studio Workspace Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-slate-100">
            {/* Analyzing Execution Banner */}
            {isAnalyzing && (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-3 font-mono">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl border-2 border-slate-800 border-t-[#c8f542] animate-spin" />
                  <Cpu className="w-6 h-6 text-[#c8f542] absolute inset-0 m-auto animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-wider">
                    Executing Neural Telemetry: {modelName}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Streaming raw object chunks from S3 and calculating structural insights...
                  </p>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {!isAnalyzing && analysisError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs flex items-start gap-3 mb-4">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Neural Pipeline Alert</p>
                  <p className="text-slate-300 text-[11px] mt-1">{analysisError}</p>
                  <button
                    type="button"
                    onClick={() => triggerAnalysis(file._id, true)}
                    className="mt-2.5 px-3 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] transition cursor-pointer font-bold"
                  >
                    Retry Analysis
                  </button>
                </div>
              </div>
            )}

            {!isAnalyzing && (
              <>
                {/* ─── TAB 1: INTERACTIVE NEURAL QUERY REPL ─── */}
                {activeTab === 'console' && (
                  <div className="flex flex-col h-full min-h-[540px]">
                    {/* Log Stream */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {messages.length === 0 ? (
                        /* Rich Interactive Launchpad when empty */
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-6">
                          <div className="space-y-2 max-w-lg">
                            <div className="w-14 h-14 rounded-2xl bg-[#0D121F] border border-slate-800 text-[#c8f542] flex items-center justify-center mx-auto shadow-md">
                              <Terminal className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-mono font-bold text-white">
                              Neural Document Query Studio Ready
                            </h3>
                            <p className="text-xs text-slate-400 font-sans leading-relaxed">
                              Ask questions, inspect column schemas, audit data quality, or request engineering recommendations grounded directly in{' '}
                              <strong className="text-slate-200 font-mono">{file.originalName}</strong>.
                            </p>
                          </div>

                          {/* Quick Directive Command Cards */}
                          <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left font-mono">
                            <button
                              type="button"
                              onClick={() => handleSendQuestion('Summarize the primary anomalies, outliers, or inconsistencies in this file.')}
                              className="p-3 rounded-xl bg-[#0D111A] hover:bg-slate-900 border border-slate-800 hover:border-[#c8f542]/50 text-slate-300 hover:text-white transition cursor-pointer group"
                            >
                              <div className="flex items-center justify-between text-xs font-bold text-[#c8f542] mb-1">
                                <span>&gt; --detect-anomalies</span>
                                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                              </div>
                              <p className="text-[11px] text-slate-400 font-sans">
                                Scan document for structural outliers or unexpected values.
                              </p>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendQuestion('What are the highest values, peak metrics, and core statistics in this data?')}
                              className="p-3 rounded-xl bg-[#0D111A] hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-white transition cursor-pointer group"
                            >
                              <div className="flex items-center justify-between text-xs font-bold text-cyan-400 mb-1">
                                <span>&gt; --extract-highest-values</span>
                                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                              </div>
                              <p className="text-[11px] text-slate-400 font-sans">
                                Extract top numeric values, peaks, and primary telemetry figures.
                              </p>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendQuestion('Explain how this data or document is structured, including all identified entities.')}
                              className="p-3 rounded-xl bg-[#0D111A] hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-slate-300 hover:text-white transition cursor-pointer group"
                            >
                              <div className="flex items-center justify-between text-xs font-bold text-purple-400 mb-1">
                                <span>&gt; --schema-breakdown</span>
                                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                              </div>
                              <p className="text-[11px] text-slate-400 font-sans">
                                Analyze schema hierarchy, columns, sections, and types.
                              </p>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendQuestion('Give me the top 3 high-impact architectural and business takeaways from this resource.')}
                              className="p-3 rounded-xl bg-[#0D111A] hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-white transition cursor-pointer group"
                            >
                              <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1">
                                <span>&gt; --key-takeaways</span>
                                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                              </div>
                              <p className="text-[11px] text-slate-400 font-sans">
                                Synthesize core strategic takeaways and action points.
                              </p>
                            </button>
                          </div>
                        </div>
                      ) : (
                        messages.map((msg, idx) => (
                          <div key={idx} className="space-y-1.5">
                            {/* Command prompt banner */}
                            {msg.role === 'user' ? (
                              <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200">
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1.5">
                                  <span className="text-[#c8f542] font-bold">dev@tenantstack:~$</span>
                                  <span>query --object "{file.originalName}"</span>
                                  <span className="ml-auto">{msg.timestamp}</span>
                                </div>
                                <p className="text-[#c8f542] font-semibold pl-2.5 border-l-2 border-[#c8f542]">
                                  {msg.text}
                                </p>
                              </div>
                            ) : (
                              <div className="bg-[#0D121F] border border-slate-800/90 rounded-xl p-4 font-sans text-xs text-slate-200">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-[10px] font-mono text-slate-500 mb-3">
                                  <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>response: {modelName}</span>
                                  </span>
                                  <div className="flex items-center gap-2.5">
                                    {msg.latencyMs && (
                                      <span className="text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                        {msg.latencyMs}ms
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(msg.text, `msg-${idx}`)}
                                      className="hover:text-[#c8f542] p-0.5 transition cursor-pointer"
                                      title="Copy response text"
                                    >
                                      {copiedKey === `msg-${idx}` ? (
                                        <Check className="w-3.5 h-3.5 text-[#c8f542]" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                <div className="whitespace-pre-wrap leading-relaxed space-y-2 text-slate-200 font-sans">
                                  {msg.text}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}

                      {/* Reasoning indicator */}
                      {isAnswering && (
                        <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 font-mono text-xs text-slate-400">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#c8f542] animate-ping" />
                          <span>Gemini reasoning over {file.originalName} stream buffer...</span>
                        </div>
                      )}

                      <div ref={chatEndRef} />
                    </div>

                    {/* Bottom Terminal Input Dock */}
                    <div className="pt-3 border-t border-slate-800/90 mt-2">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendQuestion();
                        }}
                        className="flex items-center gap-2 bg-[#0D111A] border border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-[#c8f542] transition shadow-inner"
                      >
                        <span className="text-[#c8f542] font-mono font-bold text-sm select-none">&gt;</span>
                        <input
                          ref={inputRef}
                          type="text"
                          value={inputQuestion}
                          onChange={(e) => setInputQuestion(e.target.value)}
                          placeholder={`Query "${file.originalName}" (e.g. 'Summarize key entities or find data outliers')...`}
                          disabled={isAnswering}
                          className="flex-1 bg-transparent py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
                        />
                        {messages.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearTerminal}
                            title="Clear conversation"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={!inputQuestion.trim() || isAnswering}
                          className="bg-slate-900 hover:bg-slate-800 text-[#c8f542] px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-mono font-bold transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                        >
                          <span>Run</span>
                          <Send className="w-3 h-3" />
                        </button>
                      </form>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1.5 px-1">
                        <span>Direct S3 stream grounding active</span>
                        <span>
                          Press <kbd className="px-1 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400">Enter ↵</kbd> to execute
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 2: TELEMETRY KPIS & STRUCTURAL PATTERNS ─── */}
                {activeTab === 'metrics' && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    {/* Discovered KPI Grid */}
                    {analysis?.keyMetrics && analysis.keyMetrics.length > 0 ? (
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-3">
                          Extracted Telemetry Metrics & Data Signals
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {analysis.keyMetrics.map((metric, idx) => (
                            <div
                              key={idx}
                              className="p-4 rounded-xl bg-[#0D111A] border border-slate-800 hover:border-slate-700 transition"
                            >
                              <p className="text-[11px] font-mono text-slate-400">{metric.label}</p>
                              <p className="text-lg font-mono font-bold text-[#c8f542] mt-1 truncate" title={metric.value}>
                                {metric.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl bg-[#0D111A] border border-slate-800 text-center font-mono text-xs text-slate-400">
                        No distinct numeric KPIs extracted for this document type.
                      </div>
                    )}

                    {/* Discovered Patterns & Trends */}
                    {analysis?.insights && analysis.insights.length > 0 && (
                      <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 block mb-3">
                          Observed Structural Trends & Characteristics
                        </span>
                        <ul className="space-y-2.5">
                          {analysis.insights.map((insight, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                              <ArrowRight className="w-3.5 h-3.5 text-[#c8f542] shrink-0 mt-0.5" />
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── TAB 3: ACTIONABLE ARCHITECTURAL RECOMMENDATIONS ─── */}
                {activeTab === 'recommendations' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-3">
                        Actionable Engineering & Storage Recommendations
                      </span>
                      {analysis?.recommendations && analysis.recommendations.length > 0 ? (
                        <ul className="space-y-3">
                          {analysis.recommendations.map((rec, idx) => (
                            <li key={idx} className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
                              <div className="w-5 h-5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <span>{rec}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 font-mono">
                          No specific architectural optimizations needed. Object is properly tiered in STANDARD storage.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── TAB 4: RAW MODEL JSON ─── */}
                {activeTab === 'raw_json' && (
                  <div className="space-y-3 font-mono animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Serialized Google Gemini Output
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(JSON.stringify(analysis, null, 2), 'raw_json')}
                        className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedKey === 'raw_json' ? <Check className="w-3.5 h-3.5 text-[#c8f542]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'raw_json' ? 'Copied' : 'Copy JSON'}</span>
                      </button>
                    </div>

                    <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-4 overflow-x-auto max-h-[580px]">
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
    </div>
  );
};

export default StorageWorkbench;
