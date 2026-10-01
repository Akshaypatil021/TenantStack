import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FolderKanban,
  ArrowRight,
  User,
  Lock,
  Eye,
  EyeOff,
  Mail,
} from 'lucide-react';

interface ProjectInviteDetails {
  email: string;
  role: string;
  project: { _id: string; name: string; description?: string };
  invitedBy: { firstName: string; lastName: string };
  tenant: { _id: string; name: string };
  expiresAt: string;
  isExistingUser: boolean;
}

export const AcceptProjectInvite = () => {
  const { token } = useParams<{ token: string }>();
  const [inviteDetails, setInviteDetails] = useState<ProjectInviteDetails | null>(null);
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
        const res = await fetch(`http://localhost:5000/api/v1/projects/invite/${token}`);
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!inviteDetails?.isExistingUser) {
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
    }
    
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:5000/api/v1/projects/invite/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteDetails?.isExistingUser ? {} : formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      // Login user
      login(data.token, data.user, {
        id: inviteDetails!.tenant._id,
        name: inviteDetails!.tenant.name,
      });
      
      // Navigate to projects page directly
      navigate('/projects');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium animate-pulse">Loading invitation details...</p>
      </div>
    );
  }

  if (error && !inviteDetails) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 to-orange-500"></div>
          
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <span className="text-4xl text-slate-500">?</span>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">Invitation Not Found</h2>
          <p className="text-slate-400 mb-8">{error}</p>
          
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 px-6 rounded-xl transition-all"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-[120px]"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-indigo-900/20 blur-[100px]"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/20">
              <FolderKanban className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">TenantStack</span>
          </div>
        </div>
        <h2 className="mt-8 text-center text-3xl font-extrabold text-white tracking-tight">
          Project Invitation
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          You've been invited to collaborate on a project.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
          
          <div className="mb-8 bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
              <FolderKanban className="w-8 h-8 text-white" />
            </div>
            
            <p className="text-slate-300 text-sm mb-1">
              <strong className="text-white">{inviteDetails?.invitedBy.firstName} {inviteDetails?.invitedBy.lastName}</strong> invited you to:
            </p>
            <h3 className="text-xl font-bold text-white mb-1">{inviteDetails?.project.name}</h3>
            <div className="flex items-center justify-center gap-2 text-xs font-medium mt-3 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-700">
              <span className="text-slate-400">Role:</span>
              <span className="text-purple-400">{inviteDetails?.role}</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center">
              <p className="text-sm text-rose-400 text-center font-medium">{error}</p>
            </div>
          )}

          {inviteDetails?.isExistingUser ? (
            <div className="space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
                <p className="text-emerald-400 text-sm font-medium">
                  We found your account ({inviteDetails.email}).
                </p>
                <p className="text-emerald-500/70 text-xs mt-1">
                  You can directly accept this invitation and join the project.
                </p>
              </div>
              
              <button
                onClick={() => handleSubmit()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-purple-600/20 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Joining Project...' : 'Accept Invitation & Join'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                    First Name
                  </label>
                  <div className={`relative flex items-center transition-all duration-300 rounded-xl overflow-hidden border ${focusedField === 'firstName' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-700'}`}>
                    <div className="pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      required
                      type="text"
                      className="block w-full bg-slate-800 py-3 pl-3 pr-3 text-slate-100 placeholder-slate-500 focus:outline-none sm:text-sm"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      onFocus={() => setFocusedField('firstName')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                    Last Name
                  </label>
                  <div className={`relative flex items-center transition-all duration-300 rounded-xl overflow-hidden border ${focusedField === 'lastName' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-700'}`}>
                    <input
                      required
                      type="text"
                      className="block w-full bg-slate-800 py-3 px-4 text-slate-100 placeholder-slate-500 focus:outline-none sm:text-sm"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      onFocus={() => setFocusedField('lastName')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                </div>
              </div>

              {/* Email (Read only) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Email Address
                </label>
                <div className="relative flex items-center rounded-xl overflow-hidden border border-slate-700 bg-slate-800/50">
                  <div className="pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    disabled
                    className="block w-full bg-transparent py-3 pl-3 pr-3 text-slate-400 cursor-not-allowed sm:text-sm"
                    value={inviteDetails?.email || ''}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Create Password
                </label>
                <div className={`relative flex items-center transition-all duration-300 rounded-xl overflow-hidden border ${focusedField === 'password' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-700'}`}>
                  <div className="pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    className="block w-full bg-slate-800 py-3 pl-3 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none sm:text-sm"
                    placeholder="Min. 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-purple-600/20 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Account...' : 'Create Account & Join'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          )}
        </div>
        
        <p className="mt-8 text-center text-xs text-slate-500">
          By accepting this invitation, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};
