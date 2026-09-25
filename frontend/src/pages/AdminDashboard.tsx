import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import {
  Layers, Users, Building2, CreditCard, BarChart3,
  TrendingUp, ArrowUpRight, ArrowDownRight, Search,
  ChevronRight, ChevronLeft, LogOut, Bell, Settings,
  Server, HardDrive, Shield, Zap, Clock, Eye,
  DollarSign, UserCheck, UserX, Activity, Filter,
  FileText, RefreshCw, AlertTriangle, CheckCircle2,
  XCircle, Cpu, Database, ChevronDown, X, Home
} from 'lucide-react';

// ─── Animations ───
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

// ─── Types ───
interface AdminStats {
  totalUsers: number;
  totalTenants: number;
  activeTenants: number;
  totalPaidUsers: number;
  freeUsers: number;
  totalInvoices: number;
  totalRevenue: number;
  monthlyRevenue: Array<{ _id: { year: number; month: number }; revenue: number; count: number }>;
  planDistribution: Array<{ _id: string; count: number; revenue: number }>;
  categoryDistribution: Array<{ _id: string; count: number; revenue: number }>;
  recentUsers: Array<any>;
  recentInvoices: Array<any>;
}

type AdminTab = 'overview' | 'users' | 'subscriptions' | 'invoices';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const AdminDashboard = () => {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Table states
  const [users, setUsers] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);

  const API_BASE = 'http://localhost:5000/api/v1/admin';

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ─── Fetch Stats ───
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/stats`, { headers });
      const data = await res.json();
      if (data.success) setStats(data.stats);
      else setError(data.error || 'Failed to load stats');
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ─── Fetch Table Data ───
  const fetchUsers = useCallback(async (page = 1) => {
    setTableLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users?page=${page}&limit=10&search=${searchQuery}`, { headers });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch {}
    setTableLoading(false);
  }, [token, searchQuery]);

  const fetchSubscriptions = useCallback(async (page = 1) => {
    setTableLoading(true);
    try {
      const res = await fetch(`${API_BASE}/subscriptions?page=${page}&limit=10`, { headers });
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.subscriptions);
        setPagination(data.pagination);
      }
    } catch {}
    setTableLoading(false);
  }, [token]);

  const fetchInvoices = useCallback(async (page = 1) => {
    setTableLoading(true);
    try {
      const res = await fetch(`${API_BASE}/invoices?page=${page}&limit=10`, { headers });
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices);
        setPagination(data.pagination);
      }
    } catch {}
    setTableLoading(false);
  }, [token]);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/subscriptions/${id}/approve`, {
        method: 'PUT',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setSelectedSubscription(null);
        fetchSubscriptions(pagination.page);
        fetchStats();
      } else {
        alert(data.error || 'Failed to approve subscription');
      }
    } catch (err) {
      alert('Error approving subscription');
    }
  };

  const handleDecline = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/subscriptions/${id}/decline`, {
        method: 'PUT',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setSelectedSubscription(null);
        fetchSubscriptions(pagination.page);
        fetchStats();
      } else {
        alert(data.error || 'Failed to decline subscription');
      }
    } catch (err) {
      alert('Error declining subscription');
    }
  };

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers(1);
    if (activeTab === 'subscriptions') fetchSubscriptions(1);
    if (activeTab === 'invoices') fetchInvoices(1);
  }, [activeTab]);

  // Re-search debounce
  useEffect(() => {
    if (activeTab !== 'users') return;
    const timer = setTimeout(() => fetchUsers(1), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = () => { logout(); navigate('/'); };

  const userInitials = `${user?.firstName?.charAt(0) || ''}${user?.lastName?.charAt(0) || ''}`.toUpperCase() || 'A';

  // ─── Revenue Chart (simple bar vis) ───
  const RevenueChart = () => {
    if (!stats?.monthlyRevenue?.length) {
      return <p className="text-sm text-slate-400 text-center py-10">No revenue data yet</p>;
    }
    const sorted = [...stats.monthlyRevenue].reverse();
    const maxRevenue = Math.max(...sorted.map(m => m.revenue), 1);
    return (
      <div className="flex items-end gap-2 h-44 px-2">
        {sorted.map((m, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold text-slate-500">₹{(m.revenue / 1000).toFixed(1)}k</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(m.revenue / maxRevenue) * 100}%` }}
              transition={{ delay: i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full rounded-lg bg-gradient-to-t from-[#5E9F71] to-[#c8f542] min-h-[4px]"
            />
            <span className="text-[10px] text-slate-400">{MONTH_NAMES[m._id.month - 1]}</span>
          </div>
        ))}
      </div>
    );
  };

  // ─── Plan Distribution Chart ───
  const PlanChart = () => {
    if (!stats?.planDistribution?.length) {
      return <p className="text-sm text-slate-400 text-center py-10">No plan data</p>;
    }
    const colors = ['#c8f542', '#5E9F71', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
    const total = stats.planDistribution.reduce((s, p) => s + p.count, 0) || 1;
    return (
      <div className="space-y-3">
        {stats.planDistribution.map((plan, i) => (
          <div key={plan._id} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{plan._id}</span>
              <span className="text-slate-400">{plan.count} users · ₹{plan.revenue.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(plan.count / total) * 100}%` }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                className="h-full rounded-full"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const tabs: { id: AdminTab; label: string; icon: typeof Users }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'invoices', label: 'Invoices', icon: FileText },
  ];

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center animate-pulse">
            <Layers className="w-6 h-6 text-[#c8f542]" />
          </div>
          <p className="text-slate-400 text-sm font-medium">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 selection:bg-[#c8f542] selection:text-slate-900">

      {/* ─── Top Navigation ─── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <div className="absolute inset-0 bg-[#c8f542] rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity"></div>
                <div className="relative bg-slate-900 text-[#c8f542] p-2 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">TenantStack</span>
            </Link>
            <div className="hidden md:flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-[#c8f542]/20 to-[#5E9F71]/10 rounded-lg border border-[#c8f542]/30">
              <Shield className="w-3.5 h-3.5 text-[#5E9F71]" />
              <span className="text-xs font-bold text-[#5E9F71] tracking-wide">ADMIN</span>
            </div>
          </div>

          {/* Center Tabs */}
          <nav className="hidden lg:flex items-center bg-slate-100/80 rounded-xl p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition" title="Back to Dashboard">
              <Home className="w-5 h-5" />
            </Link>
            <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#c8f542] rounded-full"></span>
            </button>
            <div className="w-px h-8 bg-slate-200 mx-1"></div>
            <div className="flex items-center gap-3 group cursor-pointer" onClick={handleLogout} title="Sign Out">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c8f542] to-[#5E9F71] flex items-center justify-center text-slate-900 font-bold text-sm shadow-md">
                {userInitials}
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-sm font-semibold text-slate-800 leading-none">{user?.firstName} {user?.lastName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-none">Admin</p>
              </div>
              <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition hidden xl:block" />
            </div>
          </div>
        </div>
      </header>

      {/* ─── Mobile Tabs ─── */}
      <div className="lg:hidden flex overflow-x-auto gap-1 px-4 py-2 bg-white border-b border-slate-100">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Main Content ─── */}
      <motion.main
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="max-w-[1600px] mx-auto px-6 md:px-10 py-8"
      >
        {/* Page Header */}
        <motion.div variants={fadeUp} className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#5E9F71] font-semibold text-sm">Admin</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-400 text-sm capitalize">{activeTab}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
                Admin Dashboard
              </h1>
              <p className="text-slate-500 mt-1.5 text-base">
                Monitor users, subscriptions, revenue, and platform health.
              </p>
            </div>
            <button
              onClick={() => { fetchStats(); if (activeTab !== 'overview') { fetchUsers(1); fetchSubscriptions(1); fetchInvoices(1); } }}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </motion.div>

        {error && (
          <motion.div variants={fadeUp} className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <p className="text-sm text-rose-700">{error}</p>
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4 text-rose-400" /></button>
          </motion.div>
        )}

        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'overview' && stats && (
          <>
            {/* KPI Cards */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {[
                { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'from-blue-500 to-indigo-600', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
                { label: 'Active Tenants', value: stats.activeTenants, icon: Building2, color: 'from-emerald-500 to-teal-600', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600', sub: `of ${stats.totalTenants}` },
                { label: 'Paid Users', value: stats.totalPaidUsers, icon: UserCheck, color: 'from-[#5E9F71] to-[#4a8a5f]', bgColor: 'bg-[#c8f542]/10', textColor: 'text-[#5E9F71]', sub: `${stats.freeUsers} free` },
                { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'from-amber-500 to-orange-600', bgColor: 'bg-amber-50', textColor: 'text-amber-600', sub: `${stats.totalInvoices} invoices` },
              ].map((kpi, i) => {
                const Icon = kpi.icon;
                return (
                  <motion.div
                    key={kpi.label}
                    variants={fadeUp}
                    whileHover={{ y: -3 }}
                    className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-lg hover:shadow-slate-200/40 transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 ${kpi.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className={`w-6 h-6 ${kpi.textColor}`} />
                      </div>
                      <div className="flex items-center gap-1 text-emerald-500 text-xs font-medium">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>Active</span>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{kpi.value}</p>
                    <p className="text-sm text-slate-400 mt-0.5">{kpi.label}</p>
                    {kpi.sub && <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>}
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Charts Row */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue Chart */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Monthly Revenue</h3>
                    <p className="text-sm text-slate-400 mt-0.5">Last 12 months trend</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700">Revenue</span>
                  </div>
                </div>
                <RevenueChart />
              </div>

              {/* Plan Distribution */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Plan Distribution</h3>
                    <p className="text-sm text-slate-400 mt-0.5">Active subscriptions by plan</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#c8f542]/15 rounded-lg">
                    <Zap className="w-4 h-4 text-[#5E9F71]" />
                    <span className="text-xs font-bold text-[#5E9F71]">Plans</span>
                  </div>
                </div>
                <PlanChart />
              </div>
            </motion.div>

            {/* Category Breakdown + Recent Activity Row */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Category Breakdown */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Service Categories</h3>
                <div className="space-y-4">
                  {stats.categoryDistribution.length > 0 ? stats.categoryDistribution.map((cat) => (
                    <div key={cat._id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat._id === 'compute' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                        {cat._id === 'compute' ? <Cpu className="w-5 h-5 text-blue-600" /> : <Database className="w-5 h-5 text-amber-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800 capitalize">{cat._id}</p>
                        <p className="text-xs text-slate-400">{cat.count} active · ₹{cat.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-400 text-center py-6">No active subscriptions</p>
                  )}
                </div>
              </div>

              {/* Recent Users */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Recent Users</h3>
                  <button onClick={() => setActiveTab('users')} className="text-xs text-[#5E9F71] font-medium hover:text-[#4a8a5f] flex items-center gap-1">
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-3">
                  {stats.recentUsers.map((u: any) => (
                    <div key={u._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
                        {u.firstName?.charAt(0)}{u.lastName?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${u.tenantId ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {u.tenantId ? 'Active' : 'Free'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Invoices */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Recent Invoices</h3>
                  <button onClick={() => setActiveTab('invoices')} className="text-xs text-[#5E9F71] font-medium hover:text-[#4a8a5f] flex items-center gap-1">
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-3">
                  {stats.recentInvoices.map((inv: any) => (
                    <div key={inv._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${inv.status === 'PAID' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                        {inv.status === 'PAID' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{inv.plan}</p>
                        <p className="text-xs text-slate-400">{inv.tenantId?.name || 'N/A'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-900">₹{inv.amount?.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {stats.recentInvoices.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-6">No invoices yet</p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* ─── USERS TAB ─── */}
        {activeTab === 'users' && (
          <motion.div variants={fadeUp}>
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
              {/* Table Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">All Users</h3>
                  <p className="text-sm text-slate-400">{pagination.total} registered users</p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c8f542]/50 focus:border-[#c8f542] transition"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableLoading ? (
                      <tr><td colSpan={6} className="text-center py-10 text-sm text-slate-400">Loading...</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-10 text-sm text-slate-400">No users found</td></tr>
                    ) : users.map((u: any) => (
                      <tr key={u._id} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c8f542]/40 to-[#5E9F71]/30 flex items-center justify-center text-xs font-bold text-slate-700">
                              {u.firstName?.charAt(0)}{u.lastName?.charAt(0)}
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{u.firstName} {u.lastName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">{u.developerRole || 'User'}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{u.tenantId?.name || <span className="text-slate-300">—</span>}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            u.tenantId?.subscriptionPlan && u.tenantId?.subscriptionPlan !== 'FREE'
                              ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {u.tenantId?.subscriptionPlan || 'Free'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-sm text-slate-400">Page {pagination.page} of {pagination.pages}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchUsers(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => fetchUsers(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── SUBSCRIPTIONS TAB ─── */}
        {activeTab === 'subscriptions' && (
          <motion.div variants={fadeUp}>
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Active Subscriptions</h3>
                <p className="text-sm text-slate-400">{pagination.total} paid subscriptions</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Billing</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expires</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableLoading ? (
                      <tr><td colSpan={8} className="text-center py-10 text-sm text-slate-400">Loading...</td></tr>
                    ) : subscriptions.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-10 text-sm text-slate-400">No subscriptions found</td></tr>
                    ) : subscriptions.map((sub: any) => (
                      <tr key={sub._id} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c8f542]/40 to-[#5E9F71]/30 flex items-center justify-center text-xs font-bold text-slate-700">
                              {sub.fullName?.charAt(0) || sub.userId?.firstName?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{sub.fullName || `${sub.userId?.firstName || ''} ${sub.userId?.lastName || ''}`}</p>
                              <p className="text-xs text-slate-400">{sub.email || sub.userId?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-slate-800">{sub.planName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                            sub.category === 'compute' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {sub.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 capitalize">{sub.billing}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">₹{sub.amountPaid?.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            sub.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' :
                            sub.status === 'EXPIRED' ? 'bg-rose-50 text-rose-500' :
                            sub.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {sub.status === 'PENDING_APPROVAL' ? 'PENDING' : sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{new Date(sub.expiresAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {sub.status === 'PENDING_APPROVAL' && (
                            <button
                              onClick={() => setSelectedSubscription(sub)}
                              className="px-3 py-1.5 bg-[#c8f542] hover:bg-[#b0d939] text-slate-900 rounded-lg text-xs font-bold transition whitespace-nowrap"
                            >
                              Review
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-sm text-slate-400">Page {pagination.page} of {pagination.pages}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchSubscriptions(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => fetchSubscriptions(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── INVOICES TAB ─── */}
        {activeTab === 'invoices' && (
          <motion.div variants={fadeUp}>
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">All Invoices</h3>
                <p className="text-sm text-slate-400">{pagination.total} total transactions</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableLoading ? (
                      <tr><td colSpan={6} className="text-center py-10 text-sm text-slate-400">Loading...</td></tr>
                    ) : invoices.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-10 text-sm text-slate-400">No invoices yet</td></tr>
                    ) : invoices.map((inv: any) => (
                      <tr key={inv._id} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${inv.status === 'PAID' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                              {inv.status === 'PAID' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                            </div>
                            <span className="text-xs font-mono text-slate-400 truncate max-w-[140px]">{inv.transactionId}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{inv.tenantId?.name || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{inv.plan}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">₹{inv.amount?.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-sm text-slate-400">Page {pagination.page} of {pagination.pages}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchInvoices(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => fetchInvoices(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

      </motion.main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-100 py-6 mt-8">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 flex items-center justify-between text-xs text-slate-400">
          <span>© {new Date().getFullYear()} TenantStack — Admin Panel</span>
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
            System Operational
          </span>
        </div>
      </footer>
      {/* ─── REVIEW SUBSCRIPTION MODAL ─── */}
      {selectedSubscription && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Review Subscription</h3>
              <button onClick={() => setSelectedSubscription(null)} className="p-2 hover:bg-slate-50 rounded-lg transition text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 font-medium">User Name</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedSubscription.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Email</p>
                  <p className="text-sm font-semibold text-slate-800 break-all">{selectedSubscription.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Plan Requested</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedSubscription.planName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Amount Paid</p>
                  <p className="text-sm font-bold text-[#5E9F71]">₹{selectedSubscription.amountPaid?.toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 font-medium">Transaction ID</p>
                  <p className="text-sm font-mono text-slate-700 bg-slate-50 p-2 rounded-lg mt-1 break-all">
                    {selectedSubscription.transactionId}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 font-medium">Order ID</p>
                  <p className="text-sm font-mono text-slate-700 bg-slate-50 p-2 rounded-lg mt-1 break-all">
                    {selectedSubscription.orderId || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Date & Time</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {new Date(selectedSubscription.activatedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Payment Method</p>
                  <p className="text-sm font-semibold text-slate-800 capitalize">
                    {selectedSubscription.paymentMethod || 'Razorpay'}
                  </p>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => handleDecline(selectedSubscription._id)}
                  className="flex-1 py-2.5 rounded-xl border border-rose-200 text-rose-600 font-bold hover:bg-rose-50 transition"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleApprove(selectedSubscription._id)}
                  className="flex-1 py-2.5 rounded-xl bg-[#c8f542] hover:bg-[#b0d939] text-slate-900 font-bold transition"
                >
                  Approve
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
