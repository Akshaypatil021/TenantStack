import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Menu, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar = () => {
  const { user, tenant, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userInitials = (
    (user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')
  ).toUpperCase() || 'U';

  return (
    <header className="h-16 bg-white border-b border-slate-100 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      <div className="flex items-center gap-3">
        {/* Mobile Sidebar Toggle */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          title="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 truncate">
          <span className="text-sm font-medium text-slate-400 hidden sm:inline">Workspace /</span>
          <span className="text-sm font-semibold text-slate-900 truncate">{tenant?.name || 'My Organization'}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Role Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-slate-600 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{user?.developerRole || user?.role || 'Developer'}</span>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>

        {/* User Info & Sign Out */}
        <div
          className="flex items-center gap-2.5 group cursor-pointer"
          onClick={handleLogout}
          title="Sign Out"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c8f542] to-[#5E9F71] flex items-center justify-center text-slate-900 font-bold text-xs shadow-xs">
            {userInitials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-none">
              {user?.firstName} {user?.lastName || ''}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
              {user?.developerRole || 'Developer'}
            </p>
          </div>
          <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 transition hidden sm:block" />
        </div>
      </div>
    </header>
  );
};
