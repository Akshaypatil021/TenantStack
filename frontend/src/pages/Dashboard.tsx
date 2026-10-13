import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { PlansModal, type PlanCategory } from '../components/PlansModal';
import {
  FolderKanban,
  HardDrive,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  ArrowRight,
  Plus,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Shield,
  Layers,
  ChevronRight,
  LogOut,
  PieChart as PieChartIcon,
  Activity as ActivityIcon,
  Menu,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Footer } from '../components/Footer';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

interface DashboardStats {
  plan: {
    name: string;
    billing: string;
    limits: {
      maxUsers: number;
      maxProjects: number;
      maxStorageMB: number;
      maxApiRequestsPerDay: number;
    };
  };
  projects: {
    total: number;
    maxAllowed: number;
    percentUsed: number;
    byStatus: Record<string, number>;
  };
  tasks: {
    total: number;
    totalStoryPoints: number;
    completionRate: number;
    velocityPoints: number;
    byStatus: {
      BACKLOG: number;
      TODO: number;
      IN_PROGRESS: number;
      IN_REVIEW: number;
      DONE: number;
    };
    byPriority: {
      URGENT: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
    };
  };
  storage: {
    usedMB: number;
    maxMB: number;
    percentUsed: number;
    totalFiles: number;
  };
  team: {
    totalMembers: number;
    maxAllowed: number;
    percentUsed: number;
  };
  recentActivity: Array<{
    _id: string;
    action: string;
    details: string;
    createdAt: string;
    userId?: {
      firstName?: string;
      lastName?: string;
      email?: string;
    };
  }>;
  recentTasks: Array<{
    _id: string;
    title: string;
    status: string;
    priority: string;
    sprint?: string;
    storyPoints?: number;
    updatedAt: string;
    assignedTo?: {
      name?: string;
    };
  }>;
  tasksTrend: Array<{
    date: string;
    day: string;
    tasks: number;
    points: number;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: '#94a3b8',
  TODO: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  IN_REVIEW: '#8b5cf6',
  DONE: '#10b981',
};

const PRIORITY_BADGES: Record<string, { bg: string; text: string }> = {
  URGENT: { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'Urgent' },
  HIGH: { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'High' },
  MEDIUM: { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'Medium' },
  LOW: { bg: 'bg-slate-50 text-slate-600 border-slate-200', text: 'Low' },
};

export const Dashboard = () => {
  const { user, tenant, logout, token } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'consumption' | 'tasks' | 'activity'>('overview');

  // Plans Modal
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [plansModalCategory, setPlansModalCategory] = useState<PlanCategory>('compute');

  const openPlans = (cat: PlanCategory = 'compute') => {
    setPlansModalCategory(cat);
    setIsPlansModalOpen(true);
  };

  const fetchStats = useCallback(async (isSilent = false) => {
    if (!token) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch('http://localhost:5000/api/v1/dashboard/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userInitials =
    `${user?.firstName?.charAt(0) || ''}${user?.lastName?.charAt(0) || ''}`.toUpperCase() || 'U';

  // Format Storage string
  const formatStorage = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  // Pie chart data for tasks breakdown
  const taskPieData = stats
    ? [
        { name: 'Done', value: stats.tasks.byStatus.DONE || 0, color: STATUS_COLORS.DONE },
        { name: 'In Progress', value: stats.tasks.byStatus.IN_PROGRESS || 0, color: STATUS_COLORS.IN_PROGRESS },
        { name: 'In Review', value: stats.tasks.byStatus.IN_REVIEW || 0, color: STATUS_COLORS.IN_REVIEW },
        { name: 'To Do', value: stats.tasks.byStatus.TODO || 0, color: STATUS_COLORS.TODO },
        { name: 'Backlog', value: stats.tasks.byStatus.BACKLOG || 0, color: STATUS_COLORS.BACKLOG },
      ].filter((d) => d.value > 0)
    : [];

  // Quota Comparison Data for BarChart
  const quotaComparisonData = stats
    ? [
        {
          name: 'Storage',
          used: stats.storage.percentUsed,
          remaining: Math.max(0, 100 - stats.storage.percentUsed),
          unit: '%',
          detail: `${formatStorage(stats.storage.usedMB)} of ${formatStorage(stats.storage.maxMB)}`,
        },
        {
          name: 'Projects',
          used: stats.projects.percentUsed,
          remaining: Math.max(0, 100 - stats.projects.percentUsed),
          unit: '%',
          detail: `${stats.projects.total} of ${stats.projects.maxAllowed} allocated`,
        },
        {
          name: 'Team Seats',
          used: stats.team.percentUsed,
          remaining: Math.max(0, 100 - stats.team.percentUsed),
          unit: '%',
          detail: `${stats.team.totalMembers} of ${stats.team.maxAllowed} seats`,
        },
      ]
    : [];

  return (
    <div className="flex min-h-screen bg-[#fafbfc] text-slate-900 selection:bg-[#c8f542] selection:text-slate-900">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* ─── Top Navigation Bar ─── */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Mobile Sidebar Toggle */}
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
                className="lg:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <span className="text-[#5E9F71] font-semibold text-sm">Dashboard</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
              <span className="text-slate-400 text-sm capitalize hidden sm:inline">Live Consumption & Resource Metrics</span>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchStats(true)}
                disabled={refreshing}
                title="Refresh Live Metrics"
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#5E9F71]' : ''}`} />
                <span className="hidden sm:inline">
                  {refreshing ? 'Syncing...' : lastRefreshed ? `Synced ${lastRefreshed}` : 'Sync'}
                </span>
              </button>

              {user?.email === 'admin@gmail.com' && (
                <Link
                  to="/admin"
                  className="p-2 text-slate-400 hover:text-[#5E9F71] hover:bg-[#c8f542]/10 rounded-xl transition"
                  title="Admin Panel"
                >
                  <Shield className="w-4 h-4" />
                </Link>
              )}

              <div className="w-px h-6 bg-slate-200 mx-1"></div>

              <div
                className="flex items-center gap-3 group cursor-pointer"
                onClick={handleLogout}
                title="Sign Out"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c8f542] to-[#5E9F71] flex items-center justify-center text-slate-900 font-bold text-xs shadow-sm">
                  {userInitials}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-bold text-slate-800 leading-none">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                    {user?.developerRole || 'Developer'}
                  </p>
                </div>
                <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 transition hidden lg:block" />
              </div>
            </div>
          </div>
        </header>

        {/* ─── Main Content ─── */}
        <main className="max-w-[1400px] mx-auto px-6 md:px-10 pt-8 pb-0 flex-1 w-full space-y-8">
          {/* Welcome & Plan Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#c8f542]/20 text-[#3b6647] border border-[#c8f542]/50">
                  <Sparkles className="w-3 h-3 text-[#5E9F71]" />
                  Active Workspace
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {tenant?.name || 'Default Workspace'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome back, {user?.firstName} 👋
              </h1>
              <p className="text-slate-500 mt-1 text-xs sm:text-sm">
                Real-time tracking of current storage consumption, project limits, sprint velocity, and team quotas.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl shadow-sm text-left">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Current Plan</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                    {stats?.plan.name || tenant?.subscriptionPlan || 'Starter Dev'}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                    {stats?.plan.billing || 'Monthly'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openPlans('compute')}
                className="bg-slate-900 hover:bg-slate-800 text-[#c8f542] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shadow-sm cursor-pointer"
              >
                <Zap className="w-4 h-4 text-[#c8f542]" />
                Change Plan
              </button>
            </div>
          </div>

          {/* Quick Tab Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200/60 text-xs">
            {[
              { id: 'overview', label: 'Overview & Velocity', icon: TrendingUp },
              { id: 'consumption', label: 'Resource Quotas & Storage', icon: HardDrive },
              { id: 'tasks', label: 'Tasks & Sprints', icon: FolderKanban },
              { id: 'activity', label: 'Real-time Feed', icon: ActivityIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#c8f542]' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ─── PRIMARY METRICS GRID (Zero Hard Coding) ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: NVMe Storage Used */}
            <motion.div
              whileHover={{ y: -2 }}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Storage Consumed</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <HardDrive className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {loading ? '...' : formatStorage(stats?.storage.usedMB || 0)}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  / {loading ? '...' : formatStorage(stats?.storage.maxMB || 5120)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      (stats?.storage.percentUsed || 0) > 85
                        ? 'bg-rose-500'
                        : (stats?.storage.percentUsed || 0) > 60
                        ? 'bg-amber-500'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(stats?.storage.percentUsed || 0, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5">
                  <span>{stats?.storage.percentUsed || 0}% utilized</span>
                  <span>{stats?.storage.totalFiles || 0} files total</span>
                </div>
              </div>
            </motion.div>

            {/* Metric 2: Projects Allocated */}
            <motion.div
              whileHover={{ y: -2 }}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Projects</span>
                <div className="w-9 h-9 rounded-xl bg-[#c8f542]/20 text-[#5E9F71] flex items-center justify-center">
                  <FolderKanban className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {loading ? '...' : stats?.projects.total || 0}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  / {loading ? '...' : stats?.projects.maxAllowed || 3} allowed
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5E9F71] transition-all duration-500"
                    style={{ width: `${Math.min(stats?.projects.percentUsed || 0, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5">
                  <span>{stats?.projects.percentUsed || 0}% quota used</span>
                  <Link to="/projects" className="text-[#5E9F71] font-bold hover:underline">
                    View &rarr;
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Metric 3: Team Collaborators */}
            <motion.div
              whileHover={{ y: -2 }}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Capacity</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {loading ? '...' : stats?.team.totalMembers || 1}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  / {loading ? '...' : stats?.team.maxAllowed || 1} seat limit
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 transition-all duration-500"
                    style={{ width: `${Math.min(stats?.team.percentUsed || 0, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5">
                  <span>{stats?.team.percentUsed || 0}% seats filled</span>
                  <Link to="/team" className="text-purple-600 font-bold hover:underline">
                    Manage &rarr;
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Metric 4: Agile Sprint Velocity */}
            <motion.div
              whileHover={{ y: -2 }}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sprint Velocity</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {loading ? '...' : `${stats?.tasks.completionRate || 0}%`}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  ({stats?.tasks.velocityPoints || 0} pts done)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(stats?.tasks.completionRate || 0, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5">
                  <span>{stats?.tasks.byStatus.DONE || 0} of {stats?.tasks.total || 0} tasks done</span>
                  <span className="text-emerald-600 font-bold">Active</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ─── INTERACTIVE CHARTS & VISUALIZATIONS ─── */}
          {(activeTab === 'overview' || activeTab === 'consumption') && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart 1: 7-Day Velocity & Task Creation Trend */}
              <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Sprint Throughput & Activity</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Tasks created and story points tracked over the past 7 days</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#5E9F71]"></span>
                      Tasks Created
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#c8f542]"></span>
                      Story Points
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={stats?.tasksTrend || []}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="tasksGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5E9F71" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#5E9F71" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c8f542" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#c8f542" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '12px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="tasks"
                        name="Tasks"
                        stroke="#5E9F71"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#tasksGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="points"
                        name="Story Points"
                        stroke="#8bc34a"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        fillOpacity={1}
                        fill="url(#pointsGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Task Workload Distribution Donut */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-extrabold text-slate-900">Workload Breakdown</h2>
                    <span className="text-xs font-bold text-slate-400">{stats?.tasks.total || 0} total</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">Live distribution across Kanban statuses</p>

                  <div className="h-44 w-full relative flex items-center justify-center">
                    {taskPieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={taskPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {taskPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderRadius: '10px',
                              border: 'none',
                              color: '#fff',
                              fontSize: '11px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center text-slate-400 text-xs">
                        <PieChartIcon className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                        No tasks created yet
                      </div>
                    )}

                    {taskPieData.length > 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xl font-black text-slate-900">
                          {stats?.tasks.completionRate || 0}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Done</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Legend list */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 text-xs">
                  {[
                    { label: 'Done', count: stats?.tasks.byStatus.DONE || 0, color: STATUS_COLORS.DONE },
                    { label: 'In Progress', count: stats?.tasks.byStatus.IN_PROGRESS || 0, color: STATUS_COLORS.IN_PROGRESS },
                    { label: 'In Review', count: stats?.tasks.byStatus.IN_REVIEW || 0, color: STATUS_COLORS.IN_REVIEW },
                    { label: 'To Do', count: stats?.tasks.byStatus.TODO || 0, color: STATUS_COLORS.TODO },
                    { label: 'Backlog', count: stats?.tasks.byStatus.BACKLOG || 0, color: STATUS_COLORS.BACKLOG },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.label}</span>
                      </div>
                      <span className="font-bold text-slate-800">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── RESOURCE CONSUMPTION BREAKDOWN ─── */}
          {(activeTab === 'overview' || activeTab === 'consumption') && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Quota & Resource Utilization Meters</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live enforcement thresholds for your workspace based on the current active tier
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openPlans('storage')}
                  className="text-xs font-bold text-[#5E9F71] hover:text-[#497c58] flex items-center gap-1 transition"
                >
                  Expand Quota Limits <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {quotaComparisonData.map((quota) => (
                  <div key={quota.name} className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900">{quota.name}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                          {quota.used}% used
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">{quota.detail}</p>
                    </div>

                    <div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            quota.used > 85 ? 'bg-rose-500' : quota.used > 60 ? 'bg-amber-500' : 'bg-[#5E9F71]'
                          }`}
                          style={{ width: `${Math.min(quota.used, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100% Limit</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bar Chart comparing Allocated vs Remaining */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-700 mb-3">Capacity Utilization Overview (%)</p>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={quotaComparisonData}
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                      <YAxis dataKey="name" type="category" stroke="#475569" fontSize={11} tickLine={false} />
                      <Tooltip
                        formatter={(val: any) => [`${val}%`, 'Usage']}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '10px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '11px',
                        }}
                      />
                      <Bar dataKey="used" name="Used %" fill="#5E9F71" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ─── TASKS & SPRINT WORKFLOW SECTION ─── */}
          {(activeTab === 'overview' || activeTab === 'tasks') && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recently Updated Tasks */}
              <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Sprint Task Queue</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Most recently updated tasks in your agile board</p>
                  </div>
                  <Link
                    to="/projects"
                    className="text-xs font-bold text-[#5E9F71] hover:text-[#497c58] flex items-center gap-1 transition"
                  >
                    Open Kanban Board <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {stats?.recentTasks && stats.recentTasks.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentTasks.map((task) => {
                      const priorityConfig = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.MEDIUM;
                      return (
                        <div
                          key={task._id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-100 transition"
                        >
                          <div className="flex items-start sm:items-center gap-3">
                            <div
                              className="w-2.5 h-2.5 rounded-full mt-1.5 sm:mt-0 shrink-0"
                              style={{ backgroundColor: STATUS_COLORS[task.status] || '#94a3b8' }}
                            />
                            <div>
                              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                                <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-700">
                                  {task.sprint || 'Backlog'}
                                </span>
                                <span>·</span>
                                <span>{task.storyPoints || 3} pts</span>
                                {task.assignedTo?.name && (
                                  <>
                                    <span>·</span>
                                    <span>Assigned to {task.assignedTo.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityConfig.bg}`}
                            >
                              {priorityConfig.text}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                              {task.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs font-semibold text-slate-700">No tasks currently created</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Start planning agile sprints and attach task media in the Project Workspace.
                    </p>
                    <Link
                      to="/projects"
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-[#c8f542] rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Task in Projects
                    </Link>
                  </div>
                )}
              </div>

              {/* Priority Breakdown Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 mb-1">Priority Hierarchy</h2>
                  <p className="text-xs text-slate-400 mb-4">Risk and urgency allocation across all backlog items</p>

                  <div className="space-y-3">
                    {[
                      { level: 'URGENT', count: stats?.tasks.byPriority.URGENT || 0, color: 'bg-rose-500', text: 'Urgent' },
                      { level: 'HIGH', count: stats?.tasks.byPriority.HIGH || 0, color: 'bg-amber-500', text: 'High' },
                      { level: 'MEDIUM', count: stats?.tasks.byPriority.MEDIUM || 0, color: 'bg-blue-500', text: 'Medium' },
                      { level: 'LOW', count: stats?.tasks.byPriority.LOW || 0, color: 'bg-slate-400', text: 'Low' },
                    ].map((p) => {
                      const total = stats?.tasks.total || 1;
                      const pct = Math.round((p.count / total) * 100);
                      return (
                        <div key={p.level} className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                          <div className="flex justify-between items-center text-xs mb-1.5">
                            <span className="font-bold text-slate-800">{p.text}</span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {p.count} tasks ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full ${p.color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Focus on urgent sprint blockers before initiating new backlog tickets.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── REAL-TIME ACTIVITY STREAM ─── */}
          {(activeTab === 'overview' || activeTab === 'activity') && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Workspace Activity Feed</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real audit log entries triggered by collaborators in this tenant
                  </p>
                </div>
                <Link
                  to="/activity"
                  className="text-xs font-bold text-[#5E9F71] hover:text-[#497c58] flex items-center gap-1 transition"
                >
                  View Full Audit Log <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {stats.recentActivity.slice(0, 6).map((act) => {
                    const initials = act.userId
                      ? `${act.userId.firstName?.charAt(0) || ''}${act.userId.lastName?.charAt(0) || ''}`.toUpperCase() || 'U'
                      : 'SYS';

                    return (
                      <div key={act._id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                            {initials}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 leading-snug">
                              {act.action}
                            </p>
                            <p className="text-[11px] text-slate-500">{act.details}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] shrink-0 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(act.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <ActivityIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No audit logs recorded yet in this workspace.
                </div>
              )}
            </div>
          )}

          {/* ─── QUICK SHORTCUTS TO WORKSPACE SECTIONS ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              to="/projects"
              className="bg-white border border-slate-200/80 hover:border-[#5E9F71] p-4 rounded-2xl shadow-sm hover:shadow-md transition group flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-[#c8f542]/20 text-[#5E9F71] flex items-center justify-center group-hover:bg-[#c8f542] group-hover:text-slate-900 transition">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-[#5E9F71] transition">
                  Agile Kanban
                </p>
                <p className="text-[10px] text-slate-400">Manage Sprints & Tasks</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#5E9F71] ml-auto transition" />
            </Link>

            <Link
              to="/team"
              className="bg-white border border-slate-200/80 hover:border-purple-400 p-4 rounded-2xl shadow-sm hover:shadow-md transition group flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition">
                  Team Members
                </p>
                <p className="text-[10px] text-slate-400">Invite & manage roles</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 ml-auto transition" />
            </Link>

            <Link
              to="/storage"
              className="bg-white border border-slate-200/80 hover:border-blue-400 p-4 rounded-2xl shadow-sm hover:shadow-md transition group flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                  Object Storage
                </p>
                <p className="text-[10px] text-slate-400">Files & Buckets</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 ml-auto transition" />
            </Link>

            <Link
              to="/compute"
              className="bg-white border border-slate-200/80 hover:border-amber-400 p-4 rounded-2xl shadow-sm hover:shadow-md transition group flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition">
                  Compute Nodes
                </p>
                <p className="text-[10px] text-slate-400">VMs & Instances</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 ml-auto transition" />
            </Link>
          </div>

          {/* Enterprise Footer */}
          <Footer />
        </main>

        {/* Dedicated Resource Plans Modal */}
        <PlansModal
          isOpen={isPlansModalOpen}
          onClose={() => setIsPlansModalOpen(false)}
          initialCategory={plansModalCategory}
        />
      </div>
    </div>
  );
};
