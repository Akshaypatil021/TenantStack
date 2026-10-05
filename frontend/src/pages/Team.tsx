import { useAuth } from '../context/AuthContext';
import { Plus, Shield } from 'lucide-react';

export const Team = () => {
  const { user } = useAuth();
  // We'll mock if the user is a tenant admin for now based on developerRole or a specific claim
  const isTenantAdmin = user?.developerRole?.toLowerCase().includes('admin') || user?.email === 'admin@gmail.com';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage organization members and roles</p>
        </div>
        {isTenantAdmin && (
          <button className="bg-slate-900 hover:bg-slate-800 text-[#c8f542] font-semibold text-sm px-4 py-2.5 rounded-xl transition shadow-lg shadow-slate-900/10 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Invite Member
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <Shield className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Organization Members</h2>
        </div>
        
        {isTenantAdmin ? (
          <p className="text-sm text-slate-500 text-center py-8">
            Team management functionality will be available soon. Here you will be able to invite and manage members across your tenant workspace.
          </p>
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">
            Only Organization Administrators can invite new members. Please contact your administrator.
          </p>
        )}
      </div>
    </div>
  );
};
