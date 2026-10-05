import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { CheckCircle2, Lock } from 'lucide-react';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

export const ResetPassword = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setStatus('error');
      setMessage('Password must be at least 6 characters long');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch(`http://localhost:5000/api/v1/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setStatus('success');
      setMessage('Your password has been successfully reset.');
      
      // Navigate to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 relative selection:bg-[#c8f542] selection:text-slate-900 overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8">
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

      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="flex items-center justify-center gap-2.5 mb-8">
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
        
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
          Create new password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Your new password must be different from previous used passwords.
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-white py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 sm:rounded-[2.5rem] sm:px-10">
          {status === 'success' ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Password Reset Successful</h3>
              <p className="text-sm text-slate-500 mb-6">{message}</p>
              <p className="text-xs text-slate-400 mb-4">Redirecting to login...</p>
              <Link
                to="/login"
                className="w-full flex justify-center py-2.5 px-4 border border-slate-300 rounded-full shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                Click here if you are not redirected
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {status === 'error' && (
                <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">
                  {message}
                </div>
              )}
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 px-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#c8f542] focus:ring-2 focus:ring-[#c8f542]/20 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 px-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#c8f542] focus:ring-2 focus:ring-[#c8f542]/20 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-[#18181b] hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-full transition-all duration-300 shadow-md flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? (
                    <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
