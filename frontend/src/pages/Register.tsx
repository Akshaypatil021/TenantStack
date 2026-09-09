import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  ArrowRight,
  Building2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  Shield,
  Globe,
  Sparkles,
} from 'lucide-react';

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
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName) {
      setError('Please enter a company name');
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

  const handleNext = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill in all admin credential fields to continue');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    setError(null);
    setCurrentStep(2);
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(1);
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

  const includedFeatures = [
    '2 Team Members',
    '5 Active Projects',
    '10 MB File Storage',
    'RBAC Permission System',
    'Real-time Dashboard',
    'Cloud Redis Caching',
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950" />

        {/* Animated floating orbs */}
        <div
          className="absolute top-32 right-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"
          style={{ animation: 'pulse 5s ease-in-out infinite alternate' }}
        />
        <div
          className="absolute bottom-20 left-16 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl animate-pulse"
        />
        <div
          className="absolute top-1/3 left-1/2 w-56 h-56 bg-pink-500/10 rounded-full blur-3xl"
          style={{ animation: 'pulse 7s ease-in-out 2s infinite alternate' }}
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
            <span className="font-bold text-xl text-white tracking-wider">
              TenantFlow
            </span>
          </div>

          {/* Center Content */}
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-semibold mb-6">
              <Sparkles className="w-4 h-4" /> Start your free trial today
            </div>

            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
              Launch your{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                multi-tenant
              </span>{' '}
              platform
            </h2>
            <p className="text-slate-400 text-base mt-5 leading-relaxed">
              Set up your organization in seconds. Get instant access to
              enterprise-grade tenant isolation, RBAC permissions, and dynamic
              subscription management.
            </p>

            {/* Included Features */}
            <div className="mt-10 bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                Everything included in FREE plan
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {includedFeatures.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 bg-purple-500/15 rounded-md flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-purple-400" />
                    </div>
                    <span className="text-slate-400 text-xs">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Trust */}
          <div className="flex items-center gap-3 text-slate-500 text-xs">
            <Globe className="w-4 h-4 text-slate-600" />
            <span>
              Trusted by <span className="text-slate-300 font-semibold">2,500+</span> organizations worldwide
            </span>
          </div>
        </div>
      </div>

      {/* Right Register Form Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex p-3 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-2xl shadow-lg shadow-purple-500/25 mb-4">
              <Layers className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wider">TenantFlow</h1>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Create your organization
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-purple-400 font-semibold hover:text-purple-300 transition"
              >
                Sign in instead →
              </Link>
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-3 mb-8">
            {[1, 2].map((step) => (
              <React.Fragment key={step}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      currentStep >= step
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {currentStep > step ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      step
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      currentStep >= step ? 'text-slate-200' : 'text-slate-600'
                    }`}
                  >
                    {step === 1 ? 'Credentials' : 'Organization'}
                  </span>
                </div>
                {step < 2 && (
                  <div
                    className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${
                      currentStep > 1
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                        : 'bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
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
          <form onSubmit={handleSubmit}>
            {/* Step 1: Credentials */}
            <div
              className={`space-y-4 transition-all duration-400 ${
                currentStep === 1
                  ? 'opacity-100 translate-x-0'
                  : 'hidden'
              }`}
            >
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    First Name
                  </label>
                  <div
                    className={`relative rounded-xl transition-all duration-300 ${
                      focusedField === 'firstName'
                        ? 'ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/10'
                        : ''
                    }`}
                  >
                    <User
                      className={`w-5 h-5 absolute left-3.5 top-3.5 transition-colors duration-200 ${
                        focusedField === 'firstName'
                          ? 'text-purple-400'
                          : 'text-slate-500'
                      }`}
                    />
                    <input
                      id="register-firstname"
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      onFocus={() => setFocusedField('firstName')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                      placeholder="John"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Last Name
                  </label>
                  <div
                    className={`relative rounded-xl transition-all duration-300 ${
                      focusedField === 'lastName'
                        ? 'ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/10'
                        : ''
                    }`}
                  >
                    <input
                      id="register-lastname"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      onFocus={() => setFocusedField('lastName')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Work Email
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
                    id="register-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                    placeholder="john@acme.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Create Password
                </label>
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
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-3 pl-11 pr-12 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                    placeholder="Min 6 characters"
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

                {/* Password Strength */}
                {formData.password && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            passwordStrength.score >= level
                              ? passwordStrength.color
                              : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        passwordStrength.score <= 1
                          ? 'text-rose-400'
                          : passwordStrength.score <= 2
                          ? 'text-amber-400'
                          : passwordStrength.score <= 3
                          ? 'text-blue-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Next Step Button */}
              <button
                type="button"
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-purple-600/25 hover:shadow-xl hover:shadow-purple-600/30 flex items-center justify-center gap-2 text-sm group mt-2"
              >
                Continue
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Step 2: Organization Details */}
            <div
              className={`space-y-4 transition-all duration-400 ${
                currentStep === 2
                  ? 'opacity-100 translate-x-0'
                  : 'hidden'
              }`}
            >
              {/* Admin Preview */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/20">
                  {formData.firstName?.[0]?.toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">
                    {formData.firstName} {formData.lastName}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {formData.email} · Admin
                  </p>
                </div>
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Company / Organization Name
                </label>
                <div
                  className={`relative rounded-xl transition-all duration-300 ${
                    focusedField === 'companyName'
                      ? 'ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/10'
                      : ''
                  }`}
                >
                  <Building2
                    className={`w-5 h-5 absolute left-3.5 top-3.5 transition-colors duration-200 ${
                      focusedField === 'companyName'
                        ? 'text-purple-400'
                        : 'text-slate-500'
                    }`}
                  />
                  <input
                    id="register-company"
                    type="text"
                    required={currentStep === 2}
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    onFocus={() => setFocusedField('companyName')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                    placeholder="Acme Inc."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 bg-slate-900/50 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold py-3.5 rounded-xl transition-all text-sm"
                >
                  Back
                </button>
                <button
                  id="register-submit"
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-purple-600/25 hover:shadow-xl hover:shadow-purple-600/30 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed group"
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
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Organization
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Footer */}
          <p className="text-center text-[11px] text-slate-600 mt-8">
            By creating an account, you agree to our{' '}
            <span className="text-slate-500 hover:text-slate-400 cursor-pointer">
              Terms of Service
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
