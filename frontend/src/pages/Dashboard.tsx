import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FolderKanban, CreditCard, Shield, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { token, tenant, user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/subscriptions/current', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSubscription(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const projectUsagePercent = subscription?.usage?.projects
    ? Math.min(100, Math.round((subscription.usage.projects.used / subscription.usage.projects.max) * 100))
    : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-900/40 via-slate-900 to-indigo-900/40 border border-purple-500/20 p-8 rounded-3xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-semibold mb-3">
            <Zap className="w-3.5 h-3.5" /> Multi-Tenant Active Workspace
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed">
            Here's what's happening with <span className="text-purple-300 font-semibold">{tenant?.name}</span> today. 
            All data shown is strictly isolated to your organization.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Projects Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Projects</span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {loading ? '...' : subscription?.usage?.projects?.used ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              / {subscription?.usage?.projects?.max ?? 5} allowed
            </span>
          </div>
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${projectUsagePercent}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">{projectUsagePercent}% of plan limit used</p>
          </div>
        </div>

        {/* Current Subscription Plan */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Plan</span>
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-2xl font-bold text-purple-400 tracking-wide">
              {loading ? '...' : subscription?.plan || 'FREE'}
            </span>
            <Link
              to="/billing"
              className="text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-semibold px-3 py-1.5 rounded-lg border border-purple-500/30 transition"
            >
              Upgrade Plan
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Status: <span className="text-emerald-400 font-semibold uppercase">{subscription?.status || 'Active'}</span>
          </p>
        </div>

        {/* Security & Tenant Isolation */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security Engine</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-base font-semibold text-emerald-400">Strict Tenant Isolation</span>
            <p className="text-xs text-slate-400 mt-2">
              Every request is verified via JWT and filtered by unique Tenant ID.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Need to create a new project?</h3>
          <p className="text-xs text-slate-400 mt-1">Manage your tasks and track progress easily.</p>
        </div>
        <Link
          to="/projects"
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition shadow-lg shadow-purple-600/20"
        >
          Go to Projects
        </Link>
      </div>
    </div>
  );
};
