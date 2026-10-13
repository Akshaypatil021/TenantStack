import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Brain,
  TrendingUp,
  CheckCircle2,
  MessageSquare,
  Download,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  FileText,
  Database,
  Send,
  Activity,
  Layers,
  ArrowRight,
  Bot,
  User as UserIcon,
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
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'chat'>('overview');
  const [analysis, setAnalysis] = useState<IAiAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initial Load / Sync
  useEffect(() => {
    if (!isOpen || !file) {
      setAnalysis(null);
      setMessages([]);
      setInputQuestion('');
      setAnalysisError(null);
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
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to answer document question');
      }

      const botMsg: ChatMessage = {
        role: 'model',
        text: data.answer || 'No response returned from the model.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: 'model',
        text: `⚠️ Error processing query: ${err.message || 'Failed to reach AI engine'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleCopyAnalysis = () => {
    if (!analysis || !file) return;
    const report = `# Gemini AI Analysis Report: ${file.originalName}
Date: ${analysis.analyzedAt ? new Date(analysis.analyzedAt).toLocaleString() : new Date().toLocaleString()}
Model: ${analysis.modelUsed || 'gemini-2.5-flash'}

## Executive Summary
${analysis.summary || 'N/A'}

## Key Metrics & KPIs
${(analysis.keyMetrics || []).map((m) => `- **${m.label}:** ${m.value}`).join('\n')}

## Trends & Patterns
${(analysis.insights || []).map((i) => `- ${i}`).join('\n')}

## Actionable Recommendations
${(analysis.recommendations || []).map((r) => `- [ ] ${r}`).join('\n')}
`;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!analysis || !file) return;
    const report = `# Gemini AI Analysis Report: ${file.originalName}
Date: ${analysis.analyzedAt ? new Date(analysis.analyzedAt).toLocaleString() : new Date().toLocaleString()}
Model: ${analysis.modelUsed || 'gemini-2.5-flash'}

## Executive Summary
${analysis.summary || 'N/A'}

## Key Metrics & KPIs
${(analysis.keyMetrics || []).map((m) => `- **${m.label}:** ${m.value}`).join('\n')}

## Trends & Patterns
${(analysis.insights || []).map((i) => `- ${i}`).join('\n')}

## Actionable Recommendations
${(analysis.recommendations || []).map((r) => `- [ ] ${r}`).join('\n')}
`;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${file.originalName}-gemini-analysis.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || !file) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.35 }}
          className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[90vh] z-10"
        >
          {/* Glowing Ambient Gradient Header */}
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-emerald-500/15 via-[#c8f542]/10 to-transparent pointer-events-none" />

          {/* Modal Header */}
          <div className="relative p-6 pb-4 border-b border-slate-800 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="absolute inset-0 bg-[#c8f542] rounded-2xl blur-md opacity-40 animate-pulse" />
                <div className="relative bg-slate-950 text-[#c8f542] p-3 rounded-2xl border border-slate-800">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-white tracking-tight">Gemini AI Analysis</h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Brain className="w-3 h-3" />
                    {analysis?.modelUsed || 'gemini-2.5-flash'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    {file.category}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-1 truncate max-w-md">
                  {file.originalName} <span className="text-slate-600">•</span> {file.fileSizeMB} MB
                </p>
              </div>
            </div>

            {/* Header Action Tools */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => runAnalysis(true)}
                disabled={isAnalyzing}
                title="Re-run live analysis"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin text-[#c8f542]' : ''}`} />
              </button>
              <button
                onClick={handleCopyAnalysis}
                disabled={!analysis}
                title="Copy analysis report"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition disabled:opacity-50"
              >
                {copied ? <Check className="w-4 h-4 text-[#c8f542]" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={handleDownloadReport}
                disabled={!analysis}
                title="Download report (.md)"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/40">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'overview'
                  ? 'border-[#c8f542] text-[#c8f542] bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Overview & Summary
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'metrics'
                  ? 'border-[#c8f542] text-[#c8f542] bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Metrics & Trends
              {analysis?.keyMetrics && analysis.keyMetrics.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-bold">
                  {analysis.keyMetrics.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'chat'
                  ? 'border-[#c8f542] text-[#c8f542] bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Interactive Q&A
              {messages.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#c8f542]/20 text-[#c8f542] font-bold">
                  {messages.length}
                </span>
              )}
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Loading Banner */}
            {isAnalyzing && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl border-2 border-emerald-500/20 border-t-[#c8f542] animate-spin" />
                  <Sparkles className="w-6 h-6 text-[#c8f542] absolute inset-0 m-auto animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Analyzing Data with Google Gemini</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Parsing schema columns, statistical distributions, patterns, and high-impact recommendations...
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {!isAnalyzing && analysisError && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold">Analysis Failed</h4>
                  <p className="text-xs text-rose-300/80 mt-1">{analysisError}</p>
                  <button
                    onClick={() => runAnalysis(true)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold transition"
                  >
                    Retry Analysis
                  </button>
                </div>
              </div>
            )}

            {/* Main Content Render */}
            {!isAnalyzing && analysis && (
              <>
                {/* TAB 1: OVERVIEW & SUMMARY */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Executive Summary Card */}
                    <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-850 border border-slate-800 shadow-inner">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Brain className="w-24 h-24 text-[#c8f542]" />
                      </div>
                      <div className="relative flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-[#c8f542]/10 text-[#c8f542] border border-[#c8f542]/20 shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[11px] text-[#c8f542]">
                            Executive Summary
                          </h3>
                          <p className="text-sm text-slate-200 mt-1.5 leading-relaxed font-normal">
                            {analysis.summary || 'Summary generated from document context.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Telemetry Highlights Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-emerald-400" />
                          Category
                        </p>
                        <p className="text-base font-bold text-white mt-1.5">{file.category}</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#c8f542]" />
                          Record Count
                        </p>
                        <p className="text-base font-bold text-white mt-1.5">
                          {analysis.rowCount !== undefined ? analysis.rowCount.toLocaleString() : 'N/A'}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-400" />
                          Identified Fields
                        </p>
                        <p className="text-base font-bold text-white mt-1.5">
                          {analysis.dataColumns?.length || 'N/A'}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          Size
                        </p>
                        <p className="text-base font-bold text-white mt-1.5">{file.fileSizeMB} MB</p>
                      </div>
                    </div>

                    {/* Detected Schema Columns Tag Cloud */}
                    {analysis.dataColumns && analysis.dataColumns.length > 0 && (
                      <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800">
                        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                          <Database className="w-3.5 h-3.5 text-[#c8f542]" />
                          Detected Columns & Attributes ({analysis.dataColumns.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {analysis.dataColumns.map((col, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-xl text-xs font-mono bg-slate-900 border border-slate-700/60 text-slate-300 hover:border-[#c8f542]/40 hover:text-white transition"
                            >
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: METRICS, TRENDS & RECOMMENDATIONS */}
                {activeTab === 'metrics' && (
                  <div className="space-y-6">
                    {/* Key Metrics Grid */}
                    {analysis.keyMetrics && analysis.keyMetrics.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-[#c8f542]" />
                          Extracted Metrics & KPIs
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {analysis.keyMetrics.map((metric, idx) => (
                            <div
                              key={idx}
                              className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition"
                            >
                              <p className="text-xs text-slate-400 font-medium">{metric.label}</p>
                              <p className="text-lg font-bold text-white mt-1 text-[#c8f542]">
                                {metric.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Trends & Insights */}
                    {analysis.insights && analysis.insights.length > 0 && (
                      <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800">
                        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-blue-400" />
                          Key Trends & Patterns
                        </h4>
                        <ul className="space-y-2.5">
                          {analysis.insights.map((insight, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-300">
                              <ArrowRight className="w-4 h-4 text-[#c8f542] shrink-0 mt-0.5" />
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actionable Recommendations */}
                    {analysis.recommendations && analysis.recommendations.length > 0 && (
                      <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20">
                        <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Actionable Recommendations
                        </h4>
                        <ul className="space-y-2.5">
                          {analysis.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-200">
                              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
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

                {/* TAB 3: INTERACTIVE Q&A (CHAT WITH DOCUMENT) */}
                {activeTab === 'chat' && (
                  <div className="flex flex-col h-[480px]">
                    {/* Chat Messages Log */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                      {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-[#c8f542] flex items-center justify-center border border-slate-700">
                            <Bot className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-white">Ask anything about this file</h4>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm">
                              Gemini will answer your custom queries in real time using the document data context.
                            </p>
                          </div>

                          {/* Preset Question Pills */}
                          <div className="pt-3 flex flex-wrap justify-center gap-2 max-w-md">
                            {[
                              'Summarize the primary anomalies',
                              'What is the highest value in this data?',
                              'Give 3 key takeaways from this file',
                              'How is this data structured?',
                            ].map((prompt, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSendQuestion(prompt)}
                                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition"
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        messages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            {msg.role === 'model' && (
                              <div className="w-8 h-8 rounded-xl bg-slate-800 text-[#c8f542] flex items-center justify-center shrink-0 border border-slate-700">
                                <Bot className="w-4 h-4" />
                              </div>
                            )}

                            <div
                              className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                                msg.role === 'user'
                                  ? 'bg-[#c8f542] text-slate-950 font-medium'
                                  : 'bg-slate-950/80 border border-slate-800 text-slate-200'
                              }`}
                            >
                              <div className="whitespace-pre-wrap">{msg.text}</div>
                              <p
                                className={`text-[10px] mt-2 ${
                                  msg.role === 'user' ? 'text-slate-800' : 'text-slate-500'
                                }`}
                              >
                                {msg.timestamp}
                              </p>
                            </div>

                            {msg.role === 'user' && (
                              <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 border border-slate-700">
                                <UserIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        ))
                      )}

                      {/* Thinking / Streaming Indicator */}
                      {isAnswering && (
                        <div className="flex gap-3 items-center">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 text-[#c8f542] flex items-center justify-center shrink-0 border border-slate-700">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#c8f542] animate-bounce" />
                            <div className="w-2 h-2 rounded-full bg-[#c8f542] animate-bounce [animation-delay:0.2s]" />
                            <div className="w-2 h-2 rounded-full bg-[#c8f542] animate-bounce [animation-delay:0.4s]" />
                            <span className="text-xs text-slate-400 ml-1">Gemini is reasoning...</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Question Input Bar */}
                    <div className="pt-4 border-t border-slate-800 flex items-center gap-2">
                      <input
                        type="text"
                        value={inputQuestion}
                        onChange={(e) => setInputQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendQuestion()}
                        placeholder={`Ask a question about ${file.originalName}...`}
                        disabled={isAnswering}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c8f542] transition disabled:opacity-50"
                      />
                      <button
                        onClick={() => handleSendQuestion()}
                        disabled={!inputQuestion.trim() || isAnswering}
                        className="bg-slate-900 hover:bg-slate-800 text-[#c8f542] p-3 rounded-xl border border-slate-750 transition disabled:opacity-40 disabled:hover:bg-slate-900"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 px-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>S3 Object: <code className="text-slate-300 font-mono">{file.s3Key}</code></span>
            </div>
            {analysis?.analyzedAt && (
              <span>Last analyzed: {new Date(analysis.analyzedAt).toLocaleTimeString()}</span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AiAnalysisModal;
