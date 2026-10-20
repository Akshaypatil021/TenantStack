import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  FolderKanban, 
  LogOut, 
  Layers, 
  Building2, 
  Activity, 
  Users, 
  Server, 
  HardDrive,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { logout, tenant } = useAuth();
  const navigate = useNavigate();

  // Desktop Pin & Hover State (Persisted in localStorage)
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    const saved = localStorage.getItem('tenantstack_sidebar_pinned');
    return saved !== null ? saved === 'true' : true;
  });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Active expanded state (desktop)
  const isExpanded = isPinned || isHovered;

  // Listen for global mobile toggle event
  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    window.addEventListener('toggle-mobile-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-mobile-sidebar', handleToggle);
  }, []);

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
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP RESPONSIVE & COLLAPSIBLE SIDEBAR
      ───────────────────────────────────────────────────────────── */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden lg:flex flex-col h-screen sticky top-0 z-40 bg-white border-r border-slate-100 transition-all duration-300 ease-in-out shrink-0 select-none ${
          isExpanded ? 'w-64 shadow-xl shadow-slate-900/5' : 'w-20 shadow-none'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-[#c8f542] rounded-xl blur-md opacity-40"></div>
                <div className="relative bg-slate-900 text-[#c8f542] p-2 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              {isExpanded && (
                <div className="truncate">
                  <h1 className="font-bold text-base text-slate-900 tracking-tight leading-tight">TenantStack</h1>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mt-0.5">Workspace</p>
                </div>
              )}
            </div>

            {/* Pin / Collapse Toggle Button */}
            {isExpanded && (
              <button
                onClick={() => {
                  const next = !isPinned;
                  setIsPinned(next);
                  localStorage.setItem('tenantstack_sidebar_pinned', String(next));
                }}
                className={`p-1.5 rounded-lg transition shrink-0 cursor-pointer ${
                  isPinned
                    ? 'text-[#5E9F71] bg-[#c8f542]/20 hover:bg-[#c8f542]/30'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title={isPinned ? 'Collapse sidebar (expand on hover)' : 'Pin sidebar open'}
              >
                {isPinned ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Tenant Indicator */}
          {tenant && (
            <div
              className={`mx-3 my-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3 transition-all ${
                !isExpanded ? 'justify-center p-2' : ''
              }`}
              title={!isExpanded ? tenant.name : undefined}
            >
              <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
              {isExpanded && (
                <div className="truncate">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none">Organization</p>
                  <p className="text-xs font-bold text-slate-900 truncate mt-0.5 leading-tight">{tenant.name}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 group ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    } ${!isExpanded ? 'justify-center px-0' : ''}`
                  }
                  title={!isExpanded ? item.name : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#c8f542]' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      {isExpanded && <span className="truncate whitespace-nowrap">{item.name}</span>}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE SLIDE-OVER DRAWER
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            />

            {/* Slide-over Drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-72 bg-white h-full flex flex-col justify-between shadow-2xl z-10"
            >
              <div>
                {/* Brand & Close */}
                <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="absolute inset-0 bg-[#c8f542] rounded-xl blur-md opacity-40"></div>
                      <div className="relative bg-slate-900 text-[#c8f542] p-2 rounded-xl">
                        <Layers className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <h1 className="font-bold text-base text-slate-900 tracking-tight">TenantStack</h1>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Workspace</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tenant info */}
                {tenant && (
                  <div className="mx-4 my-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-xs text-slate-500 font-medium">Organization</p>
                      <p className="text-sm font-semibold text-slate-900 truncate">{tenant.name}</p>
                    </div>
                  </div>
                )}

                {/* Nav items */}
                <nav className="p-4 space-y-1.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                            isActive
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#c8f542]' : 'text-slate-400'}`} />
                            {item.name}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              {/* Mobile Logout */}
              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-5 h-5 text-rose-500" />
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          3. MOBILE FLOATING MENU TRIGGER BUTTON
      ───────────────────────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="w-12 h-12 bg-slate-900 text-[#c8f542] rounded-2xl shadow-xl shadow-slate-900/30 flex items-center justify-center active:scale-95 transition cursor-pointer"
          title="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </>
  );
};
