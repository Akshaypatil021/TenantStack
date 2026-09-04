import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

export const Navbar = () => {
  const { user, tenant } = useAuth();

  return (
    <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-400">Workspace /</span>
        <span className="text-sm font-semibold text-slate-200">{tenant?.name || 'My Organization'}</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Role Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{user?.role || 'Tenant Admin'}</span>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {user?.firstName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-slate-200 leading-none">{user?.firstName || 'User'}</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-none">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
