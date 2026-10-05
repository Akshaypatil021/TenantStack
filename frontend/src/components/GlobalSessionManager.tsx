import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export const GlobalSessionManager = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleAutoLogout = () => {
    logout();
    navigate('/login?expired=true');
  };

  const { timeLeft, isWarning, resetTimer } = useSessionTimeout({
    timeoutMinutes: 5,
    warningSeconds: 60,
    onTimeout: isAuthenticated ? handleAutoLogout : undefined,
  });

  if (!isAuthenticated) return null;

  return (
    <>
      {isWarning && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-[9999] max-w-sm bg-white border border-amber-300 shadow-2xl rounded-2xl p-4 flex items-start gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-900">Session Expiring Soon</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Auto-logout in <span className="font-mono font-bold text-amber-600">{timeLeft}s</span> due to 5 min inactivity.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={resetTimer}
                className="bg-slate-900 hover:bg-slate-800 text-[#c8f542] px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};
