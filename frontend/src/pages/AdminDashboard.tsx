import { useState, useEffect, useCallback, memo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Layers, Users, Building2, CreditCard, BarChart3,
  TrendingUp, ArrowUpRight, Search,
  ChevronRight, ChevronLeft, LogOut,
  Zap, Clock, UserCheck, Activity,
  FileText, RefreshCw, AlertTriangle, CheckCircle2,
  XCircle, Cpu, Database, X, Home,
  PanelLeftClose, PanelLeftOpen, Menu, Info, Shield, ClipboardList
} from 'lucide-react';

// ─── Animations ───
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

// ─── Types ───
interface AdminStats {
  totalUsers: number;
  totalTenants: number;
  activeTenants: number;
  totalPaidUsers: number;
  pendingApprovals?: number;
  freeUsers: number;
  totalInvoices: number;
  totalRevenue: number;
  monthlyRevenue: Array<{ _id: { year: number; month: number }; revenue: number; count: number }>;
  planDistribution: Array<{ _id: string; count: number; revenue: number }>;
  categoryDistribution: Array<{ _id: string; count: number; revenue: number }>;
  recentUsers: Array<any>;
  recentInvoices: Array<any>;
}

type AdminTab = 'overview' | 'financials' | 'invoices' | 'subscriptions' | 'health' | 'tenants' | 'resources' | 'users' | 'roles' | 'audit';
type SubscriptionFilter = 'ALL' | 'PENDING_APPROVAL' | 'ACTIVE' | 'CANCELLED';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Revenue Chart Component (Memoized outside parent to prevent re-animation on hover) ───
const RevenueChart = memo(({ data }: { data?: AdminStats['monthlyRevenue'] }) => {
  if (!data?.length) {
    return <p className="text-sm text-slate-400 text-center py-10">No revenue data recorded yet</p>;
  }
  const sorted = [...data].reverse();
  const maxRevenue = Math.max(...sorted.map(m => m.revenue), 1);
  return (
    <div className="flex items-end gap-2 h-44 px-2">
      {sorted.map((m, i) => (
        <div key={`${m._id.year}-${m._id.month}`} className="flex-1 flex flex-col items-center gap-1">
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
});

// ─── Plan Distribution Component (Memoized outside parent to prevent re-animation on hover) ───
const PlanChart = memo(({ data }: { data?: AdminStats['planDistribution'] }) => {
  if (!data?.length) {
    return <p className="text-sm text-slate-400 text-center py-10">No plan data available</p>;
  }
  const colors = ['#c8f542', '#5E9F71', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  const total = data.reduce((s, p) => s + p.count, 0) || 1;
  return (
    <div className="space-y-3">
      {data.map((plan, i) => (
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
});

export const AdminDashboard = () => {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sidebar states (starts minimized, auto-expands on mouse hover)
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isExpanded = sidebarPinned || sidebarHovered;

  // Table states
  const [users, setUsers] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [subFilter, setSubFilter] = useState<SubscriptionFilter>('ALL');

  // Modern Toast feedback
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const API_BASE = 'http://localhost:5000/api/v1/admin';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ─── Fetch Stats ───
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/stats`, { headers });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error || 'Failed to load stats');
      }
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
      const res = await fetch(`${API_BASE}/users?page=${page}&limit=10&search=${encodeURIComponent(searchQuery)}`, { headers });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch {}
    setTableLoading(false);
  }, [token, searchQuery]);

  const fetchSubscriptions = useCallback(async (page = 1, currentFilter = subFilter) => {
    setTableLoading(true);
    try {
      const statusParam = currentFilter !== 'ALL' ? `&status=${currentFilter}` : '';
      const res = await fetch(`${API_BASE}/subscriptions?page=${page}&limit=10${statusParam}`, { headers });
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.subscriptions);
        setPagination(data.pagination);
      }
    } catch {}
    setTableLoading(false);
  }, [token, subFilter]);

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

  // ─── Subscription Actions ───
  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/subscriptions/${id}/approve`, {
        method: 'PUT',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setSelectedSubscription(null);
        fetchSubscriptions(pagination.page, subFilter);
        fetchStats();
        showToast('success', 'Subscription Approved', 'Resources allocated to tenant successfully.');
      } else {
        showToast('error', 'Approval Failed', data.error || 'Failed to approve subscription');
      }
    } catch (err: any) {
      showToast('error', 'Network Error', err.message || 'Error approving subscription');
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
        fetchSubscriptions(pagination.page, subFilter);
        fetchStats();
        showToast('info', 'Subscription Declined', 'Subscription cancelled and tenant status set to INACTIVE.');
      } else {
        showToast('error', 'Decline Failed', data.error || 'Failed to decline subscription');
      }
    } catch (err: any) {
      showToast('error', 'Network Error', err.message || 'Error declining subscription');
    }
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers(1);
    if (activeTab === 'subscriptions') fetchSubscriptions(1, subFilter);
    if (activeTab === 'invoices') fetchInvoices(1);
  }, [activeTab, subFilter]);

  // Search debounce
  useEffect(() => {
    if (activeTab !== 'users') return;
    const timer = setTimeout(() => fetchUsers(1), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const userInitials = `${user?.firstName?.charAt(0) || ''}${user?.lastName?.charAt(0) || ''}`.toUpperCase() || 'AD';



  // Navigation Groups
  const navGroups = [
    {
      title: 'Overview',
      items: [
        { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
        { id: 'financials', label: 'Financial Analytics', icon: TrendingUp },
      ]
    },
    {
      title: 'Operations',
      items: [
        { id: 'invoices', label: 'Invoices & Billing', icon: FileText },
        { id: 'subscriptions', label: 'Subscriptions & Approvals', icon: CreditCard, badge: stats?.pendingApprovals },
        { id: 'health', label: 'System Health & Maintenance', icon: Activity },
      ]
    },
    {
      title: 'Portfolio',
      items: [
        { id: 'tenants', label: 'Tenant Directory', icon: Building2 },
        { id: 'resources', label: 'Compute & Storage Resources', icon: Database },
      ]
    },
    {
      title: 'Administration',
      items: [
        { id: 'users', label: 'Users Management', icon: Users },
        { id: 'roles', label: 'Roles & Permissions', icon: Shield },
        { id: 'audit', label: 'Audit & Activity Logs', icon: ClipboardList },
      ]
    }
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
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 selection:bg-[#c8f542] selection:text-slate-900 flex">

      {/* ─── TOAST NOTIFICATIONS ─── */}
      <div className="fixed bottom-6 right-6 z-[150] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-xl ${
                toast.type === 'success'
                  ? 'bg-slate-900/95 text-white border-emerald-500/30 shadow-emerald-500/10'
                  : toast.type === 'error'
                  ? 'bg-slate-900/95 text-white border-rose-500/30 shadow-rose-500/10'
                  : 'bg-slate-900/95 text-white border-[#c8f542]/30 shadow-[#c8f542]/10'
              }`}
            >
              <div className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                toast.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
                'bg-[#c8f542]/20 text-[#c8f542]'
              }`}>
                {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                 toast.type === 'error' ? <XCircle className="w-5 h-5" /> :
                 <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold tracking-tight">{toast.title}</p>
                {toast.message && <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white transition p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ─── DESKTOP COLLAPSIBLE LEFT SIDEBAR ─── */}
      <aside
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-100 transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-64 shadow-2xl shadow-slate-900/10' : 'w-20 shadow-none'
        }`}
      >
        {/* Brand / Top */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-[#c8f542] rounded-xl blur-md opacity-40"></div>
              <div className="relative bg-slate-900 text-[#c8f542] p-2 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            {isExpanded && (
              <span className="text-base font-bold tracking-tight text-slate-900 truncate">TenantStack</span>
            )}
          </Link>
          {isExpanded && (
            <button
              onClick={() => setSidebarPinned(!sidebarPinned)}
              className={`p-1.5 rounded-lg transition ${
                sidebarPinned
                  ? 'text-[#5E9F71] bg-[#c8f542]/20'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
              }`}
              title={sidebarPinned ? 'Unpin sidebar (auto-collapse on leave)' : 'Pin sidebar open'}
            >
              {sidebarPinned ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-6 px-3 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-6 last:mb-0">
              <div className="mb-2 px-3">
                {isExpanded ? (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{group.title}</span>
                ) : (
                  <div className="h-px bg-slate-100 my-2" />
                )}
              </div>
              <div className="space-y-1.5">
                {group.items.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as AdminTab)}
                      className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      } ${!isExpanded ? 'justify-center' : ''}`}
                      title={!isExpanded ? tab.label : undefined}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#c8f542]' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      {isExpanded && (
                        <span className="truncate whitespace-nowrap">{tab.label}</span>
                      )}

                      {/* Pending Badge */}
                      {tab.badge !== undefined && tab.badge > 0 && (
                        !isExpanded ? (
                          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
                        ) : (
                          <span className={`ml-auto px-2 py-0.5 text-[11px] font-extrabold rounded-full ${
                            isActive
                              ? 'bg-[#c8f542] text-slate-950'
                              : 'bg-amber-400 text-amber-950 animate-pulse'
                          }`}>
                            {tab.badge} Pending
                          </span>
                        )
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="pt-6 px-3">
            {isExpanded ? (
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Quick Access</span>
            ) : (
              <div className="h-px bg-slate-100 my-2" />
            )}
          </div>

          <Link
            to="/dashboard"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition group ${
              !isExpanded ? 'justify-center' : ''
            }`}
            title="Switch to Developer Console"
          >
            <Home className="w-5 h-5 text-slate-400 group-hover:text-[#5E9F71] transition shrink-0" />
            {isExpanded && <span className="truncate whitespace-nowrap">Client Console</span>}
          </Link>
        </div>



        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-100">
          <div className={`flex items-center gap-3 p-2 rounded-xl ${!isExpanded ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-[#c8f542] to-[#5E9F71] flex items-center justify-center text-slate-900 font-bold text-xs shadow-sm">
              {userInitials}
            </div>
            {isExpanded && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-[10px] text-slate-400 truncate">Super Admin</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MOBILE DRAWER (SLIDE-OVER) ─── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 bg-white h-full flex flex-col shadow-2xl z-10"
            >
              <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="bg-slate-900 text-[#c8f542] p-2 rounded-xl">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-base font-bold text-slate-900">TenantStack</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                {navGroups.map((group) => (
                  <div key={group.title} className="mb-6 last:mb-0">
                    <div className="mb-2 px-4">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{group.title}</span>
                    </div>
                    <div className="space-y-1.5">
                      {group.items.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => {
                              setActiveTab(tab.id as AdminTab);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition ${
                              isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={`w-5 h-5 ${isActive ? 'text-[#c8f542]' : 'text-slate-400'}`} />
                              <span>{tab.label}</span>
                            </div>
                            {tab.badge !== undefined && tab.badge > 0 && (
                              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-400 text-amber-950 animate-pulse">
                                {tab.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-slate-100 mt-4">
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Home className="w-5 h-5 text-slate-400" />
                    <span>Client Console</span>
                  </Link>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c8f542] to-[#5E9F71] flex items-center justify-center text-slate-900 font-bold text-xs">
                    {userInitials}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{user?.firstName} {user?.lastName}</p>
                    <p className="text-[10px] text-slate-400">Admin</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MAIN CONTENT VIEWPORT ─── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          sidebarPinned ? 'lg:pl-64' : 'lg:pl-20'
        }`}
      >
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100 h-16 flex items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#5E9F71] font-semibold">Admin Panel</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-slate-700 font-bold capitalize">{activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Pending Alert Pill */}
            {stats?.pendingApprovals !== undefined && stats.pendingApprovals > 0 && (
              <button
                onClick={() => {
                  setActiveTab('subscriptions');
                  setSubFilter('PENDING_APPROVAL');
                }}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 transition animate-pulse"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>{stats.pendingApprovals} Pending Approval</span>
              </button>
            )}

            <button
              onClick={() => {
                fetchStats();
                if (activeTab === 'users') fetchUsers(1);
                if (activeTab === 'subscriptions') fetchSubscriptions(1, subFilter);
                if (activeTab === 'invoices') fetchInvoices(1);
                showToast('info', 'Refreshed', 'Dashboard data has been updated.');
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              to="/dashboard"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              title="Developer Dashboard"
            >
              <Home className="w-5 h-5" />
            </Link>

            <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

            <div className="flex items-center gap-2.5 pl-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c8f542] to-[#5E9F71] flex items-center justify-center text-slate-900 font-bold text-xs shadow-sm">
                {userInitials}
              </div>
              <span className="hidden md:inline text-xs font-semibold text-slate-700 truncate max-w-[120px]">
                {user?.firstName}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <motion.main
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="flex-1 max-w-[1600px] w-full mx-auto px-6 md:px-10 py-8"
        >
          {/* Header Title */}
          <motion.div variants={fadeUp} className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
              {activeTab === 'overview' && 'Executive Overview'}
              {activeTab === 'financials' && 'Financial Analytics'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'subscriptions' && 'Subscriptions & Approvals'}
              {activeTab === 'invoices' && 'Invoices & Billing'}
              {activeTab === 'health' && 'System Health & Maintenance'}
              {activeTab === 'tenants' && 'Tenant Directory'}
              {activeTab === 'resources' && 'Compute & Storage Resources'}
              {activeTab === 'roles' && 'Roles & Permissions'}
              {activeTab === 'audit' && 'Audit & Activity Logs'}
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm md:text-base">
              {activeTab === 'overview' && 'Real-time telemetry, revenue analytics, and platform health status.'}
              {activeTab === 'financials' && 'Deep dive into revenue streams and financial forecasting.'}
              {activeTab === 'users' && 'Manage registered tenant accounts, developer roles, and permissions.'}
              {activeTab === 'subscriptions' && 'Review manual approval requests, payment receipts, and active plans.'}
              {activeTab === 'invoices' && 'Track automated invoices, payment references, and transaction logs.'}
              {activeTab === 'health' && 'Monitor infrastructure, platform logs, and system alerts.'}
              {activeTab === 'tenants' && 'Directory of all active and inactive tenant accounts.'}
              {activeTab === 'resources' && 'Resource allocation, usage metrics, and limits.'}
              {activeTab === 'roles' && 'Define access control and platform permissions.'}
              {activeTab === 'audit' && 'System-wide audit trail and activity tracking.'}
            </p>
          </motion.div>

          {error && (
            <motion.div variants={fadeUp} className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              <p className="text-sm text-rose-700">{error}</p>
              <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-rose-600">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ─── 1. OVERVIEW TAB ─── */}
          {activeTab === 'overview' && stats && (
            <>
              {/* KPI Stat Cards */}
              <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {[
                  { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50', sub: 'Registered developers' },
                  { label: 'Active Tenants', value: stats.activeTenants, icon: Building2, color: 'text-emerald-600', bgColor: 'bg-emerald-50', sub: `of ${stats.totalTenants} total tenants` },
                  { label: 'Paid Subscriptions', value: stats.totalPaidUsers, icon: UserCheck, color: 'text-[#5E9F71]', bgColor: 'bg-[#c8f542]/20', sub: `${stats.freeUsers} on free tier` },
                  { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-amber-600', bgColor: 'bg-amber-50', sub: `${stats.totalInvoices} settled invoices` },
                ].map((kpi) => {
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
                          <Icon className={`w-6 h-6 ${kpi.color}`} />
                        </div>
                        <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Live</span>
                        </div>
                      </div>
                      <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{kpi.value}</p>
                      <p className="text-sm font-semibold text-slate-600 mt-0.5">{kpi.label}</p>
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
                  <RevenueChart data={stats.monthlyRevenue} />
                </div>

                {/* Plan Distribution */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Plan Distribution</h3>
                      <p className="text-sm text-slate-400 mt-0.5">Active subscriptions by tier</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#c8f542]/15 rounded-lg">
                      <Zap className="w-4 h-4 text-[#5E9F71]" />
                      <span className="text-xs font-bold text-[#5E9F71]">Tiers</span>
                    </div>
                  </div>
                  <PlanChart data={stats.planDistribution} />
                </div>
              </motion.div>

              {/* Category Breakdown & Recent Streams */}
              <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Category Breakdown */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Resource Categories</h3>
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
                    <button onClick={() => setActiveTab('users')} className="text-xs text-[#5E9F71] font-semibold hover:text-[#4a8a5f] flex items-center gap-1">
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
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${u.tenantId ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
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
                    <button onClick={() => setActiveTab('invoices')} className="text-xs text-[#5E9F71] font-semibold hover:text-[#4a8a5f] flex items-center gap-1">
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
                      <p className="text-sm text-slate-400 text-center py-6">No invoices logged yet</p>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}

          {/* ─── 2. USERS TAB ─── */}
          {activeTab === 'users' && (
            <motion.div variants={fadeUp}>
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Registered Accounts</h3>
                    <p className="text-sm text-slate-400">{pagination.total} total platform users</p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c8f542]/50 focus:border-[#c8f542] transition"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/80">
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Tenant</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tableLoading ? (
                        <tr><td colSpan={6} className="text-center py-10 text-sm text-slate-400">Loading accounts...</td></tr>
                      ) : users.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-10 text-sm text-slate-400">No users found matching query</td></tr>
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

          {/* ─── 3. SUBSCRIPTIONS TAB ─── */}
          {activeTab === 'subscriptions' && (
            <motion.div variants={fadeUp}>
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                
                {/* Header & Tab Filters */}
                <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Subscription Orders</h3>
                    <p className="text-sm text-slate-400">{pagination.total} records recorded in this view</p>
                  </div>

                  {/* Filter Pill Tabs */}
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: 'ALL', label: 'All Orders' },
                      { id: 'PENDING_APPROVAL', label: 'Pending Approval', badge: stats?.pendingApprovals },
                      { id: 'ACTIVE', label: 'Active' },
                      { id: 'CANCELLED', label: 'Cancelled' },
                    ].map((filterTab) => {
                      const isSelected = subFilter === filterTab.id;
                      return (
                        <button
                          key={filterTab.id}
                          onClick={() => setSubFilter(filterTab.id as SubscriptionFilter)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                          }`}
                        >
                          <span>{filterTab.label}</span>
                          {filterTab.badge !== undefined && filterTab.badge > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              isSelected
                                ? 'bg-[#c8f542] text-slate-950'
                                : 'bg-amber-400 text-amber-950 animate-pulse'
                            }`}>
                              {filterTab.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/80">
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Subscriber</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Billing</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Expires</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tableLoading ? (
                        <tr><td colSpan={8} className="text-center py-10 text-sm text-slate-400">Loading subscriptions...</td></tr>
                      ) : subscriptions.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-10 text-sm text-slate-400">No subscriptions matching selected status</td></tr>
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
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              sub.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' :
                              sub.status === 'EXPIRED' ? 'bg-rose-50 text-rose-500' :
                              sub.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {sub.status === 'PENDING_APPROVAL' ? 'PENDING' : sub.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400">{new Date(sub.expiresAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm">
                            {sub.status === 'PENDING_APPROVAL' ? (
                              <button
                                onClick={() => setSelectedSubscription(sub)}
                                className="px-3 py-1.5 bg-[#c8f542] hover:bg-[#b0d939] text-slate-900 rounded-lg text-xs font-bold transition shadow-sm whitespace-nowrap"
                              >
                                Review Receipt
                              </button>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
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
                        onClick={() => fetchSubscriptions(pagination.page - 1, subFilter)}
                        disabled={pagination.page <= 1}
                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => fetchSubscriptions(pagination.page + 1, subFilter)}
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

          {/* ─── 4. INVOICES TAB ─── */}
          {activeTab === 'invoices' && (
            <motion.div variants={fadeUp}>
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Billing History</h3>
                  <p className="text-sm text-slate-400">{pagination.total} settled invoices</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/80">
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Transaction</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Tenant</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Settled At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tableLoading ? (
                        <tr><td colSpan={6} className="text-center py-10 text-sm text-slate-400">Loading invoices...</td></tr>
                      ) : invoices.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-10 text-sm text-slate-400">No invoices logged</td></tr>
                      ) : invoices.map((inv: any) => (
                        <tr key={inv._id} className="hover:bg-slate-50/60 transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${inv.status === 'PAID' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                {inv.status === 'PAID' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                              </div>
                              <span className="text-xs font-mono text-slate-600 truncate max-w-[140px]">{inv.transactionId}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{inv.tenantId?.name || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-800">{inv.plan}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-900">₹{inv.amount?.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
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

          {/* ─── PLACEHOLDER VIEWS ─── */}
          {['financials', 'health', 'tenants', 'resources', 'roles', 'audit'].includes(activeTab) && (
            <motion.div variants={fadeUp} className="bg-white border border-slate-100 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                <Info className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Coming Soon</h3>
              <p className="text-slate-500 max-w-md">This dedicated view for <span className="font-semibold text-slate-700 capitalize">{activeTab}</span> is currently under development. It will be available in the upcoming release.</p>
            </motion.div>
          )}
        </motion.main>

        {/* Footer */}
        <footer className="border-t border-slate-100 py-6 mt-auto">
          <div className="max-w-[1600px] mx-auto px-6 md:px-10 flex items-center justify-between text-xs text-slate-400">
            <span>© {new Date().getFullYear()} TenantStack — Admin Console</span>
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
              Production Environment
            </span>
          </div>
        </footer>
      </div>

      {/* ─── REVIEW SUBSCRIPTION RECEIPT MODAL ─── */}
      <AnimatePresence>
        {selectedSubscription && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#c8f542]/30 text-slate-900 rounded-lg">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Review Payment Receipt</h3>
                </div>
                <button
                  onClick={() => setSelectedSubscription(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Receipt Body */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">User Name</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedSubscription.fullName}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Email Address</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5 break-all">{selectedSubscription.email}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Plan Requested</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedSubscription.planName}</p>
                  </div>
                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                    <p className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider">Amount Paid</p>
                    <p className="text-base font-extrabold text-[#5E9F71] mt-0.5">₹{selectedSubscription.amountPaid?.toLocaleString()}</p>
                  </div>

                  <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Razorpay Payment ID</p>
                    <p className="text-xs font-mono text-slate-800 mt-1 break-all bg-white p-2 rounded-lg border border-slate-200">
                      {selectedSubscription.transactionId}
                    </p>
                  </div>

                  <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Razorpay Order ID</p>
                    <p className="text-xs font-mono text-slate-800 mt-1 break-all bg-white p-2 rounded-lg border border-slate-200">
                      {selectedSubscription.orderId || 'N/A'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Transaction Time</p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">
                      {new Date(selectedSubscription.activatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Method</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 capitalize">
                      {selectedSubscription.paymentMethod || 'Razorpay Gateway'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    onClick={() => handleDecline(selectedSubscription._id)}
                    className="flex-1 py-2.5 rounded-xl border border-rose-200 text-rose-600 font-bold hover:bg-rose-50 transition text-sm"
                  >
                    Decline Request
                  </button>
                  <button
                    onClick={() => handleApprove(selectedSubscription._id)}
                    className="flex-1 py-2.5 rounded-xl bg-[#c8f542] hover:bg-[#b0d939] text-slate-900 font-bold transition text-sm shadow-md"
                  >
                    Approve & Allocate
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
