import { Link } from 'react-router-dom';
import { 
  Layers, 
  ShieldCheck, 
  Zap, 
  CreditCard, 
  ArrowRight, 
  Check, 
  Lock, 
  BarChart3, 
  Server
} from 'lucide-react';

export const LandingPage = () => {
  const features = [
    {
      icon: ShieldCheck,
      title: 'Strict Tenant Data Isolation',
      description: 'Every database query is automatically scoped with compound indexes (tenantId) ensuring total isolation.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      icon: Zap,
      title: 'O(1) HashSet RBAC Engine',
      description: 'Ultra-fast sub-millisecond role-based permission checks using Set lookup data structures.',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      icon: CreditCard,
      title: 'Dynamic Plan Limits',
      description: 'Enforce subscription limits (Projects, Users, Storage) without hardcoding values in your code.',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      icon: Lock,
      title: 'JWT Authentication',
      description: 'Stateless, cryptographically signed authentication tokens embedded with tenant claims.',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      icon: BarChart3,
      title: 'Usage Analytics & Invoices',
      description: 'Track resource consumption live and generate digital invoice records for every billing tier.',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      icon: Server,
      title: 'Enterprise Architecture',
      description: 'Monorepo built with Express, TypeScript, Zod validation, and MongoDB Atlas.',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
    },
  ];

  const plans = [
    {
      name: 'FREE',
      price: '$0',
      description: 'Perfect for exploring TenantFlow features.',
      features: ['2 Team Users', '5 Active Projects', '10 MB Storage', '100 API Requests/day'],
    },
    {
      name: 'PRO',
      price: '$29',
      description: 'Built for growing teams and startups.',
      features: ['10 Team Users', '20 Active Projects', '50 MB Storage', '1,000 API Requests/day'],
      popular: true,
    },
    {
      name: 'BUSINESS',
      price: '$99',
      description: 'Enterprise grade power and capacity.',
      features: ['15 Team Users', '100 Active Projects', '100 MB Storage', '2,000 API Requests/day'],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-purple-500 selection:text-white">
      {/* Top Navbar */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-purple-600 to-indigo-500 p-2 rounded-xl shadow-lg shadow-purple-500/20">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl text-white tracking-wide">TenantFlow</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400 font-medium">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#architecture" className="hover:text-white transition">Architecture</a>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm font-semibold text-slate-300 hover:text-white transition px-4 py-2"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl transition shadow-lg shadow-purple-600/25"
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-semibold mb-8">
          <Zap className="w-4 h-4" /> Multi-Tenant SaaS Platform Engine
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
          The Next-Gen <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">Multi-Tenant Engine</span> for SaaS Applications
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mt-6 leading-relaxed">
          Enforce strict data isolation, high-performance O(1) RBAC permission checks, and dynamic subscription plan limits with zero friction.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Link
            to="/register"
            className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-8 py-4 rounded-xl transition shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 text-base"
          >
            Start Free Organization
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold px-8 py-4 rounded-xl transition text-base"
          >
            Sign In to Workspace
          </Link>
        </div>

        {/* Dashboard Preview Glassmorphism Mockup */}
        <div className="mt-16 bg-slate-900/60 border border-slate-800 rounded-3xl p-4 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800/80 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              </div>
              <span className="text-xs font-mono text-slate-500">tenantflow-dashboard.internal</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Organization</p>
                <p className="text-lg font-bold text-purple-400 mt-1">Tech Corp Inc.</p>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Active Plan</p>
                <p className="text-lg font-bold text-emerald-400 mt-1">PRO Tier ($29/mo)</p>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">RBAC Status</p>
                <p className="text-lg font-bold text-indigo-400 mt-1">O(1) HashSet Active</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-900">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-white tracking-tight">Built for Multi-Tenant Security & Performance</h2>
          <p className="text-slate-400 text-sm mt-3">Architected to support isolated B2B SaaS tenants effortlessly.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl hover:border-slate-700 transition">
                <div className={`p-3 rounded-xl border inline-block ${feat.bg}`}>
                  <Icon className={`w-6 h-6 ${feat.color}`} />
                </div>
                <h3 className="text-lg font-bold text-white mt-5">{feat.title}</h3>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">{feat.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-900">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-white tracking-tight">Transparent Plan Pricing</h2>
          <p className="text-slate-400 text-sm mt-3">Choose the right resource quota for your organization.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`bg-slate-900 border rounded-2xl p-8 relative flex flex-col justify-between ${
                plan.popular ? 'border-purple-500/50 shadow-xl shadow-purple-500/10' : 'border-slate-800'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">
                  Most Popular
                </span>
              )}

              <div>
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-slate-500 text-xs font-medium">/month</span>
                </div>

                <ul className="mt-8 space-y-3.5">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-3 text-xs text-slate-300">
                      <Check className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to="/register"
                className="mt-8 w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl text-xs text-center transition shadow-lg shadow-purple-600/20 block"
              >
                Get Started with {plan.name}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Layers className="w-5 h-5 text-purple-400" />
          <span className="font-bold text-slate-300 text-sm">TenantFlow SaaS Platform</span>
        </div>
        <p>© 2026 TenantFlow. Built with Express, TypeScript & React.</p>
      </footer>
    </div>
  );
};
