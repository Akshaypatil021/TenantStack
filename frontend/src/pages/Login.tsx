import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Users,
} from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { icon: Users, label: 'Active Organizations', value: '2,500+' },
    { icon: ShieldCheck, label: 'Data Isolation', value: '100%' },
    { icon: Zap, label: 'Avg Response Time', value: '<50ms' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-slate-950 to-indigo-950" />

        {/* Animated floating orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-32 right-16 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl"
          style={{ animation: 'pulse 4s ease-in-out infinite alternate' }}
        />
        <div
          className="absolute top-1/2 left-1/3 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl"
          style={{ animation: 'pulse 6s ease-in-out 1s infinite alternate' }}
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-purple-600 to-indigo-500 p-2.5 rounded-xl shadow-lg shadow-purple-500/25">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-white tracking-wide">
              TenantFlow
            </span>
          </div>

          {/* Center Content */}
          <div className="max-w-lg">
            <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Welcome back to your{' '}
              <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">
                workspace
              </span>
            </h2>
            <p className="text-slate-400 text-base mt-5 leading-relaxed">
              Access your organization's dashboard, manage projects, and
              collaborate with your team — all in one secure platform.
            </p>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 mt-10">
              {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.07] transition-all duration-300"
                  >
                    <Icon className="w-5 h-5 text-purple-400 mb-2.5" />
                    <p className="text-white text-lg font-bold tracking-tight">
                      {stat.value}
                    </p>
                    <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider mt-0.5">
                      {stat.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Trust Badge */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-blue-500'].map(
                (color, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 ${color} rounded-full border-2 border-slate-950 flex items-center justify-center text-[10px] font-bold text-white`}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                )
              )}
            </div>
            <p className="text-slate-500 text-xs">
              <span className="text-slate-300 font-semibold">2,500+</span>{' '}
              organizations already trust TenantFlow
            </p>
          </div>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md">
          {/* Mobile Logo (shown only on mobile) */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex p-3 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-2xl shadow-lg shadow-purple-500/25 mb-4">
              <Layers className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">TenantFlow</h1>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Don't have an organization yet?{' '}
              <Link
                to="/register"
                className="text-purple-400 font-semibold hover:text-purple-300 transition"
              >
                Create one for free →
              </Link>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 animate-[slideDown_0.3s_ease-out]">
              <div className="w-5 h-5 bg-rose-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-rose-400 text-xs font-bold">!</span>
              </div>
              <p className="text-rose-400 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div
                className={`relative rounded-xl transition-all duration-300 ${
                  focusedField === 'email'
                    ? 'ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/10'
                    : ''
                }`}
              >
                <Mail
                  className={`w-5 h-5 absolute left-3.5 top-3.5 transition-colors duration-200 ${
                    focusedField === 'email'
                      ? 'text-purple-400'
                      : 'text-slate-500'
                  }`}
                />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium transition"
                >
                  Forgot password?
                </button>
              </div>
              <div
                className={`relative rounded-xl transition-all duration-300 ${
                  focusedField === 'password'
                    ? 'ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/10'
                    : ''
                }`}
              >
                <Lock
                  className={`w-5 h-5 absolute left-3.5 top-3.5 transition-colors duration-200 ${
                    focusedField === 'password'
                      ? 'text-purple-400'
                      : 'text-slate-500'
                  }`}
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-3 pl-11 pr-12 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-purple-600/25 hover:shadow-xl hover:shadow-purple-600/30 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed group mt-2"
            >
              {loading ? (
                <>
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign in to Workspace
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-950 px-4 text-slate-500 font-medium">
                New to TenantFlow?
              </span>
            </div>
          </div>

          {/* Register CTA */}
          <Link
            to="/register"
            className="w-full flex items-center justify-center gap-2 bg-slate-900/50 border border-slate-800 hover:border-purple-500/30 text-slate-300 hover:text-white font-semibold py-3.5 rounded-xl transition-all duration-300 text-sm group"
          >
            Create your organization
            <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Footer */}
          <p className="text-center text-[11px] text-slate-600 mt-8">
            By signing in, you agree to our{' '}
            <span className="text-slate-500 hover:text-slate-400 cursor-pointer">
              Terms
            </span>{' '}
            and{' '}
            <span className="text-slate-500 hover:text-slate-400 cursor-pointer">
              Privacy Policy
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
