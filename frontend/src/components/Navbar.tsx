import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

export const Navbar = () => {
  const { user, tenant } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-500">Workspace /</span>
        <span className="text-sm font-semibold text-slate-900">{tenant?.name || 'My Organization'}</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Role Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-slate-600 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{user?.role || 'Tenant Admin'}</span>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-100">
          <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-[#c8f542] font-bold text-sm shadow-md">
            {user?.firstName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-slate-900 leading-none">{user?.firstName || 'User'}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-none">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
