import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  Eye,
  EyeOff,
  ShieldCheck,
  Headset,
  ArrowRight,
} from 'lucide-react';
import { motion, type Variants } from 'framer-motion';

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

export const Register = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName) {
      setError('Please enter a company name');
      return;
    }
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      login(data.token, data.user, data.tenant);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (() => {
    const p = formData.password;
    if (!p) return { score: 0, label: '', color: '' };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score <= 3) return { score: 3, label: 'Good', color: 'bg-blue-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  })();

  return (
    <div className="min-h-screen bg-white text-slate-900 relative selection:bg-[#c8f542] selection:text-slate-900 overflow-hidden">
      {/* Subtle Grid Background with Radial Fade (Matching Landing Page) */}
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
      
      {/* Subtle Lime Glow Element */}
      <div className="absolute top-20 right-1/4 w-32 h-32 bg-[#c8f542]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-[48px] py-6 flex items-center justify-between">
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
        <Link
          to="/login"
          className="hidden sm:inline-flex items-center justify-center bg-[#18181b] hover:bg-[#c8f542] hover:text-slate-900 text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-colors duration-300 shadow-md"
        >
          Sign In
        </Link>
      </header>

      {/* Main Content */}
      <motion.main
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="relative z-10 w-full max-w-7xl mx-auto px-[48px] pt-10 pb-20 lg:pt-20"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-start">
          
          {/* Left Side: Typography & Info */}
          <motion.div variants={scrollReveal} className="lg:col-span-5 flex flex-col justify-center h-full">
            <div className="max-w-md">
              <span className="text-[#5E9F71] font-semibold text-sm tracking-wide">
                Get Started
              </span>
              <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 mt-4 mb-6 leading-[1.1] tracking-tight">
                Create your Organization.
              </h1>
              <p className="text-slate-500 text-lg leading-relaxed mb-16">
                Your Trusted Partner in Data Protection with Cutting-Edge Solutions for Comprehensive Data Security and Multi-Tenant Isolation.
              </p>

              {/* Info Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {/* Block 1 */}
                <motion.div variants={scrollReveal} className="bg-slate-50/70 border border-slate-100/80 rounded-2xl p-5 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 bg-[#5E9F71]/20 rounded-full flex items-center justify-center mb-4">
                    <ShieldCheck className="w-5 h-5 text-[#5E9F71]" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">Enterprise Security</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Our platform ensures zero cross-tenant data leakage with strict compound indexes and RBAC.
                  </p>
                </motion.div>
                {/* Block 2 */}
                <motion.div variants={scrollReveal} className="bg-slate-50/70 border border-slate-100/80 rounded-2xl p-5 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 bg-[#5E9F71]/20 rounded-full flex items-center justify-center mb-4">
                    <Headset className="w-5 h-5 text-[#5E9F71]" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">Dedicated Support</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Access our extensive knowledge base and dedicated engineering team for seamless integration.
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Right Side: Floating Form Card */}
          <motion.div variants={scrollReveal} className="lg:col-span-7 lg:pl-10 relative">
            
            {/* The decorative icon placed exactly like the mockup behind the form top right */}
            <div className="absolute -top-12 -right-8 w-24 h-24 bg-[#c8f542] rounded-3xl -z-10 transform rotate-12 opacity-80 hidden lg:flex items-center justify-center shadow-lg">
               <Layers className="w-10 h-10 text-slate-900" />
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 sm:p-12 relative z-10">
              {error && (
                <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                  <div className="w-5 h-5 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-rose-600 text-xs font-bold">!</span>
                  </div>
                  <p className="text-rose-600 text-sm font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Row 1: Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      onFocus={() => setFocusedField('firstName')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full bg-slate-50 border ${focusedField === 'firstName' ? 'border-[#c8f542] ring-2 ring-[#c8f542]/20' : 'border-slate-200'} rounded-xl py-3 px-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all`}
                      placeholder="Your First Name"
                    />
                  </div>
                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      onFocus={() => setFocusedField('lastName')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full bg-slate-50 border ${focusedField === 'lastName' ? 'border-[#c8f542] ring-2 ring-[#c8f542]/20' : 'border-slate-200'} rounded-xl py-3 px-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all`}
                      placeholder="Your Last Name"
                    />
                  </div>
                </div>

                {/* Row 2: Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full bg-slate-50 border ${focusedField === 'email' ? 'border-[#c8f542] ring-2 ring-[#c8f542]/20' : 'border-slate-200'} rounded-xl py-3 px-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all`}
                    placeholder="youremail@email.com"
                  />
                </div>

                {/* Row 3: Company Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    onFocus={() => setFocusedField('companyName')}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full bg-slate-50 border ${focusedField === 'companyName' ? 'border-[#c8f542] ring-2 ring-[#c8f542]/20' : 'border-slate-200'} rounded-xl py-3 px-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all`}
                    placeholder="Your Company Name"
                  />
                </div>

                {/* Row 4: Password */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full bg-slate-50 border ${focusedField === 'password' ? 'border-[#c8f542] ring-2 ring-[#c8f542]/20' : 'border-slate-200'} rounded-xl py-3 pl-4 pr-12 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all`}
                      placeholder="Minimum 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3 text-slate-400 hover:text-slate-600 transition"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-3 flex items-center gap-3 px-1">
                      <div className="flex-1 flex gap-1.5">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              passwordStrength.score >= level
                                ? passwordStrength.color
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        passwordStrength.score <= 1 ? 'text-rose-500' :
                        passwordStrength.score <= 2 ? 'text-amber-500' :
                        passwordStrength.score <= 3 ? 'text-blue-500' :
                        'text-emerald-500'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto bg-[#18181b] hover:bg-slate-800 text-white font-semibold py-3.5 px-8 rounded-full transition-all duration-300 shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {loading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Organization
                      </>
                    )}
                  </button>
                </div>
                
                {/* Mobile Login Link */}
                <p className="sm:hidden text-center text-sm text-slate-500 mt-4">
                  Already have an account? <Link to="/login" className="text-slate-900 font-semibold underline">Sign In</Link>
                </p>

              </form>
            </div>
          </motion.div>
        </div>
      </motion.main>

      {/* ─── Bottom CTA Banner (Matching Landing Page) ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 py-[60px]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={scrollReveal}
          className="bg-[#18181b] rounded-[2.5rem] p-12 md:p-16 text-center relative overflow-hidden shadow-2xl border border-slate-800/80"
        >
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
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="group inline-flex items-center gap-4 bg-white hover:bg-[#c8f542] text-slate-900 font-semibold text-[15px] pl-7 pr-1.5 py-1.5 rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 cursor-pointer"
            >
              <span>Get Started</span>
              <span className="w-9 h-9 rounded-full bg-[#c8f542] group-hover:bg-[#1c1c1f] flex items-center justify-center relative overflow-hidden flex-shrink-0 transition-colors duration-300 shadow-sm">
                {/* Outgoing dark arrow on lime circle (slides right on hover) */}
                <ArrowRight className="w-4 h-4 text-slate-900 absolute transition-all duration-300 ease-out transform translate-x-0 opacity-100 group-hover:translate-x-7 group-hover:opacity-0 stroke-[2.7]" />
                
                {/* Incoming white arrow on black circle (slides from left to center on hover) */}
                <ArrowRight className="w-4 h-4 text-white absolute transition-all duration-300 ease-out transform -translate-x-7 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 stroke-[2.7]" />
              </span>
            </button>
          </div>
        </motion.div>
      </section>

      {/* ─── Footer (Matching Landing Page) ─── */}
      <footer className="relative z-10 border-t border-slate-100 bg-white pt-16 pb-12">
        <div className="max-w-6xl mx-auto px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 items-start"
          >
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
                <a href="#facebook" onClick={(e) => e.preventDefault()} className="hover:text-slate-950 transition-colors" aria-label="Facebook">
                  <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#x" onClick={(e) => e.preventDefault()} className="hover:text-slate-950 transition-colors" aria-label="X">
                  <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="#github" onClick={(e) => e.preventDefault()} className="hover:text-slate-950 transition-colors" aria-label="GitHub">
                  <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                </a>
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
                <li><a href="/#features" className="hover:text-slate-900 transition-colors">Features</a></li>
                <li><a href="/#pricing" className="hover:text-slate-900 transition-colors">Pricing</a></li>
              </ul>
            </div>

            {/* Col 3: Quick Info */}
            <div className="lg:col-span-2">
              <h4 className="text-[15px] font-bold text-slate-900 mb-5 tracking-tight">Quick Info</h4>
              <ul className="space-y-3.5 text-sm text-slate-500">
                <li><a href="/#terms" className="hover:text-slate-900 transition-colors">Terms</a></li>
                <li><a href="/#privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</a></li>
                <li><a href="/#contact" className="hover:text-slate-900 transition-colors">Contact</a></li>
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
