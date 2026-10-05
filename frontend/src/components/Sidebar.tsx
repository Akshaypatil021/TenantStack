import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  LogOut, 
  Layers,
  Building2,
  Activity,
  Users,
  Server,
  HardDrive
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
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Compute', path: '/compute', icon: Server },
    { name: 'Storage', path: '/storage', icon: HardDrive },
    { name: 'Activity', path: '/activity', icon: Activity },
    { name: 'Team', path: '/team', icon: Users },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col justify-between h-screen sticky top-0 z-40">
      <div>
        {/* Brand Logo */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100">
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-[#c8f542] rounded-xl blur-md opacity-40"></div>
            <div className="relative bg-slate-900 text-[#c8f542] p-2 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-900 tracking-wider">TenantStack</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Workspace</p>
          </div>
        </div>

        {/* Tenant Indicator */}
        {tenant && (
          <div className="mx-4 my-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
            <div className="truncate">
              <p className="text-xs text-slate-500 font-medium">Organization</p>
              <p className="text-sm font-semibold text-slate-900 truncate">{tenant.name}</p>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `relative w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 group ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#c8f542]' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    {item.name}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm text-rose-600 hover:bg-rose-50 transition-colors group"
        >
          <LogOut className="w-5 h-5 text-rose-500 group-hover:text-rose-600" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
