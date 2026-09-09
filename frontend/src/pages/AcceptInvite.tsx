import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  ArrowRight,
  User,
  Lock,
  Eye,
  EyeOff,
  Mail,
} from 'lucide-react';

interface InviteDetails {
  email: string;
  tenant: { _id: string; name: string };
  role: { _id: string; name: string };
}

export const AcceptInvite = () => {
  const { token } = useParams<{ token: string }>();
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/v1/users/invite/${token}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Invalid or expired invitation');
        }
        
        setInviteDetails(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setFetching(false);
      }
    };

    if (token) {
      fetchInvite();
    } else {
      setError('Invalid invitation link');
      setFetching(false);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:5000/api/v1/users/invite/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      // Login user
      if (inviteDetails?.tenant) {
        login(data.token, data.user, {
          id: inviteDetails.tenant._id,
          name: inviteDetails.tenant.name,
        });
      } else {
        login(data.token, data.user);
      }
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

  if (fetching) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

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
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
              Join your{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                workspace
              </span>
            </h2>
            <p className="text-slate-400 text-base mt-5 leading-relaxed">
              You've been invited to join an organization on TenantFlow. Set up your profile to start collaborating with your team.
            </p>
          </div>
          <div></div>
        </div>
      </div>

      {/* Right Form Panel */}
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
              Accept Invitation
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Complete your profile to join the workspace.
            </p>
          </div>

          {/* Error state if invite invalid */}
          {error && !inviteDetails ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center shadow-xl">
              <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-rose-400 text-xl font-bold">!</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Invitation Error</h3>
              <p className="text-slate-400 text-sm mb-6">{error}</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition"
              >
                Go to Login <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : inviteDetails ? (
            <>
              {/* Error Alert */}
              {error && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 animate-[slideDown_0.3s_ease-out]">
                  <div className="w-5 h-5 bg-rose-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-rose-400 text-xs font-bold">!</span>
                  </div>
                  <p className="text-rose-400 text-sm">{error}</p>
                </div>
              )}

              {/* Organization Preview */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/20">
                  {inviteDetails.tenant?.name?.[0]?.toUpperCase() || 'O'}
                </div>
                <div className="flex-1">
                  <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-0.5">Invited to</p>
                  <p className="text-white text-sm font-semibold truncate">
                    {inviteDetails.tenant?.name || 'Workspace'}
                  </p>
                </div>
                <div className="px-2.5 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-semibold">
                  {inviteDetails.role?.name || 'Member'}
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email (Read-only) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Work Email
                  </label>
                  <div className="relative rounded-xl">
                    <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="email"
                      readOnly
                      value={inviteDetails.email}
                      className="w-full bg-slate-900/40 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>

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
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        onFocus={() => setFocusedField('lastName')}
                        onBlur={() => setFocusedField(null)}
                        className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                        placeholder="Doe"
                      />
                    </div>
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

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-purple-600/25 hover:shadow-xl hover:shadow-purple-600/30 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed group mt-6"
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
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Join Workspace
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
