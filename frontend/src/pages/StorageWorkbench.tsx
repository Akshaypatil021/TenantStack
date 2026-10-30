import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  Download,
  RefreshCw,
  Copy,
  Check,
  Send,
  FileText,
  Database,
  Code2,
  HardDrive,
  AlertTriangle,
  Trash2,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
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

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Interactive Chat State
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

  // Scroll to bottom of chat log on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnswering]);

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
        throw new Error(data.error || 'Failed to execute data analysis');
      }

      setAnalysis(data.analysis);
      setFile((prev) => (prev ? { ...prev, aiAnalysis: data.analysis } : null));
    } catch (err: any) {
      console.error('Analysis error in workbench:', err);
      setAnalysisError(err.message || 'Error occurred while running AI analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 3. Send Question to Document Assistant
  const handleSendQuestion = async (presetQuestion?: string) => {
    const questionToSend = (presetQuestion || inputQuestion).trim();
    if (!questionToSend || !file || isAnswering || !token) return;

    const startTime = Date.now();
    const userMsg: ChatMessage = {
      role: 'user',
      text: questionToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latencyMs,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errorMsg: ChatMessage = {
        role: 'model',
        text: `⚠️ ${err.message || 'Failed to reach AI engine'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latencyMs,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAnswering(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Clear chat history
  const handleClearChat = () => {
    setMessages([]);
  };

  // 4. Download Markdown Report
  const handleDownloadReport = () => {
    if (!analysis || !file) return;
    const report = `# AI Analysis Report: ${file.originalName}
Date: ${analysis.analyzedAt ? new Date(analysis.analyzedAt).toISOString() : new Date().toISOString()}
Model: ${analysis.modelUsed || 'gemini-2.0-flash'}
S3 Bucket: ${file.s3Bucket || 'tenant-storage-akshay'}
S3 Key: ${file.s3Key}
Size: ${file.fileSizeMB} MB

## 1. Summary
${analysis.summary || 'N/A'}

## 2. Key Metrics & Extracted Values
${(analysis.keyMetrics || []).map((m) => `- **${m.label}:** ${m.value}`).join('\n')}

## 3. Discovered Patterns & Observations
${(analysis.insights || []).map((i) => `- ${i}`).join('\n')}

## 4. Recommendations
${(analysis.recommendations || []).map((r) => `- [ ] ${r}`).join('\n')}

## 5. Schema Columns (${analysis.dataColumns?.length || 0})
${(analysis.dataColumns || []).map((c) => `- \`${c}\``).join('\n')}
`;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${file.originalName}.analysis-report.md`);
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

  // Category Badge Helper
  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'DATASET':
        return {
          icon: <Database className="w-3.5 h-3.5 text-emerald-600" />,
          style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Dataset',
        };
      case 'DOCUMENT':
        return {
          icon: <FileText className="w-3.5 h-3.5 text-sky-600" />,
          style: 'bg-sky-50 text-sky-700 border-sky-200',
          label: 'Document',
        };
      case 'CODE':
        return {
          icon: <Code2 className="w-3.5 h-3.5 text-purple-600" />,
          style: 'bg-purple-50 text-purple-700 border-purple-200',
          label: 'Source Code',
        };
      default:
        return {
          icon: <HardDrive className="w-3.5 h-3.5 text-slate-600" />,
          style: 'bg-slate-100 text-slate-700 border-slate-200',
          label: cat || 'File',
        };
    }
  };

  // ─── LOADING STATE ───
  if (isLoadingFile) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
        <div>
          <p className="text-sm font-bold text-slate-900">Loading File Details</p>
          <p className="text-xs text-slate-500 mt-0.5">Retrieving cloud storage metadata & AI analysis...</p>
        </div>
      </div>
    );
  }

  // ─── ERROR STATE ───
  if (errorMessage || !file) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">File Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            {errorMessage || 'The requested storage file was not found or has been removed.'}
          </p>
        </div>
        <Link
          to="/storage"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Storage</span>
        </Link>
      </div>
    );
  }

  const s3Uri = `s3://${file.s3Bucket || 'tenant-storage-akshay'}/${file.s3Key}`;
  const categoryBadge = getCategoryBadge(file.category);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ─── 1. CLEAN TOP HEADER BAR ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* File identity and badges */}
          <div className="flex items-start sm:items-center gap-3.5">
            <Link
              to="/storage"
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition shadow-2xs flex items-center justify-center shrink-0"
              title="Back to Storage"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  {file.originalName}
                </h1>

                {/* Category Pill */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${categoryBadge.style}`}>
                  {categoryBadge.icon}
                  <span>{categoryBadge.label}</span>
                </span>

                {/* File Size */}
                <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200">
                  {file.fileSizeMB} MB
                </span>

                {/* Model Engine Badge */}
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Gemini AI
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Uploaded {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'recently'}
                <span className="mx-2">·</span>
                Bucket: <span className="font-mono text-slate-600">{file.s3Bucket || 'tenant-storage-akshay'}</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Re-run AI */}
            <button
              type="button"
              onClick={() => triggerAnalysis(file._id, true)}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-slate-900' : 'text-slate-500'}`} />
              <span>{isAnalyzing ? 'Analyzing...' : 'Re-run AI'}</span>
            </button>

            {/* Export Report */}
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={!analysis}
              title="Export Markdown Report"
              className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition shadow-xs cursor-pointer disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Download Raw File */}
            <button
              type="button"
              onClick={handleDownloadRawFile}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-xs cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. TWO-COLUMN MAIN CONTENT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─── LEFT COLUMN: File Summary & Key Insights (5 Cols) ─── */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card A: AI Executive Summary */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">AI Summary</h2>
              </div>

              {analysis?.analyzedAt && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(analysis.analyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {isAnalyzing ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Generating document summary...</p>
              </div>
            ) : analysisError ? (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                <p className="font-semibold">Analysis Failed</p>
                <p className="text-[11px] mt-0.5">{analysisError}</p>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
                {analysis?.summary || 'No summary available for this file. Click "Re-run AI" to generate insights.'}
              </p>
            )}
          </div>

          {/* Card B: Key Insights & Extracted Metrics */}
          {analysis && ((analysis.keyMetrics && analysis.keyMetrics.length > 0) || (analysis.insights && analysis.insights.length > 0)) && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900">Key Findings & Metrics</h2>

              {/* Extracted Metrics Cards */}
              {analysis.keyMetrics && analysis.keyMetrics.length > 0 && (
                <div className="grid grid-cols-2 gap-2.5">
                  {analysis.keyMetrics.map((m, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <p className="text-[11px] text-slate-500 font-medium truncate" title={m.label}>{m.label}</p>
                      <p className="text-sm font-bold text-slate-900 font-mono mt-0.5 truncate" title={m.value}>{m.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Discovered Insights Bullets */}
              {analysis.insights && analysis.insights.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-700">Observations:</p>
                  <ul className="space-y-2">
                    {analysis.insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Card C: File Specifications & Storage Details */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900">File Details</h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">S3 Bucket</span>
                <span className="font-mono text-slate-800 font-semibold">{file.s3Bucket || 'tenant-storage-akshay'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">AWS Region</span>
                <span className="text-slate-800 font-medium">ap-south-1</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">MIME Type</span>
                <span className="font-mono text-slate-700 text-[11px] truncate max-w-[200px]" title={file.mimeType}>
                  {file.mimeType}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Exact File Size</span>
                <span className="font-mono text-slate-800 font-medium">
                  {file.fileSizeMB} MB ({file.fileSizeBytes.toLocaleString()} bytes)
                </span>
              </div>

              {file.uploadedBy && (
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Uploaded By</span>
                  <span className="text-slate-800 font-medium">
                    {file.uploadedBy.firstName} {file.uploadedBy.lastName || ''}
                  </span>
                </div>
              )}

              {/* 1-Click Copy S3 URI */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-500">S3 URI</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(s3Uri, 's3uri')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono font-medium transition cursor-pointer"
                >
                  {copiedKey === 's3uri' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>Copy S3 URI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Interactive AI Assistant (7 Cols) ─── */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col h-[650px] overflow-hidden">
          {/* Chat Window Header */}
          <div className="p-4 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Document AI Assistant</h3>
                <p className="text-[11px] text-slate-400">Ask questions grounded directly in this file</p>
              </div>
            </div>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 text-xs transition cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Chat Stream Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.length === 0 ? (
              /* Clean Empty State with Quick Question Suggestion Chips */
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>

                <div className="max-w-sm space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">Ask anything about this document</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Gemini AI will inspect the contents of <strong className="text-slate-700">{file.originalName}</strong> and answer your queries in real time.
                  </p>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="w-full max-w-md space-y-2 pt-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-left">Suggested Questions</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                    {[
                      { title: 'Summarize Document', q: 'Give me a concise 3-paragraph summary of this document.' },
                      { title: 'Key Data Points', q: 'What are the most important numbers, metrics, or statistics mentioned?' },
                      { title: 'Data Structure', q: 'How is the content organized? What are the main sections or columns?' },
                      { title: 'Action Items', q: 'What are the main conclusions, action points, or takeaways?' },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendQuestion(item.q)}
                        className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left transition cursor-pointer group"
                      >
                        <p className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                          <span>{item.title}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-slate-700 transition" />
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{item.q}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Chat Conversation Messages */
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white rounded-tr-xs'
                        : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-xs shadow-2xs'
                    }`}
                  >
                    {msg.role === 'model' && (
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                          <Sparkles className="w-3 h-3" />
                          Gemini Assistant
                        </span>
                        <div className="flex items-center gap-2">
                          {msg.latencyMs && <span>{msg.latencyMs}ms</span>}
                          <button
                            type="button"
                            onClick={() => copyToClipboard(msg.text, `msg-${idx}`)}
                            className="hover:text-slate-600 cursor-pointer"
                            title="Copy response"
                          >
                            {copiedKey === `msg-${idx}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                  <span className="text-[10px] text-slate-400 px-1">{msg.timestamp}</span>
                </div>
              ))
            )}

            {/* Answering indicator */}
            {isAnswering && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 max-w-[240px]">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Analyzing document...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Dock */}
          <div className="p-3 sm:p-4 border-t border-slate-200/80 bg-white shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuestion();
              }}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 transition"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder={`Ask anything about "${file.originalName}"...`}
                disabled={isAnswering}
                className="flex-1 bg-transparent py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputQuestion.trim() || isAnswering}
                className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-40 transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>Send</span>
                <Send className="w-3 h-3" />
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-1.5 text-right pr-1">
              Press <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500">Enter ↵</kbd> to send
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageWorkbench;
