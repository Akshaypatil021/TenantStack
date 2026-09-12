import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MoreVertical, Database, Lock, Sliders, Sparkles, Check } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';

// Standard scroll reveal animation variants
const scrollReveal: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 1.5, ease: [0.22, 1, 0.36, 1] } 
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const AnimatedPrice = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (displayValue === value) return;
    const step = value > displayValue ? 1 : -1;
    const timer = setInterval(() => {
      setDisplayValue((prev) => {
        if (prev === value) {
          clearInterval(timer);
          return prev;
        }
        const diff = Math.abs(value - prev);
        const inc = diff > 8 ? Math.ceil(diff / 4) * step : step * Math.min(diff, 3);
        const next = prev + inc;
        if ((step > 0 && next >= value) || (step < 0 && next <= value)) {
          clearInterval(timer);
          return value;
        }
        return next;
      });
    }, 12);
    return () => clearInterval(timer);
  }, [value, displayValue]);

  return <span>${displayValue}</span>;
};

export const LandingPage = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Pro Plan');

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* ─── Hero Wrapper with Grid Background ─── */}
      <div className="relative overflow-hidden">
        {/* Subtle Grid Background with Radial Fade */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(145, 151, 157, 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(141, 151, 163, 0.6) 1px, transparent 1px)',
            backgroundSize: '6.5rem 6.5rem',
            maskImage: 'radial-gradient(ellipse 80% 50% at 50% 50%, #211818ff 20%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 50%, #000 20%, transparent 100%)',
          }}
        />
      </div>

      {/* ─── Top Navbar ─── */}
      <header className="relative z-10 max-w-[1280px] mx-auto px-8 py-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-full bg-[#c8f542] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
            <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" stroke="#0f172a" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 6 L26 11 L16 16 L6 11 Z" fill="#c8f542" />
              <path d="M6 11 L6 13.5 L16 18.5 L26 13.5 L26 11" />
              <path d="M6 17 L16 22 L26 17" />
              <path d="M6 21 L16 26 L26 21" />
            </svg>
          </div>
          <span className="font-bold text-xl text-slate-900 tracking-tight">
            TenantStack
          </span>
        </Link>

        {/* Center Navigation */}
        <nav className="hidden md:flex items-center gap-10 text-[15px] text-slate-600 font-medium">
          <a href="#features" className="hover:text-slate-900 transition-colors duration-200">
            Features
          </a>
          <a href="#architecture" className="hover:text-slate-900 transition-colors duration-200">
            Architecture
          </a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors duration-200">
            Pricing
          </a>
          <a href="#docs" className="hover:text-slate-900 transition-colors duration-200">
            Docs
          </a>
        </nav>

        {/* Right CTA */}
        <Link
          to="/register"
          className="group hidden md:inline-flex items-center gap-3 bg-slate-900 hover:bg-[#c8f542] text-white hover:text-slate-900 text-[14px] font-semibold pl-6 pr-1.5 py-1.5 rounded-full transition-all duration-300 shadow-lg shadow-slate-900/20 hover:shadow-xl"
        >
          <span>Start Free Trial</span>
          <span className="w-8 h-8 rounded-full bg-[#c8f542] group-hover:bg-[#1c1c1f] flex items-center justify-center relative overflow-hidden flex-shrink-0 transition-colors duration-300 shadow-sm">
            {/* Outgoing dark arrow on lime circle (slides right on hover) */}
            <ArrowRight className="w-4 h-4 text-slate-900 absolute transition-all duration-300 ease-out transform translate-x-0 opacity-100 group-hover:translate-x-7 group-hover:opacity-0 stroke-[2.7]" />
            
            {/* Incoming white arrow on black circle (slides from left to center on hover) */}
            <ArrowRight className="w-4 h-4 text-white absolute transition-all duration-300 ease-out transform -translate-x-7 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 stroke-[2.7]" />
          </span>
        </Link>
      </header>

      {/* ─── Hero Section ─── */}
      <motion.section 
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="relative z-10 max-w-5xl mx-auto px-8 pt-20 pb-8 text-center"
      >
        <motion.h1 variants={scrollReveal} className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-bold text-slate-900 leading-[1.1] tracking-tight">
          {/* The Complete Engine for */}
          Architected for Scale.
          <br />
          {/* Scalable Multi-Tenant SaaS */}
          Engineered for Multi-Tenancy.
        </motion.h1>

        <motion.p variants={scrollReveal} className="text-slate-600 text-lg md:text-[17px] max-w-[760px] mx-auto mt-6 leading-relaxed">
          Stop spending months reinventing infrastructure plumbing. TenantFlow delivers
          <br className="hidden md:block" />
          the battle-tested foundation to isolate tenant data, automate team governance,
          <br className="hidden md:block" />
          and scale effortlessly from day zero.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div variants={scrollReveal} className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          {/* Primary - Get Started */}
          <Link
            to="/register"
            className="group inline-flex items-center gap-4 bg-white hover:bg-[#c8f542] text-slate-900 font-semibold text-[15px] pl-7 pr-1.5 py-1.5 rounded-full transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105 border border-slate-200/80 hover:border-transparent cursor-pointer"
          >
            <span>Get Started</span>
            <span className="w-9 h-9 rounded-full bg-[#c8f542] group-hover:bg-[#1c1c1f] flex items-center justify-center relative overflow-hidden flex-shrink-0 transition-colors duration-300 shadow-sm">
              {/* Outgoing dark arrow on lime circle (slides right on hover) */}
              <ArrowRight className="w-4 h-4 text-slate-900 absolute transition-all duration-300 ease-out transform translate-x-0 opacity-100 group-hover:translate-x-7 group-hover:opacity-0 stroke-[2.7]" />
              
              {/* Incoming white arrow on black circle (slides from left to center on hover) */}
              <ArrowRight className="w-4 h-4 text-white absolute transition-all duration-300 ease-out transform -translate-x-7 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 stroke-[2.7]" />
            </span>
          </Link>

          {/* Secondary - Learn More */}
          <a
            href="#features"
            className="group inline-flex items-center gap-4 bg-white hover:bg-[#c8f542] text-slate-900 font-semibold text-[15px] pl-7 pr-1.5 py-1.5 rounded-full transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105 border border-slate-200/80 hover:border-transparent cursor-pointer"
          >
            <span>Learn More</span>
            <span className="w-9 h-9 rounded-full bg-[#c8f542] group-hover:bg-[#1c1c1f] flex items-center justify-center relative overflow-hidden flex-shrink-0 transition-colors duration-300 shadow-sm">
              {/* Outgoing dark arrow on lime circle (slides right on hover) */}
              <ArrowRight className="w-4 h-4 text-slate-900 absolute transition-all duration-300 ease-out transform translate-x-0 opacity-100 group-hover:translate-x-7 group-hover:opacity-0 stroke-[2.7]" />
              
              {/* Incoming white arrow on black circle (slides from left to center on hover) */}
              <ArrowRight className="w-4 h-4 text-white absolute transition-all duration-300 ease-out transform -translate-x-7 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 stroke-[2.7]" />
            </span>
          </a>
        </motion.div>
      </motion.section>

      {/* ─── Floating Widget Cards ─── */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={staggerContainer}
        className="relative z-10 max-w-6xl mx-auto px-8 pt-8 pb-[60px]"
      >
        <div className="flex flex-col md:flex-row items-end justify-center gap-6 md:gap-8">

          {/* Card 1: RBAC Permission Check */}
          <motion.div variants={scrollReveal} className="w-full md:w-[260px] bg-white border border-slate-200 rounded-2xl p-5 shadow-xl shadow-slate-200/50 transform md:-rotate-3 md:translate-y-4 hover:rotate-0 hover:translate-y-0 transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                RBAC Permission Check
              </span>
              <MoreVertical className="w-4 h-4 text-slate-300" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                &lt; 0.8 ms
              </span>
            </div>
            <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
              Active
            </span>
          </motion.div>

          {/* Card 2: Tenant Data Isolation (Center, Larger) */}
          <motion.div variants={scrollReveal} className="w-full md:w-[340px] bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl shadow-slate-300/40 relative z-20 hover:shadow-slate-400/30 transition-all duration-500">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-slate-900">
                  Tenant Data Isolation:
                </span>
                <span className="text-emerald-500 font-bold text-base">Active</span>
              </div>
              <MoreVertical className="w-4 h-4 text-slate-300" />
            </div>
            <p className="text-sm text-slate-600 mb-4">Organization: TechNova Inc.</p>

            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-600 font-medium">Quota</span>
              <span className="text-slate-700 font-semibold">4/5 Projects (80%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                style={{ width: '80%' }}
              />
            </div>
          </motion.div>

          {/* Card 3: Workspace Limits */}
          <motion.div variants={scrollReveal} className="w-full md:w-[280px] bg-white border border-slate-200 rounded-2xl p-5 shadow-xl shadow-slate-200/50 transform md:rotate-2 md:translate-y-6 hover:rotate-0 hover:translate-y-0 transition-all duration-500">
            <div className="mb-4">
              <span className="text-lg font-bold text-slate-900">
                Workspace
                <br />
                Limits
              </span>
            </div>

            <div className="flex items-center gap-5">
              {/* Toggle Items */}
              {[
                { label: 'Data Isolation', active: true },
                { label: 'Active Users', active: true },
                { label: 'Storage', active: true },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {item.label}
                  </span>
                  {/* Toggle Switch */}
                  <div className="w-10 h-5 bg-emerald-500 rounded-full relative cursor-default shadow-inner">
                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-md" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </motion.section>
      </div>

      {/* ─── How it Works Section ─── */}
      <section 
        id="features" 
        className="relative z-10 max-w-6xl mx-auto px-8 py-[60px] bg-white"
      >
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={scrollReveal} className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-emerald-500 text-sm font-semibold tracking-wider uppercase block mb-3">How it Works</span>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
            How TenantFlow Engine Works
          </h2>
          <p className="text-slate-600 text-lg mt-5">
            A brief overview of the core technologies powering your enterprise application.
          </p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <motion.div variants={scrollReveal} className="bg-slate-50 rounded-3xl p-10 text-center hover:bg-slate-100 transition-colors duration-300 border border-slate-100">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
              <Database className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Total Data Isolation</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Every database query is automatically scoped with strict compound indexes. We ensure zero cross-tenant data leakage.
            </p>
          </motion.div>

          {/* Card 2 */}
          <motion.div variants={scrollReveal} className="bg-slate-50 rounded-3xl p-10 text-center hover:bg-slate-100 transition-colors duration-300 border border-slate-100">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Stateless Authentication</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Secure your APIs with stateless, cryptographically signed JWT tokens embedded with robust tenant claims.
            </p>
          </motion.div>

          {/* Card 3 */}
          <motion.div variants={scrollReveal} className="bg-slate-50 rounded-3xl p-10 text-center hover:bg-slate-100 transition-colors duration-300 border border-slate-100">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
              <Sliders className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Dynamic Quotas</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Automatically restrict tenant resources based on their active subscription plans. Upgrade limits without code changes.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── In-Depth Features Section ─── */}
      <section 
        className="relative z-10 max-w-6xl mx-auto px-8 py-[60px] bg-white border-t border-slate-100"
      >
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={scrollReveal} className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-emerald-500 text-sm font-semibold tracking-wider uppercase block mb-3">Key Features</span>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
            In-Depth Architecture of Our Multi-Tenant Engine
          </h2>
          <p className="text-slate-600 text-lg mt-5">
            The foundational building blocks engineered to keep your tenant data isolated, secure, and resource-bounded on shared cloud infrastructure.
          </p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: Data Isolation */}
          <motion.div variants={scrollReveal} className="h-full">
            <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 md:p-10 flex flex-col h-full hover:shadow-lg hover:border-slate-200 transition-all duration-300">
            <h3 className="text-2xl font-bold text-slate-900 mb-4 pr-8">
              Guarantees Strict Logical Data Isolation Across All Tenants
            </h3>
            <p className="text-slate-600 text-base leading-relaxed mb-10">
              Every database query is automatically scoped with compound tenant indexes, eliminating cross-tenant leakage and horizontal privilege escalation.
            </p>
            
            {/* Visual Mockup - Card 1 */}
            <div className="mt-auto bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex-1">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Query Scoping Status</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full tracking-wide">SECURE</span>
                </div>
                <div className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  Real-time Guard
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-medium text-slate-700">Cross-Tenant Leakage Check</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-md">PASS</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-medium text-slate-700">Compound Index Injection</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-md">PASS</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-medium text-slate-700">Average Routing Latency</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">&lt; 0.8ms</span>
                </div>
              </div>
            </div>
            </div>
          </motion.div>

          {/* Card 2: Comprehensive Tenant Audit Logging */}
          <motion.div variants={scrollReveal} className="h-full">
            <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 md:p-10 flex flex-col h-full hover:shadow-lg hover:border-slate-200 transition-all duration-300">
            <h3 className="text-2xl font-bold text-slate-900 mb-4 pr-8">
              Comprehensive Tenant Audit Logging
            </h3>
            <p className="text-slate-600 text-base leading-relaxed mb-10">
              Monitor all organization activities over time. Track logins, role modifications, and resource access to maintain compliance and security.
            </p>
            
            {/* Visual Mockup - Card 2 (Timeline / Gantt) */}
            <div className="mt-auto bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Audit Status</span>
                  <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded-full tracking-wide">4 NEW</span>
                </div>
                <div className="text-xs font-medium text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 shadow-sm cursor-pointer">
                  24 Hours
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <p className="text-[11px] font-medium text-slate-400 mb-8">Viewing last 24 hours report</p>

              {/* Chart Area */}
              <div className="relative flex-1 min-h-[180px]">
                {/* Grid Lines */}
                <div className="absolute inset-0 flex justify-between pl-20 pr-4 border-t border-slate-100 pt-2">
                  <div className="w-px h-[90%] border-l border-dashed border-slate-200"></div>
                  <div className="w-px h-[90%] border-l border-dashed border-slate-200"></div>
                  <div className="w-px h-[90%] border-l border-dashed border-slate-200"></div>
                  <div className="w-px h-[90%] border-l border-dashed border-slate-200"></div>
                  <div className="w-px h-[90%] border-l border-dashed border-slate-200"></div>
                </div>

                {/* Rows */}
                <div className="relative z-10 space-y-4 pt-3">
                  {/* Row 1 */}
                  <div className="flex items-center">
                    <div className="w-20 text-[11px] font-medium text-slate-400">Logins</div>
                    <div className="flex-1 relative h-7">
                      <div className="absolute left-[10%] w-[20%] h-full bg-slate-100 rounded-md"></div>
                      <div className="absolute left-[35%] w-[35%] h-full bg-[#d6ff5c] rounded-md shadow-sm border border-[#c8f542]/20"></div>
                    </div>
                  </div>
                  {/* Row 2 */}
                  <div className="flex items-center">
                    <div className="w-20 text-[11px] font-medium text-slate-400">Roles</div>
                    <div className="flex-1 relative h-7">
                      <div className="absolute left-[15%] w-[25%] h-full bg-slate-100 rounded-md"></div>
                      <div className="absolute left-[45%] w-[40%] h-full bg-[#d6ff5c] rounded-md shadow-sm border border-[#c8f542]/20"></div>
                    </div>
                  </div>
                  {/* Row 3 */}
                  <div className="flex items-center">
                    <div className="w-20 text-[11px] font-medium text-slate-400">Projects</div>
                    <div className="flex-1 relative h-7">
                      <div className="absolute left-[5%] w-[15%] h-full bg-slate-100 rounded-md"></div>
                      <div className="absolute left-[25%] w-[30%] h-full bg-[#d6ff5c] rounded-md shadow-sm border border-[#c8f542]/20"></div>
                    </div>
                  </div>
                  {/* Row 4 */}
                  <div className="flex items-center">
                    <div className="w-20 text-[11px] font-medium text-slate-400">S3 Access</div>
                    <div className="flex-1 relative h-7">
                      <div className="absolute left-[0%] w-[10%] h-full bg-slate-100 rounded-md"></div>
                      <div className="absolute left-[15%] w-[45%] h-full bg-[#d6ff5c] rounded-md shadow-sm border border-[#c8f542]/20"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* X Axis Labels */}
              <div className="flex justify-between pl-20 pr-4 mt-2 mb-4 text-[10px] font-semibold text-slate-400 border-t border-slate-100 pt-3">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-auto">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#c8f542]"></div>
                  <span className="text-[11px] font-semibold text-slate-600">Authorized Actions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                  <span className="text-[11px] font-semibold text-slate-600">Denied Attempts</span>
                </div>
              </div>
            </div>
            </div>
          </motion.div>
        </motion.div>

        {/* ─── Horizontal Feature Card (API Gateway) ─── */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={scrollReveal} className="mt-8">
          <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-10 md:p-14 flex flex-col lg:flex-row gap-12 lg:gap-16 items-center hover:shadow-lg hover:border-slate-200 transition-all duration-300">
          
          {/* Left Side (Text & CTA) */}
          <div className="lg:w-1/3 flex flex-col justify-center">
            <h3 className="text-3xl font-bold text-slate-900 mb-6 leading-tight">
              API Gateway & Traffic Analytics
            </h3>
            <p className="text-slate-600 text-base leading-relaxed mb-8">
              Monitor every API request hitting your multi-tenant engine. Analyze traffic spikes, track bandwidth usage, and automatically throttle abusive tenants before they impact system performance. This provides a clear audit trail for compliance and security investigations.
            </p>
            <div>
              <a
                href="#architecture"
                className="group inline-flex items-center gap-4 bg-white hover:bg-[#c8f542] text-slate-900 font-semibold text-[15px] pl-7 pr-1.5 py-1.5 rounded-full transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105 border border-slate-200/80 hover:border-transparent cursor-pointer"
              >
                <span>Learn More</span>
                <span className="w-9 h-9 rounded-full bg-[#c8f542] group-hover:bg-[#1c1c1f] flex items-center justify-center relative overflow-hidden flex-shrink-0 transition-colors duration-300 shadow-sm">
                  {/* Outgoing dark arrow on lime circle (slides right on hover) */}
                  <ArrowRight className="w-4 h-4 text-slate-900 absolute transition-all duration-300 ease-out transform translate-x-0 opacity-100 group-hover:translate-x-7 group-hover:opacity-0 stroke-[2.7]" />
                  
                  {/* Incoming white arrow on black circle (slides from left to center on hover) */}
                  <ArrowRight className="w-4 h-4 text-white absolute transition-all duration-300 ease-out transform -translate-x-7 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 stroke-[2.7]" />
                </span>
              </a>
            </div>
          </div>

          {/* Right Side (Chart & Stats) */}
          <div className="lg:w-2/3 w-full bg-white border border-slate-100 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row gap-8">
            
            {/* Chart Area */}
            <div className="flex-1 flex flex-col">
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-lg font-bold text-slate-900">Traffic Activity</h4>
                  <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded-full tracking-wide">4 NEW</span>
                </div>
                <p className="text-[11px] font-medium text-slate-400">Viewing last 24 hours report</p>
              </div>

              {/* Bar Chart Mockup (Matching Reference Image) */}
              <div className="relative w-full h-[240px] mt-6 mb-2">
                
                {/* Y Axis Grid Lines & Labels */}
                <div className="absolute inset-0 flex flex-col justify-between pb-8 pt-2">
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-medium text-slate-400 w-4 text-right">30</span>
                    <div className="flex-1 border-t border-dashed border-slate-200"></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-medium text-slate-400 w-4 text-right">20</span>
                    <div className="flex-1 border-t border-dashed border-slate-200"></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-medium text-slate-400 w-4 text-right">15</span>
                    <div className="flex-1 border-t border-dashed border-slate-200"></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-medium text-slate-400 w-4 text-right">10</span>
                    <div className="flex-1 border-t border-dashed border-slate-200"></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-medium text-slate-400 w-4 text-right">5</span>
                    <div className="flex-1 border-t border-dashed border-slate-200"></div>
                  </div>
                </div>

                {/* Vertical Grid Lines */}
                <div className="absolute inset-0 flex justify-between pl-12 pr-4 pb-8 pt-2">
                  <div className="w-px h-full border-l border-dashed border-slate-200 opacity-60 ml-[1.1rem]"></div>
                  <div className="w-px h-full border-l border-dashed border-slate-200 opacity-60 ml-[0.8rem]"></div>
                  <div className="w-px h-full border-l border-dashed border-slate-200 opacity-60 ml-[0.6rem]"></div>
                  <div className="w-px h-full border-l border-dashed border-slate-200 opacity-60 ml-[0.4rem]"></div>
                  <div className="w-px h-full border-l border-dashed border-slate-200 opacity-60 mr-1"></div>
                  <div className="w-px h-full border-l border-dashed border-slate-200 opacity-60 mr-[1.3rem]"></div>
                </div>

                {/* Bars Area */}
                <div className="absolute inset-0 pl-12 pr-4 flex justify-between items-center h-full pb-8 pt-2">
                  {/* Month 1 */}
                  <div className="relative w-11 sm:w-12 h-full flex justify-center">
                    <div className="absolute bottom-[51%] w-full h-[32%] bg-[#5E9F71] rounded-xl shadow-sm"></div>
                    <div className="absolute top-[51%] w-full h-[40%] bg-slate-100 rounded-xl"></div>
                  </div>
                  {/* Month 2 */}
                  <div className="relative w-11 sm:w-12 h-full flex justify-center">
                    <div className="absolute bottom-[51%] w-full h-[22%] bg-[#5E9F71] rounded-xl shadow-sm"></div>
                    <div className="absolute top-[51%] w-full h-[30%] bg-slate-100 rounded-xl"></div>
                  </div>
                  {/* Month 3 */}
                  <div className="relative w-11 sm:w-12 h-full flex justify-center">
                    <div className="absolute bottom-[51%] w-full h-[43%] bg-[#5E9F71] rounded-xl shadow-sm"></div>
                    <div className="absolute top-[51%] w-full h-[45%] bg-slate-100 rounded-xl"></div>
                  </div>
                  {/* Month 4 */}
                  <div className="relative w-11 sm:w-12 h-full flex justify-center">
                    <div className="absolute bottom-[51%] w-full h-[33%] bg-[#5E9F71] rounded-xl shadow-sm"></div>
                    <div className="absolute top-[51%] w-full h-[35%] bg-slate-100 rounded-xl"></div>
                  </div>
                  {/* Month 5 */}
                  <div className="relative w-11 sm:w-12 h-full flex justify-center">
                    <div className="absolute bottom-[51%] w-full h-[50%] bg-[#5E9F71] rounded-xl shadow-sm"></div>
                    <div className="absolute top-[51%] w-full h-[43%] bg-slate-100 rounded-xl"></div>
                  </div>
                  {/* Month 6 */}
                  <div className="relative w-11 sm:w-12 h-full flex justify-center">
                    <div className="absolute bottom-[51%] w-full h-[38%] bg-[#5E9F71] rounded-xl shadow-sm"></div>
                    <div className="absolute top-[51%] w-full h-[38%] bg-slate-100 rounded-xl"></div>
                  </div>
                </div>

                {/* X Axis Labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between pl-[3.5rem] pr-4 text-[11px] font-medium text-slate-400">
                  <span className="w-12 text-center">Jan</span>
                  <span className="w-12 text-center">Feb</span>
                  <span className="w-12 text-center">Mar</span>
                  <span className="w-12 text-center">Apr</span>
                  <span className="w-12 text-center">May</span>
                  <span className="w-12 text-center">Jun</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-8">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#5fb57d]"></div>
                  <span className="text-[11px] font-semibold text-slate-600">Successful Requests</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-100"></div>
                  <span className="text-[11px] font-semibold text-slate-600">Rate-Limited</span>
                </div>
              </div>
            </div>

            {/* Stats Sidebar */}
            <div className="w-full md:w-32 flex flex-col justify-center gap-8 md:border-l border-slate-100 md:pl-8">
              <div>
                <p className="text-3xl font-bold text-slate-900 tracking-tight">10k+</p>
                <p className="text-[11px] text-slate-600 mt-2 leading-tight">Reqs / Sec Tested Capacity</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 tracking-tight">&lt;15ms</p>
                <p className="text-[11px] text-slate-600 mt-2 leading-tight">Avg Gateway Routing Latency</p>
              </div>
            </div>

            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Essential Feature Section (Tenant Dashboard) ─── */}
      <section 
        className="relative z-10 max-w-6xl mx-auto px-8 py-[60px] bg-white"
      >
        
        {/* Header */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={scrollReveal} className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-[#5E9F71] font-semibold text-sm mb-4">Essential Feature</p>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
            Discover the Power of Centralized Management.
          </h2>
          <p className="text-slate-600 text-lg">
            Your Trusted Partner in SaaS Architecture with Cutting-Edge Solutions for Comprehensive Data Isolation.
          </p>
        </motion.div>

        {/* 2-Column Content */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Table Mockup */}
          <motion.div variants={scrollReveal} className="bg-[#FAFAFB] rounded-[2rem] p-6 sm:p-10 border border-slate-100 flex items-center justify-center shadow-inner">
            <div className="bg-white rounded-2xl w-full p-6 sm:p-8 shadow-sm border border-slate-50">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-slate-900">Active Organizations</h3>
                  <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded-full tracking-wide">4 NEW</span>
                </div>
                <p className="text-[11px] font-medium text-slate-400">Viewing last 24 hours report</p>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-4 gap-4 pb-4 border-b border-slate-100 text-[11px] font-semibold text-slate-400 mb-5">
                <div>Tenant Name</div>
                <div className="flex items-center gap-1">Plan Tier <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg></div>
                <div>Status</div>
                <div className="flex items-center justify-end gap-1 text-right">Quota Used <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg></div>
              </div>

              {/* Table Rows */}
              <div className="flex flex-col gap-5 text-[12px] font-medium text-slate-600">
                {/* Row 1 */}
                <div className="grid grid-cols-4 gap-4 items-center border-b border-slate-50 pb-5">
                  <div className="text-slate-900">Acme Corp.</div>
                  <div>Business</div>
                  <div><span className="px-3 py-1 bg-[#5E9F71]/10 text-[#5E9F71] rounded-full text-[10px] font-bold">Active</span></div>
                  <div className="text-right">56.4%</div>
                </div>
                {/* Row 2 */}
                <div className="grid grid-cols-4 gap-4 items-center border-b border-slate-50 pb-5">
                  <div className="text-slate-900">TechNova Ltd.</div>
                  <div>Pro</div>
                  <div><span className="px-3 py-1 bg-red-100 text-red-500 rounded-full text-[10px] font-bold">Suspended</span></div>
                  <div className="text-right">124.2%</div>
                </div>
                {/* Row 3 */}
                <div className="grid grid-cols-4 gap-4 items-center border-b border-slate-50 pb-5">
                  <div className="text-slate-900">Biffco Inc.</div>
                  <div>Free</div>
                  <div><span className="px-3 py-1 bg-red-100 text-red-500 rounded-full text-[10px] font-bold">Over Limit</span></div>
                  <div className="text-right">112.5%</div>
                </div>
                {/* Row 4 */}
                <div className="grid grid-cols-4 gap-4 items-center border-b border-slate-50 pb-5">
                  <div className="text-slate-900">Barone LLC.</div>
                  <div>Business</div>
                  <div><span className="px-3 py-1 bg-[#5E9F71]/10 text-[#5E9F71] rounded-full text-[10px] font-bold">Active</span></div>
                  <div className="text-right">48.7%</div>
                </div>
                {/* Row 5 */}
                <div className="grid grid-cols-4 gap-4 items-center">
                  <div className="text-slate-900">Initech Ltd.</div>
                  <div>Pro</div>
                  <div><span className="px-3 py-1 bg-[#5E9F71]/10 text-[#5E9F71] rounded-full text-[10px] font-bold">Active</span></div>
                  <div className="text-right">82.1%</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Text & Mini Grid */} 
          <motion.div variants={scrollReveal} className="lg:pl-8">
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
              Manage and organize tenants
            </h3>
            <p className="text-slate-600 text-base leading-relaxed mb-12">
              Allows you to set custom resource thresholds for specific organizations and receive real-time alerts when these limits are breached, ensuring you stay informed of critical account activity.
            </p>

            {/* Mini Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              {/* Item 1 */}
              <div>
                <div className="w-12 h-12 bg-[#5E9F71]/10 rounded-full flex items-center justify-center text-[#5E9F71] mb-5">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-2">Strict Isolation</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Our platform enforces hard boundaries, keeping every client's data strictly separated.
                </p>
              </div>

              {/* Item 2 */}
              <div>
                <div className="w-12 h-12 bg-[#5E9F71]/10 rounded-full flex items-center justify-center text-[#5E9F71] mb-5">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-2">Tenant Overrides</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  This includes setting individual resource quotas and overrides per organization.
                </p>
              </div>
            </div>
          </motion.div>
          </motion.div>
      </section>

      {/* ─── Pricing Section ─── */}
      <section 
        id="pricing" 
        className="relative z-10 max-w-6xl mx-auto px-8 py-[60px]"
      >
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={scrollReveal} className="text-center max-w-3xl mx-auto mb-10">
          <p className="text-[#5E9F71] font-semibold text-sm mb-4">Pricing & Plan</p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Choose a suitable plan
          </h2>
          <p className="text-slate-600 text-base mt-4 max-w-xl mx-auto">
            Your Trusted Partner in Data Protection with Cutting-Edge Solutions for Comprehensive Data Security.
          </p>
        </motion.div>

        {/* Monthly / Yearly Toggle */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={scrollReveal} className="flex items-center justify-center gap-4 mb-16">
          <span className={`text-sm font-bold transition-colors ${!isYearly ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
          <button 
            onClick={() => setIsYearly(!isYearly)}
            className="w-12 h-6 bg-[#5E9F71]/20 rounded-full relative p-1 transition-colors outline-none cursor-pointer"
          >
            <div className={`w-4 h-4 bg-[#5E9F71] rounded-full shadow-sm transition-transform duration-300 ${isYearly ? 'translate-x-6' : 'translate-x-0'}`}></div>
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold transition-colors ${isYearly ? 'text-slate-900' : 'text-slate-400'}`}>Yearly</span>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold tracking-wide rounded-full">
              Extra Perks + Save up to 25%
            </span>
          </div>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: 'Free Trial',
              isTrial: true,
              priceMonthly: 0,
              priceYearly: 0,
              badge: '7 Days Only',
              description: 'Default plan on account signup. Full access for 7 days only, then a paid plan is required.',
              usersMonthly: 2,
              usersYearly: 2,
              features: [
                '5 Active Projects',
                '10 MB Storage',
                '100 API Requests/day',
                'Mandatory upgrade after 7 days',
              ],
              buttonText: 'Start 7-Day Free Trial',
              isDark: false,
            },
            {
              name: 'Pro Plan',
              isTrial: false,
              priceMonthly: 29,
              priceYearly: 295,
              originalYearly: 348,
              discountBadge: '15% OFF',
              description: 'Built for growing teams and startups.',
              usersMonthly: 10,
              usersYearly: 12,
              features: ['20 Active Projects', '1 GB Storage', '5,000 API Requests/day'],
              yearlyExtraFeatures: [
                '+2 GB Extra Cloud Storage',
                'Advanced Webhooks & Integrations',
              ],
              popular: true,
              buttonText: 'Select Pro Plan',
              isDark: true,
            },
            {
              name: 'Business Plan',
              isTrial: false,
              priceMonthly: 99,
              priceYearly: 890,
              originalYearly: 1188,
              discountBadge: '25% OFF',
              description: 'Enterprise grade power and capacity.',
              usersMonthly: 15,
              usersYearly: 20,
              features: ['100 Active Projects', '3 GB Storage', '15,000 API Requests/day'],
              yearlyExtraFeatures: [
                '+5 GB Extra Cloud Storage',
                'Advanced Webhooks & Integrations',
                '1-Year Audit Log Retention & Reviews',
              ],
              buttonText: 'Select Business Plan',
              isDark: false,
            },
          ].map((plan, idx) => {
            const isDark = selectedPlan === plan.name;
            return (
              <motion.div variants={scrollReveal} key={idx} className="h-full">
                <div
                  onClick={() => setSelectedPlan(plan.name)}
                  className={`border rounded-[1.5rem] p-10 relative flex flex-col justify-between transition-all duration-300 hover:shadow-2xl cursor-pointer h-full ${
                    isDark
                      ? 'bg-[#18181b] border-transparent text-white shadow-2xl shadow-slate-900/30 transform md:-translate-y-4'
                      : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300 hover:-translate-y-1'
                  }`}
                >
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                    {plan.popular && (
                      <span className="px-3 py-1 bg-[#c8f542] text-[#2c3d0c] text-[10px] font-bold uppercase tracking-wider rounded-full">
                        Recommended
                      </span>
                    )}
                    {plan.badge && (
                      <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider rounded-full">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-sm mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {plan.description}
                  </p>
                  
                  <div className="mt-8 mb-6">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-5xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {plan.isTrial ? (
                          <span>$0</span>
                        ) : (
                          <AnimatedPrice value={isYearly ? plan.priceYearly : plan.priceMonthly} />
                        )}
                      </span>
                      <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {plan.isTrial ? 'for 7 days only' : (isYearly ? 'per year' : 'per month')}
                      </span>
                    </div>

                    {/* Discount Badge UI (Visible only on Yearly for paid plans) */}
                    <div className={`mt-3 flex items-center gap-2 h-6 transition-opacity duration-300 ${!plan.isTrial && isYearly && plan.originalYearly ? 'opacity-100' : 'opacity-0'}`}>
                      {plan.originalYearly && (
                        <>
                          <span className={`text-sm line-through font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            ${plan.originalYearly}
                          </span>
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold tracking-wide rounded-full">
                            {plan.discountBadge}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-4">
                    {/* Dynamic Team Users Feature with Yearly Upgrade & Blurred Previous Value */}
                    <li className={`flex items-center justify-between gap-2 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#5E9F71] flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex items-center gap-2">
                          {isYearly && plan.usersYearly > plan.usersMonthly ? (
                            <>
                              <span className="line-through text-slate-400 opacity-40 blur-[0.6px] select-none text-xs font-semibold">
                                {plan.usersMonthly} Users
                              </span>
                              <span className={`font-bold transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {plan.usersYearly} Team Users
                              </span>
                            </>
                          ) : (
                            <span>{plan.usersMonthly} Team Users</span>
                          )}
                        </div>
                      </div>
                      {isYearly && plan.usersYearly > plan.usersMonthly && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${
                          isDark 
                            ? 'bg-[#c8f542]/20 text-[#c8f542] border border-[#c8f542]/30' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          +{plan.usersYearly - plan.usersMonthly} Extra
                        </span>
                      )}
                    </li>

                    {plan.features.map((feat, fIdx) => {
                      const isAlert = plan.isTrial && feat.includes('Mandatory');
                      return (
                        <li key={fIdx} className={`flex items-center gap-3 text-sm font-medium ${
                          isAlert 
                            ? 'text-amber-600 font-semibold' 
                            : isDark ? 'text-slate-300' : 'text-slate-600'
                        }`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isAlert ? (isDark ? 'bg-amber-400/20 text-amber-400' : 'bg-amber-100 text-amber-700') : 'bg-[#5E9F71] text-white'
                          }`}>
                            {isAlert ? (
                              <span className="text-xs font-black leading-none">!</span>
                            ) : (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span>{feat}</span>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Yearly Extra Benefits (revealed dynamically when Yearly is active ONLY for paid plans) */}
                  {!plan.isTrial && isYearly && plan.yearlyExtraFeatures && plan.yearlyExtraFeatures.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-dashed border-slate-200/80 transition-all duration-300">
                      <div className="flex items-center gap-1.5 mb-3.5">
                        <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-[#c8f542]' : 'text-[#5E9F71]'}`} />
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-[#c8f542]' : 'text-[#5E9F71]'}`}>
                          Yearly Extra Benefits
                        </span>
                      </div>
                      <ul className="space-y-3">
                        {plan.yearlyExtraFeatures.map((extraFeat, eIdx) => (
                          <li 
                            key={eIdx} 
                            className={`flex items-center justify-between gap-2 text-sm font-medium ${
                              isDark ? 'text-slate-200' : 'text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isDark ? 'bg-[#c8f542] text-slate-950' : 'bg-[#5E9F71] text-white'
                              }`}>
                                <Check className="w-3 h-3" strokeWidth={3} />
                              </div>
                              <span>{extraFeat}</span>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${
                              isDark ? 'bg-[#c8f542]/20 text-[#c8f542]' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              Bonus
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <Link
                  to="/register"
                  onClick={() => setSelectedPlan(plan.name)}
                  className={`mt-12 w-full md:w-auto self-start font-semibold py-3 px-6 rounded-full text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                    isDark
                      ? 'bg-white hover:bg-[oklch(44.6%_.043_257.281)] text-slate-900 hover:text-white shadow-md hover:shadow-xl border border-transparent'
                      : 'bg-[#18181b] hover:bg-[#c8f542] text-white hover:text-slate-900 shadow-md hover:shadow-lg hover:shadow-[#c8f542]/20'
                  }`}
                >
                  {plan.isTrial ? 'Start 7-Day Free Trial' : `Select ${plan.name} Plan`}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ─── Bottom CTA Banner (Matching User Mockup) ─── */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={scrollReveal} className="mt-20 bg-[#18181b] rounded-[2.5rem] p-12 md:p-16 text-center relative overflow-hidden shadow-2xl border border-slate-800/80">
          {/* Subtle Lightning Watermark in Background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05]">
            <svg viewBox="0 0 25 24" className="w-[520px] h-[520px] fill-white transform -rotate-12" stroke="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>

          <div className="relative z-10 max-w-2xl mx-auto">
            <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
              Secure Your Tenant Data with <br className="hidden sm:block" />
              TenantFlow Architecture
            </h3>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed mt-4 mb-8 max-w-lg mx-auto">
              Allows you to set custom resource quotas per organization, eliminate cross-tenant data leakage, and scale your SaaS with confidence.
            </p>
            <Link
              to="/register"
              className="group inline-flex items-center gap-4 bg-white hover:bg-[#c8f542] text-slate-900 font-semibold text-[15px] pl-7 pr-1.5 py-1.5 rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 cursor-pointer"
            >
              <span>Get Started</span>
              <span className="w-9 h-9 rounded-full bg-[#c8f542] group-hover:bg-[#1c1c1f] flex items-center justify-center relative overflow-hidden flex-shrink-0 transition-colors duration-300 shadow-sm">
                {/* Outgoing dark arrow on lime circle (slides right on hover) */}
                <ArrowRight className="w-4 h-4 text-slate-900 absolute transition-all duration-300 ease-out transform translate-x-0 opacity-100 group-hover:translate-x-7 group-hover:opacity-0 stroke-[2.7]" />
                
                {/* Incoming white arrow on black circle (slides from left to center on hover) */}
                <ArrowRight className="w-4 h-4 text-white absolute transition-all duration-300 ease-out transform -translate-x-7 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 stroke-[2.7]" />
              </span>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ─── Footer (Matching User Mockup) ─── */}
      <footer className="relative z-10 border-t border-slate-100 bg-white pt-16 pb-12">
        <div className="max-w-6xl mx-auto px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 items-start">
            
            {/* Col 1: Brand Logo, Description & Social Icons */}
            <div className="lg:col-span-4 flex flex-col justify-between min-h-[170px]">
              <div>
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-[#c8f542] flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1.5l8.66 5v11L12 22.5l-8.66-5v-11L12 1.5zm0 2.31L4.84 7.96l7.16 4.13 7.16-4.13L12 3.81zm-7.66 5.5v7.38l6.66 3.85v-7.38L4.34 9.31zm15.32 0l-6.66 3.85v7.38l6.66-3.85V9.31z"/>
                    </svg>
                  </div>
                  <span className="font-bold text-2xl text-slate-900 tracking-tight">TenantFlow</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed max-w-[310px] mb-8">
                  Securing Your Digital World: Your Trusted Partner in Data Protection with Cutting Edge Solutions for Data Security.
                </p>
              </div>

              {/* Social Icons */}
              <div className="flex items-center gap-4 text-slate-700">
                {/* Facebook */}
                <a href="#facebook" onClick={(e) => e.preventDefault()} className="hover:text-slate-950 transition-colors" aria-label="Facebook">
                  <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                {/* X / Twitter */}
                <a href="#x" onClick={(e) => e.preventDefault()} className="hover:text-slate-950 transition-colors" aria-label="X">
                  <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                {/* GitHub */}
                <a href="#github" onClick={(e) => e.preventDefault()} className="hover:text-slate-950 transition-colors" aria-label="GitHub">
                  <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                </a>
                {/* LinkedIn */}
                <a href="#linkedin" onClick={(e) => e.preventDefault()} className="hover:text-slate-950 transition-colors" aria-label="LinkedIn">
                  <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.65 1.65 0 1 0 0 3.3 1.65 1.65 0 0 0 0-3.3z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Col 2: Resources */}
            <div className="lg:col-span-2">
              <h4 className="text-[15px] font-bold text-slate-900 mb-5 tracking-tight">Resources</h4>
              <ul className="space-y-3.5 text-sm text-slate-500">
                <li><a href="#features" className="hover:text-slate-900 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a></li>
                </ul>
            </div>

            {/* Col 3: Quick Info */}
            <div className="lg:col-span-2">
              <h4 className="text-[15px] font-bold text-slate-900 mb-5 tracking-tight">Quick Info</h4>
              <ul className="space-y-3.5 text-sm text-slate-500">
                <li><a href="#terms" className="hover:text-slate-900 transition-colors">Terms</a></li>
                <li><a href="#privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</a></li>
                <li><a href="#contact" className="hover:text-slate-900 transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Col 4: Newsletter & Copyright */}
            <div className="lg:col-span-4 flex flex-col justify-between min-h-[170px]">
              <div>
                <h4 className="text-[17px] font-bold text-slate-900 mb-2.5 tracking-tight">Subscribe to Our Newsletter!</h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  Stay Informed with Our Latest Security Insights - <br className="hidden sm:block" />
                  Subscribe to Our Newsletter!
                </p>

                <form onSubmit={(e) => e.preventDefault()} className="relative flex items-center max-w-[360px]">
                  <div className="w-full bg-white border border-slate-200/90 rounded-full p-1.5 pl-5 flex items-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 flex-1 pr-2"
                    />
                    <button
                      type="submit"
                      className="bg-[#c8f542] hover:bg-[#b8ea32] text-slate-900 font-semibold text-xs px-5 py-2.5 rounded-full transition-all duration-200 shadow-sm flex-shrink-0 cursor-pointer"
                    >
                      Subscribe
                    </button>
                  </div>
                </form>
              </div>

              <div className="mt-8 text-xs text-slate-400">
                Copyright © 2026 TenantFlow. All Rights Reserved
              </div>
            </div>

          </motion.div>
        </div>
      </footer>
    </div>
  );
};
