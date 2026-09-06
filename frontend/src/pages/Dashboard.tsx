import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FolderKanban, CreditCard, Shield, Zap, Users, Mail, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { token, tenant, user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/subscriptions/current', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSubscription(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    setInviteLoading(true);

    try {
      // First fetch role ID by name (in a real app, this would be a select dropdown with IDs)
      // For this demo, we assume the backend has an endpoint to get roles, or we just pass a string and let backend handle.
      // But our backend inviteUser expects roleId.
      // We don't have a fetch roles endpoint yet, so this is a limitation.
      // Let's assume we can add a 'fetchRoles' or we just hardcode the admin's role ID for now.
      // Wait! The user object in AuthContext only has role name.
      // We will need to send a request to get the tenant's roles, or change the backend to accept roleName.
      // Let's modify the backend inviteUser to accept 'roleName' instead of 'roleId' to make this easier!
      
      const res = await fetch('http://localhost:5000/api/v1/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail, roleName: inviteRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }

      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const projectUsagePercent = subscription?.usage?.projects
    ? Math.min(100, Math.round((subscription.usage.projects.used / subscription.usage.projects.max) * 100))
    : 0;

  return (
    <div className="space-y-8 relative">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-900/40 via-slate-900 to-indigo-900/40 border border-purple-500/20 p-8 rounded-3xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-semibold mb-3">
            <Zap className="w-3.5 h-3.5" /> Multi-Tenant Active Workspace
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed">
            Here's what's happening with <span className="text-purple-300 font-semibold">{tenant?.name}</span> today. 
            All data shown is strictly isolated to your organization.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Projects Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Projects</span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {loading ? '...' : subscription?.usage?.projects?.used ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              / {subscription?.usage?.projects?.max ?? 5} allowed
            </span>
          </div>
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${projectUsagePercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Team Members Card (New) */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Team Members</span>
              <div className="p-2 bg-pink-500/10 rounded-xl text-pink-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">
                {/* Mock value for now, typically fetched from backend */}
                1
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Active Users
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 rounded-xl transition text-xs"
          >
            Invite Member
          </button>
        </div>

        {/* Current Subscription Plan */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Plan</span>
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-2xl font-bold text-purple-400 tracking-wide">
              {loading ? '...' : subscription?.plan || 'FREE'}
            </span>
          </div>
          <Link
            to="/billing"
            className="inline-block mt-4 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-semibold px-3 py-1.5 rounded-lg border border-purple-500/30 transition w-full text-center"
          >
            Upgrade Plan
          </Link>
        </div>

        {/* Security & Tenant Isolation */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security Engine</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-base font-semibold text-emerald-400">Strict Tenant Isolation</span>
            <p className="text-xs text-slate-400 mt-2">
              Every request is verified via JWT and filtered by unique Tenant ID.
            </p>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl relative animate-[slideDown_0.3s_ease-out]">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/10 rounded-xl">
                  <Mail className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Invite Team Member</h2>
              </div>
              <p className="text-slate-400 text-sm mb-6">
                Send an invitation link for a new member to join {tenant?.name}.
              </p>

              {inviteSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                  {inviteSuccess}
                </div>
              )}
              {inviteError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
                  {inviteError}
                </div>
              )}

              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
                    placeholder="colleague@company.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Assign Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-purple-500 transition appearance-none"
                  >
                    <option value="Member">Member (Read/Write)</option>
                    <option value="Tenant Admin">Tenant Admin (Full Access)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {inviteLoading ? 'Sending...' : 'Send Invitation Email'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Need to create a new project?</h3>
          <p className="text-xs text-slate-400 mt-1">Manage your tasks and track progress easily.</p>
        </div>
        <Link
          to="/projects"
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition shadow-lg shadow-purple-600/20"
        >
          Go to Projects
        </Link>
      </div>
    </div>
  );
};
