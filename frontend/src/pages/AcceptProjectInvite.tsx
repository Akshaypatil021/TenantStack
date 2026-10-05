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
      <div className="min-h-screen bg-white flex flex-col justify-center items-center p-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#c8f542] rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">Loading invitation details...</p>
      </div>
    );
  }

  if (error && !inviteDetails) {
    return (
      <div className="min-h-screen bg-white text-slate-900 relative selection:bg-[#c8f542] selection:text-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-white py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 sm:rounded-[2.5rem] sm:px-10 text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl text-rose-600 font-bold">!</span>
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Invitation Not Found</h2>
            <p className="text-slate-500 mb-8">{error}</p>
            
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 bg-[#18181b] hover:bg-slate-800 text-white font-medium py-3 px-6 rounded-full transition-all w-full"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 relative selection:bg-[#c8f542] selection:text-slate-900 overflow-hidden flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Grid */}
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

      <div className="absolute top-20 right-1/4 w-32 h-32 bg-[#c8f542]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#c8f542] flex items-center justify-center shadow-sm">
              <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" stroke="#0f172a" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 6 L26 11 L16 16 L6 11 Z" fill="#c8f542" />
                <path d="M6 11 L6 13.5 L16 18.5 L26 13.5 L26 11" />
                <path d="M6 17 L16 22 L26 17" />
                <path d="M6 21 L16 26 L26 21" />
              </svg>
            </div>
            <span className="font-bold text-2xl text-slate-900 tracking-tight">TenantStack</span>
          </div>
        </div>
        <h2 className="mt-8 text-center text-3xl font-bold text-slate-900 tracking-tight">
          Project Invitation
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          You've been invited to collaborate on a project.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 sm:rounded-[2.5rem] sm:px-10">
          
          <div className="mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-slate-200">
              <FolderKanban className="w-6 h-6 text-slate-700" />
            </div>
            
            <p className="text-slate-500 text-sm mb-1">
              <strong className="text-slate-900">{inviteDetails?.invitedBy.firstName} {inviteDetails?.invitedBy.lastName}</strong> invited you to:
            </p>
            <h3 className="text-xl font-bold text-slate-900 mb-1">{inviteDetails?.project.name}</h3>
            <div className="flex items-center justify-center gap-2 text-xs font-medium mt-3 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
              <span className="text-slate-500">Role:</span>
              <span className="text-[#5E9F71]">{inviteDetails?.role}</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100 flex items-center justify-center">
              <p>{error}</p>
            </div>
          )}

          {inviteDetails?.isExistingUser ? (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center">
                <p className="text-emerald-700 text-sm font-medium">
                  We found your account ({inviteDetails.email}).
                </p>
                <p className="text-emerald-600/70 text-xs mt-1">
                  You can directly accept this invitation and join the project.
                </p>
              </div>
              
              <button
                onClick={() => handleSubmit()}
                disabled={loading}
                className="w-full bg-[#18181b] hover:bg-slate-800 text-white font-semibold py-3.5 px-4 rounded-full transition-all duration-300 shadow-md flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Joining Project...' : 'Accept Invitation & Join'}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">
                    First Name
                  </label>
                  <div className={`relative flex items-center transition-all duration-300 rounded-xl overflow-hidden border ${focusedField === 'firstName' ? 'border-[#c8f542] ring-2 ring-[#c8f542]/20' : 'border-slate-200'}`}>
                    <div className="pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      required
                      type="text"
                      className="block w-full bg-slate-50 py-3 pl-3 pr-3 text-slate-900 placeholder-slate-400 focus:outline-none sm:text-sm"
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
                  <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">
                    Last Name
                  </label>
                  <div className={`relative flex items-center transition-all duration-300 rounded-xl overflow-hidden border ${focusedField === 'lastName' ? 'border-[#c8f542] ring-2 ring-[#c8f542]/20' : 'border-slate-200'}`}>
                    <input
                      required
                      type="text"
                      className="block w-full bg-slate-50 py-3 px-4 text-slate-900 placeholder-slate-400 focus:outline-none sm:text-sm"
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
                <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">
                  Email Address
                </label>
                <div className="relative flex items-center rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <div className="pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    disabled
                    className="block w-full bg-transparent py-3 pl-3 pr-3 text-slate-500 cursor-not-allowed sm:text-sm"
                    value={inviteDetails?.email || ''}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">
                  Create Password
                </label>
                <div className={`relative flex items-center transition-all duration-300 rounded-xl overflow-hidden border ${focusedField === 'password' ? 'border-[#c8f542] ring-2 ring-[#c8f542]/20' : 'border-slate-200'}`}>
                  <div className="pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    className="block w-full bg-slate-50 py-3 pl-3 pr-10 text-slate-900 placeholder-slate-400 focus:outline-none sm:text-sm"
                    placeholder="Min. 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
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
                  className="w-full bg-[#18181b] hover:bg-slate-800 text-white font-semibold py-3.5 px-4 rounded-full transition-all duration-300 shadow-md flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Account...' : 'Create Account & Join'}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
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
