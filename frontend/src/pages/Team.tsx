import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Plus,
  Mail,
  FolderKanban,
  Trash2,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  UserCheck,
  Send
} from 'lucide-react';

interface MemberProject {
  projectId: string;
  projectName: string;
  role: 'OWNER' | 'ADMIN' | 'CONTRIBUTOR' | 'VIEWER';
  joinedAt?: string;
}

interface TeamMember {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    developerRole?: string;
  };
  projects: MemberProject[];
  isCurrentUser: boolean;
}

interface ProjectSummary {
  _id: string;
  name: string;
  role: string;
  membersCount: number;
}

interface PendingInvitation {
  _id: string;
  email: string;
  role: string;
  projectId: string;
  projectName: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
}

export const Team: React.FC = () => {
  const { token, user } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteProjectId, setInviteProjectId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'CONTRIBUTOR' | 'VIEWER'>('CONTRIBUTOR');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/v1/projects/team/members', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch team members');

      setMembers(data.members || []);
      setProjects(data.projects || []);
      setPendingInvitations(data.pendingInvitations || []);

      if (data.projects?.length > 0 && !inviteProjectId) {
        setInviteProjectId(data.projects[0]._id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteProjectId) {
      setInviteError('Please select a project to invite to');
      return;
    }
    setInviteError(null);
    setInviteSuccess(null);
    setIsInviting(true);

    try {
      const res = await fetch(`http://localhost:5000/api/v1/projects/${inviteProjectId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation');

      setInviteSuccess(`Invitation sent successfully to ${inviteEmail}`);
      setInviteEmail('');
      // Refetch team and invites
      fetchTeamData();
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess(null);
      }, 1500);
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvitation = async (projectId: string, invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/v1/projects/${projectId}/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPendingInvitations(pendingInvitations.filter((i) => i._id !== invitationId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to revoke invitation');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error revoking invitation');
    }
  };

  const handleRemoveMemberFromProject = async (projectId: string, memberUserId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this project?`)) return;
    try {
      const res = await fetch(`http://localhost:5000/api/v1/projects/${projectId}/members/${memberUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchTeamData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove member');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error removing member');
    }
  };

  // Filter members based on Search, Project, and Role
  const filteredMembers = members.filter((member) => {
    const fullName = `${member.user.firstName} ${member.user.lastName}`.toLowerCase();
    const email = member.user.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = fullName.includes(query) || email.includes(query);

    const matchesProject =
      selectedProjectFilter === 'ALL' ||
      member.projects.some((p) => p.projectId === selectedProjectFilter);

    const matchesRole =
      selectedRoleFilter === 'ALL' ||
      member.projects.some((p) => p.role === selectedRoleFilter);

    return matchesSearch && matchesProject && matchesRole;
  });

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'ADMIN':
        return 'bg-purple-100 text-purple-900 border-purple-200';
      case 'CONTRIBUTOR':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // Color generator for avatar based on name initials
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-emerald-600',
      'bg-indigo-600',
      'bg-violet-600',
      'bg-amber-600',
      'bg-blue-600',
      'bg-rose-600',
      'bg-teal-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {/* ─── Header & Primary Action ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Team & Collaborators</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {members.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Members linked with your projects and workspaces, their access roles, and collaboration details.
          </p>
        </div>

        {projects.length > 0 && (
          <button
            onClick={() => {
              setInviteProjectId(projects[0]._id);
              setInviteError(null);
              setInviteSuccess(null);
              setShowInviteModal(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-[#c8f542] text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Invite Member
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Stat KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Total Collaborators</span>
            <span className="p-2 bg-emerald-50 text-[#5E9F71] rounded-xl">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{members.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Across all your projects</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Active Projects</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FolderKanban className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-indigo-600 mt-2">{projects.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Projects you are linked with</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Pending Invitations</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-amber-600 mt-2">{pendingInvitations.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Awaiting recipient acceptance</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Your Profile</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-sm font-extrabold text-slate-900 mt-2 truncate">
            {user?.firstName} {user?.lastName}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block truncate">{user?.email}</span>
        </div>
      </div>

      {/* ─── Tabs (Members vs Pending Invitations) ─── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'members'
              ? 'bg-slate-900 text-[#c8f542] shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Active Members ({members.length})
        </button>

        <button
          onClick={() => setActiveTab('invitations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'invitations'
              ? 'bg-slate-900 text-[#c8f542] shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Pending Invitations ({pendingInvitations.length})
        </button>
      </div>

      {/* ─── TAB 1: MEMBERS LIST ─── */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Search & Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search member by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#5E9F71]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Project:</span>
                <select
                  value={selectedProjectFilter}
                  onChange={(e) => setSelectedProjectFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Projects</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Role:</span>
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Roles</option>
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">Admin</option>
                  <option value="CONTRIBUTOR">Contributor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-16 text-center text-xs font-semibold text-slate-500">
                Loading team members...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-xs">
                {searchQuery || selectedProjectFilter !== 'ALL' || selectedRoleFilter !== 'ALL'
                  ? 'No members found matching your search and filter criteria.'
                  : 'No team members associated with your projects yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Role / Title</th>
                      <th className="py-3 px-4">Linked Projects & Access</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMembers.map((member) => {
                      const fullName = `${member.user.firstName} ${member.user.lastName}`.trim();
                      const initials = `${member.user.firstName?.[0] || ''}${member.user.lastName?.[0] || ''}`.toUpperCase() || 'U';

                      return (
                        <tr key={member.user._id} className="hover:bg-slate-50/70 transition">
                          {/* Member Details */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl ${getAvatarColor(
                                  fullName
                                )} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm`}
                              >
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 truncate">{fullName}</span>
                                  {member.isCurrentUser && (
                                    <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600">
                                      You
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 block truncate">
                                  {member.user.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Role / Title */}
                          <td className="py-3.5 px-4">
                            <span className="text-slate-600 font-medium text-[11px]">
                              {member.user.developerRole || 'Developer'}
                            </span>
                          </td>

                          {/* Linked Projects */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {member.projects.map((proj) => (
                                <div
                                  key={proj.projectId}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[11px]"
                                >
                                  <FolderKanban className="w-3 h-3 text-slate-400" />
                                  <span className="font-semibold">{proj.projectName}</span>
                                  <span
                                    className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(
                                      proj.role
                                    )}`}
                                  >
                                    {proj.role}
                                  </span>
                                </div>
                              ))}
                              {member.projects.length === 0 && (
                                <span className="text-slate-400 italic text-[11px]">No active projects</span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Can remove member from specific project if current user is owner/admin of that project */}
                              {member.projects.map((proj) => {
                                const myProject = projects.find((p) => p._id === proj.projectId);
                                const canRemove =
                                  myProject &&
                                  (myProject.role === 'OWNER' || myProject.role === 'ADMIN') &&
                                  proj.role !== 'OWNER' &&
                                  !member.isCurrentUser;

                                if (!canRemove) return null;

                                return (
                                  <button
                                    key={proj.projectId}
                                    onClick={() =>
                                      handleRemoveMemberFromProject(
                                        proj.projectId,
                                        member.user._id,
                                        fullName
                                      )
                                    }
                                    className="text-slate-400 hover:text-rose-600 text-[10px] font-semibold px-2 py-1 rounded-lg border border-transparent hover:border-rose-200 hover:bg-rose-50 transition cursor-pointer"
                                    title={`Remove from ${proj.projectName}`}
                                  >
                                    Remove from {proj.projectName}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: PENDING INVITATIONS ─── */}
      {activeTab === 'invitations' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pending Project Invitations</h3>
              <p className="text-xs text-slate-400">
                Invitations sent to collaborate that have not yet been accepted.
              </p>
            </div>
            {projects.length > 0 && (
              <button
                onClick={() => {
                  setInviteProjectId(projects[0]._id);
                  setInviteError(null);
                  setInviteSuccess(null);
                  setShowInviteModal(true);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-[#c8f542] text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Invite Another
              </button>
            )}
          </div>

          {pendingInvitations.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs">
              No pending invitations. All invited members have either joined or no invitations have been sent.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Invited Email</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Invited By</th>
                    <th className="py-3 px-4">Expires</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingInvitations.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{inv.email}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{inv.projectName}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${getRoleBadgeStyle(
                            inv.role
                          )}`}
                        >
                          {inv.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{inv.invitedBy}</td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleRevokeInvitation(inv.projectId, inv._id)}
                          className="text-slate-400 hover:text-rose-600 text-xs font-semibold p-1 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Revoke Invitation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── INVITE MEMBER MODAL ─── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-[#5E9F71]">
                <Send className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-extrabold text-slate-900">Invite Team Member</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Send an email invitation link to add a collaborator to your project.
            </p>

            {inviteError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#5E9F71]" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Project *</label>
                <select
                  value={inviteProjectId}
                  onChange={(e) => setInviteProjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#5E9F71]"
                >
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      📁 {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Collaborator Email *</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#5E9F71]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project Access Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none"
                >
                  <option value="CONTRIBUTOR">Contributor (Can update tasks, upload photos & sprint work)</option>
                  <option value="ADMIN">Admin (Can manage project members & settings)</option>
                  <option value="VIEWER">Viewer (Read-only access)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="flex-1 bg-[#5E9F71] hover:bg-[#4d855c] text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isInviting ? 'Sending Invite...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
