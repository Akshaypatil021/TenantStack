import React from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Server,
  Sparkles,
  Lock,
  Database,
  Cpu,
  Terminal,
  Activity,
  Users,
  FolderKanban,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Footer: React.FC = () => {
  const { tenant, user } = useAuth();

  return (
    <footer className="mt-20 -mx-6 sm:-mx-8 md:-mx-10 px-6 sm:px-8 md:px-10 pt-12 pb-10 bg-slate-100/90 border-t border-slate-200 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="max-w-[1400px] mx-auto">
        {/* Main 4-Column Navigation & Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-slate-200">
        {/* Brand & Live System Status */}
        <div className="space-y-4 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-900 text-[#c8f542] shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 tracking-tight">TenantStack</span>
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                v2.4
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Multi-tenant infrastructure workspace for software engineering teams. Cloud object storage, dedicated compute nodes, and neural data insights.
          </p>

          {/* Seamless Live Telemetry Indicator */}
          <div className="pt-1 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-700">All Systems Operational</span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                <Globe className="w-3 h-3 text-slate-400" />
                ap-south-1
              </span>
            </div>

            {/* Cloud Engine Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-600 shadow-2xs">
                <HardDrive className="w-2.5 h-2.5 text-blue-500" />
                AWS S3
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-600 shadow-2xs">
                <Sparkles className="w-2.5 h-2.5 text-purple-500" />
                Gemini 2.5
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-600 shadow-2xs">
                <Database className="w-2.5 h-2.5 text-emerald-500" />
                MongoDB
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-600 shadow-2xs">
                <Cpu className="w-2.5 h-2.5 text-amber-500" />
                Redis
              </span>
            </div>
          </div>

          {tenant && (
            <div className="pt-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Workspace</p>
              <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{tenant.name || 'Organization Space'}</p>
            </div>
          )}
        </div>

        {/* Column 1: Core Platform Services */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Platform Services</h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <Link to="/projects" className="text-slate-500 hover:text-slate-900 transition flex items-center gap-2 group">
                <FolderKanban className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900" />
                <span>Projects & Backlog</span>
              </Link>
            </li>
            <li>
              <Link to="/storage" className="text-slate-500 hover:text-slate-900 transition flex items-center gap-2 group">
                <HardDrive className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                <span>Cloud Object Storage</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1 rounded ml-auto">
                  S3
                </span>
              </Link>
            </li>
            <li>
              <Link to="/compute" className="text-slate-500 hover:text-slate-900 transition flex items-center gap-2 group">
                <Server className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600" />
                <span>Compute Clusters</span>
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="text-slate-500 hover:text-slate-900 transition flex items-center gap-2 group">
                <Activity className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900" />
                <span>Resource Telemetry</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 2: Governance & Team */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Governance</h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <Link to="/team" className="text-slate-500 hover:text-slate-900 transition flex items-center gap-2 group">
                <Users className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600" />
                <span>Team & RBAC Roles</span>
              </Link>
            </li>
            <li>
              <Link to="/billing" className="text-slate-500 hover:text-slate-900 transition flex items-center gap-2 group">
                <Sparkles className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                <span>Resource Plans & Quotas</span>
              </Link>
            </li>
            <li>
              <Link to="/activity" className="text-slate-500 hover:text-slate-900 transition flex items-center gap-2 group">
                <Terminal className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900" />
                <span>Audit & Activity Stream</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Security & Enterprise Trust */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Security & Trust</h4>
          <ul className="space-y-2.5 text-xs">
            <li className="flex items-center gap-2 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Multi-Tenant Data Enclave</span>
            </li>
            <li className="flex items-center gap-2 text-slate-500">
              <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>AES-256 S3 Object Encryption</span>
            </li>
            <li className="flex items-center gap-2 text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Row-Level Tenant Isolation</span>
            </li>
            <li className="flex items-center gap-2 text-slate-500">
              <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>99.98% High Availability SLA</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Legal & Session Strip */}
      <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>© 2026 TenantStack Technologies, Inc. All rights reserved.</p>

        <div className="text-slate-400 text-[11px]">
          <span>Logged in as: <strong className="text-slate-700">{user?.email || 'Developer'}</strong></span>
        </div>
      </div>
    </div>
  </footer>
);
};
