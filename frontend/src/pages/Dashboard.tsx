import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Server, HardDrive, Rocket, ArrowRight, Plus, 
  Cpu, Database, Globe, Shield, Zap, ChevronRight,
  BarChart3, Clock, CheckCircle2, Sparkles, Layers,
  LogOut, Settings, User, CreditCard, Bell
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';

const scrollReveal: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } 
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export const Dashboard = () => {
  const { user, tenant, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'compute' | 'storage'>('overview');
  
  const hasResources = !!tenant; // User has active resources if they have a tenantId
  const userInitials = `${user?.firstName?.charAt(0) || ''}${user?.lastName?.charAt(0) || ''}`.toUpperCase() || 'U';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 selection:bg-[#c8f542] selection:text-slate-900">
      
      {/* ─── Top Navigation Bar ─── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-[#c8f542] rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity"></div>
              <div className="relative bg-slate-900 text-[#c8f542] p-2 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">TenantStack</span>
          </Link>

          {/* Center Nav Tabs */}
          <nav className="hidden md:flex items-center bg-slate-100/80 rounded-xl p-1">
            {(['overview', 'compute', 'storage'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all duration-200 ${
                  activeTab === tab 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#c8f542] rounded-full"></span>
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition">
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-px h-8 bg-slate-200 mx-1"></div>
            <div className="flex items-center gap-3 group cursor-pointer" onClick={handleLogout}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c8f542] to-[#5E9F71] flex items-center justify-center text-slate-900 font-bold text-sm shadow-md">
                {userInitials}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-semibold text-slate-800 leading-none">{user?.firstName} {user?.lastName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-none">{user?.developerRole || 'Developer'}</p>
              </div>
              <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition hidden lg:block" />
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <motion.main 
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="max-w-[1400px] mx-auto px-6 md:px-10 py-8"
      >
        
        {/* Welcome Section */}
        <motion.div variants={scrollReveal} className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#5E9F71] font-semibold text-sm">Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-400 text-sm capitalize">{activeTab}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.firstName} 👋
          </h1>
          <p className="text-slate-500 mt-1.5 text-base">
            {hasResources 
              ? 'Manage your cloud resources and monitor performance.'
              : 'Your workspace is ready. Deploy your first resource to get started.'
            }
          </p>
        </motion.div>

        {/* ─── EMPTY STATE: No Resources Yet ─── */}
        {!hasResources && (
          <>
            {/* Quick Stats Banner */}
            <motion.div variants={scrollReveal} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-[#c8f542]/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#5E9F71]" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Account Status</p>
                  <p className="text-sm font-bold text-slate-900">Verified ✓</p>
                </div>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Role</p>
                  <p className="text-sm font-bold text-slate-900">{user?.developerRole || 'Developer'}</p>
                </div>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Current Plan</p>
                  <p className="text-sm font-bold text-slate-900">Free Tier</p>
                </div>
              </div>
            </motion.div>

            {/* Deploy Resource CTA Cards */}
            <motion.div variants={scrollReveal} className="mb-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Deploy Your First Resource</h2>
                <Link to="/" className="text-sm text-[#5E9F71] hover:text-[#4a8a5f] font-medium flex items-center gap-1 transition">
                  View all plans <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Compute Node Card */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="group bg-white border border-slate-100 rounded-[1.5rem] p-7 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#c8f542]/10 to-transparent rounded-bl-full"></div>
                  <div className="relative">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-14 h-14 bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
                        <Server className="w-7 h-7 text-[#c8f542]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Compute Node</h3>
                        <p className="text-sm text-slate-400">Scalable EC2-like instances</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      {['Up to 4 vCPU & 8 GB RAM', 'Auto-scaling capabilities', 'SSH & Root Access', '99.9% Uptime SLA'].map((feature) => (
                        <div key={feature} className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-[#5E9F71] flex-shrink-0" />
                          <span className="text-sm text-slate-600">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                      <div>
                        <span className="text-2xl font-bold text-slate-900">$0</span>
                        <span className="text-sm text-slate-400 ml-1">/mo to start</span>
                      </div>
                      <button className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-lg shadow-slate-900/20 group-hover:shadow-xl group-hover:shadow-slate-900/30">
                        <Rocket className="w-4 h-4" />
                        Deploy Now
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Storage Bucket Card */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="group bg-white border border-slate-100 rounded-[1.5rem] p-7 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full"></div>
                  <div className="relative">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center shadow-lg">
                        <HardDrive className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Storage Bucket</h3>
                        <p className="text-sm text-slate-400">S3-compatible object storage</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      {['Up to 5 GB Free Storage', 'CDN-backed delivery', 'Access key management', 'File versioning'].map((feature) => (
                        <div key={feature} className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="text-sm text-slate-600">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                      <div>
                        <span className="text-2xl font-bold text-slate-900">$0</span>
                        <span className="text-sm text-slate-400 ml-1">/mo to start</span>
                      </div>
                      <button className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-lg shadow-blue-600/20 group-hover:shadow-xl group-hover:shadow-blue-600/30">
                        <Plus className="w-4 h-4" />
                        Create Bucket
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* How It Works Section */}
            <motion.div variants={scrollReveal} className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-5">How It Works</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {[
                  { 
                    step: '01', 
                    icon: Sparkles, 
                    title: 'Choose a Resource', 
                    desc: 'Select a Compute Node or Storage Bucket that fits your project needs.',
                    color: 'bg-[#c8f542]/15 text-[#5E9F71]'
                  },
                  { 
                    step: '02', 
                    icon: CreditCard, 
                    title: 'Pick a Plan', 
                    desc: 'Start free or upgrade. Your workspace is created and isolated automatically.',
                    color: 'bg-blue-50 text-blue-500'
                  },
                  { 
                    step: '03', 
                    icon: Zap, 
                    title: 'Go Live', 
                    desc: 'Resources deploy in seconds. Monitor, scale, and manage from this dashboard.',
                    color: 'bg-amber-50 text-amber-500'
                  },
                ].map((item) => (
                  <div key={item.step} className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-lg hover:shadow-slate-100/50 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Step {item.step}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1.5">{item.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Upgrade Banner */}
            <motion.div variants={scrollReveal}>
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-[1.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'radial-gradient(circle at 20% 50%, #c8f542 0%, transparent 50%), radial-gradient(circle at 80% 50%, #5E9F71 0%, transparent 50%)'
                }}></div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-white mb-1">Ready to scale?</h3>
                  <p className="text-slate-400 text-sm max-w-md">
                    Upgrade to Solo Dev or Pro Dev for more vCPUs, storage, and premium support. Start building faster.
                  </p>
                </div>
                <Link 
                  to="/"
                  className="relative z-10 bg-[#c8f542] hover:bg-[#d4ff4f] text-slate-900 font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition shadow-lg shadow-[#c8f542]/20 whitespace-nowrap"
                >
                  View Plans <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </>
        )}

        {/* ─── ACTIVE STATE: Has Resources ─── */}
        {hasResources && (
          <>
            {/* Resource Metrics Grid */}
            <motion.div variants={scrollReveal} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'CPU Usage', value: '24%', icon: Cpu, color: 'text-[#5E9F71]', bg: 'bg-[#c8f542]/15' },
                { label: 'Storage Used', value: '1.2 GB', icon: Database, color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'Active Nodes', value: '2', icon: Globe, color: 'text-amber-500', bg: 'bg-amber-50' },
                { label: 'Uptime', value: '99.98%', icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-50' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-slate-100 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                    <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center`}>
                      <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
                </div>
              ))}
            </motion.div>

            {/* Active Resources List */}
            <motion.div variants={scrollReveal} className="bg-white border border-slate-100 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900">Active Resources</h2>
                <button className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition">
                  <Plus className="w-4 h-4" /> Deploy New
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'prod-api-server', type: 'Compute', status: 'Running', ip: '192.168.1.42', uptime: '14d 6h' },
                  { name: 'dev-storage-main', type: 'Storage', status: 'Running', ip: '—', uptime: '7d 12h' },
                ].map((resource) => (
                  <div key={resource.name} className="flex items-center justify-between p-4 bg-slate-50/80 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${resource.type === 'Compute' ? 'bg-slate-900 text-[#c8f542]' : 'bg-blue-600 text-white'}`}>
                        {resource.type === 'Compute' ? <Server className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 font-mono">{resource.name}</p>
                        <p className="text-xs text-slate-400">{resource.type} · {resource.ip}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-emerald-600">{resource.status}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{resource.uptime}</span>
                      </div>
                      <button className="text-slate-400 hover:text-slate-600 transition">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </motion.main>
    </div>
  );
};
