import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  CreditCard, 
  LogOut, 
  Layers,
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = () => {
  const { logout, tenant } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Billing & Plans', path: '/billing', icon: CreditCard },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Brand Logo */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-gradient-to-tr from-purple-600 to-indigo-500 p-2.5 rounded-xl shadow-lg shadow-purple-500/20">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-wider">TenantFlow</h1>
            <p className="text-xs text-purple-400 font-medium">SaaS Platform</p>
          </div>
        </div>

        {/* Tenant Indicator */}
        {tenant && (
          <div className="mx-4 my-4 p-3 bg-slate-800/60 rounded-lg border border-slate-700/50 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="truncate">
              <p className="text-xs text-slate-400 font-medium">Organization</p>
              <p className="text-sm font-semibold text-slate-200 truncate">{tenant.name}</p>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
