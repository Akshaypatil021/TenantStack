import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  AlertTriangle, 
  X, 
  Paperclip, 
  Upload, 
  Trash2, 
  FileText,
  Users,
  UserPlus,
  Layers,
  Zap,
  CheckSquare,
  BarChart3,
  Image as ImageIcon,
  Camera,
  CheckCircle2,
  Search,
  ExternalLink,
  Sparkles,
  Edit2,
  GitBranch,
  GitPullRequest,
  Terminal,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

type AgileTab = 'backlog' | 'sprints' | 'tasks' | 'code' | 'metrics' | 'team';

export const Projects = () => {
  const { token, user } = useAuth();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AgileTab>('sprints');
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLimitError, setIsLimitError] = useState(false);

  // GitHub & Code Collaboration State
  const [isSyncingGithub, setIsSyncingGithub] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [showGitModal, setShowGitModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');
  const [editProjectGithub, setEditProjectGithub] = useState('');
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  // Sprint Management State
  const [sprints, setSprints] = useState<any[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<any | null>(null);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [isEditingSprint, setIsEditingSprint] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [sprintName, setSprintName] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [sprintDurationWeeks, setSprintDurationWeeks] = useState(2);
  const [sprintStartDate, setSprintStartDate] = useState('');
  const [sprintEndDate, setSprintEndDate] = useState('');
  const [sprintStatus, setSprintStatus] = useState<string>('ACTIVE');
  const [isSavingSprint, setIsSavingSprint] = useState(false);
  const [sprintError, setSprintError] = useState<string | null>(null);

  // Agile Tasks State
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskSprint, setTaskSprint] = useState('Backlog');
  const [taskStatus, setTaskStatus] = useState('TODO');
  const [taskStoryPoints, setTaskStoryPoints] = useState(3);
  const [taskAssignedUser, setTaskAssignedUser] = useState('');
  const [taskPhotoFile, setTaskPhotoFile] = useState<File | null>(null);
  const [taskPhotoPreview, setTaskPhotoPreview] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  // Quick Card Photo Uploading
  const [uploadingPhotoTaskId, setUploadingPhotoTaskId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [targetUploadTaskId, setTargetUploadTaskId] = useState<string | null>(null);

  // Photo Lightbox Modal
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; title: string; uploader?: string } | null>(null);

  // Task Search and Filter in Tasks Tab
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('ALL');

  // File Management State
  const [activeProjectForFiles, setActiveProjectForFiles] = useState<any>(null);
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [storageUsage, setStorageUsage] = useState<any>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isFileLimitError, setIsFileLimitError] = useState(false);

  // Collaborators State
  const [activeProjectForMembers, setActiveProjectForMembers] = useState<any>(null);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [projectInvitations, setProjectInvitations] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('CONTRIBUTOR');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  const getUserRole = (project: any) => {
    if (!project || !user) return 'VIEWER';
    if (project.createdBy?._id === user.id || project.createdBy === user.id) return 'OWNER';
    const member = project.members?.find(
      (m: any) => m.user?._id === user.id || m.user === user.id
    );
    return member ? member.role : 'VIEWER';
  };

  useEffect(() => {
    fetchProjects();
    fetchStorageUsage();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchTasks(selectedProject._id);
      fetchMembers(selectedProject._id);
      fetchSprints(selectedProject._id);
    }
  }, [selectedProject]);

  const fetchSprints = async (projectId: string) => {
    setSprintsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/projects/${projectId}/sprints`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const list = data.sprints || [];
        setSprints(list);
        setSelectedSprint((prev: any) => {
          if (prev && list.some((s: any) => s._id === prev._id)) {
            return list.find((s: any) => s._id === prev._id);
          }
          const active = list.find((s: any) => s.status === 'ACTIVE');
          return active || (list.length > 0 ? list[0] : null);
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSprintsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const fetchedProjects = data.projects || [];
        setProjects(fetchedProjects);
        if (fetchedProjects.length > 0 && !selectedProject) {
          setSelectedProject(fetchedProjects[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageUsage = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/files/usage', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setStorageUsage(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = async (projectId: string) => {
    setTasksLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/projects/${projectId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchMembers = async (projectId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/projects/${projectId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setProjectMembers(data.members || []);
        setProjectInvitations(data.pendingInvitations || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLimitError(false);

    try {
      const res = await fetch('http://localhost:5000/api/v1/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: projectName, description: projectDescription, githubRepoUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.error?.includes('Subscription plan limit reached')) {
          setIsLimitError(true);
        }
        throw new Error(data.error || 'Failed to create project');
      }

      setProjects([data.project, ...projects]);
      setSelectedProject(data.project);
      setShowCreateProjectModal(false);
      setProjectName('');
      setProjectDescription('');
      setGithubRepoUrl('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSyncGithub = async () => {
    if (!selectedProject?._id) return;
    setIsSyncingGithub(true);
    setSyncSuccess(null);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/projects/${selectedProject._id}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync with GitHub');

      const updated = { ...selectedProject, lastSyncedAt: data.lastSyncedAt };
      setSelectedProject(updated);
      setProjects(projects.map((p) => (p._id === updated._id ? updated : p)));
      setSyncSuccess('Successfully synced latest repository changes!');
      setTimeout(() => setSyncSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to sync with GitHub');
    } finally {
      setIsSyncingGithub(false);
    }
  };

  const handleOpenEditProject = () => {
    if (!selectedProject) return;
    setEditProjectName(selectedProject.name || '');
    setEditProjectDescription(selectedProject.description || '');
    setEditProjectGithub(selectedProject.githubRepoUrl || '');
    setShowEditProjectModal(true);
  };

  const handleUpdateProjectSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject?._id) return;
    setIsUpdatingProject(true);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/projects/${selectedProject._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editProjectName,
          description: editProjectDescription,
          githubRepoUrl: editProjectGithub,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update project settings');

      const updated = data.project;
      setSelectedProject(updated);
      setProjects(projects.map((p) => (p._id === updated._id ? updated : p)));
      setShowEditProjectModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update project settings');
    } finally {
      setIsUpdatingProject(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(label);
    setTimeout(() => setCopiedCommand(null), 2500);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setTaskPhotoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setTaskPhotoPreview(previewUrl);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setTaskError(null);
    setIsCreatingTask(true);

    try {
      const formData = new FormData();
      formData.append('title', taskTitle);
      formData.append('description', taskDescription);
      formData.append('priority', taskPriority);
      formData.append('sprint', taskSprint);
      formData.append('status', taskStatus);
      formData.append('storyPoints', taskStoryPoints.toString());
      if (taskAssignedUser) {
        formData.append('assignedUserId', taskAssignedUser);
      }
      if (taskPhotoFile) {
        formData.append('photo', taskPhotoFile);
      }

      const res = await fetch(`http://localhost:5000/api/v1/projects/${selectedProject._id}/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create task');

      setTasks([data.task, ...tasks]);
      setShowCreateTaskModal(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskPhotoFile(null);
      setTaskPhotoPreview(null);
    } catch (err: any) {
      setTaskError(err.message);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    if (!selectedProject) return;
    try {
      // Optimistic UI update
      setTasks(tasks.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)));

      const res = await fetch(`http://localhost:5000/api/v1/projects/${selectedProject._id}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      setTasks(tasks.map((t) => (t._id === taskId ? data.task : t)));
    } catch (err) {
      console.error(err);
      fetchTasks(selectedProject._id);
    }
  };

  const handleMoveToSprint = async (taskId: string, sprintName: string) => {
    if (!selectedProject) return;
    try {
      setTasks(tasks.map((t) => (t._id === taskId ? { ...t, sprint: sprintName, status: 'TODO' } : t)));
      const res = await fetch(`http://localhost:5000/api/v1/projects/${selectedProject._id}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sprint: sprintName, status: 'TODO' }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks(tasks.map((t) => (t._id === taskId ? data.task : t)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerTaskPhotoUpload = (taskId: string) => {
    setTargetUploadTaskId(taskId);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
      photoInputRef.current.click();
    }
  };

  const handleCardPhotoUploaded = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !targetUploadTaskId || !selectedProject) return;
    const file = e.target.files[0];
    const taskId = targetUploadTaskId;
    setUploadingPhotoTaskId(taskId);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch(`http://localhost:5000/api/v1/projects/${selectedProject._id}/tasks/${taskId}/photo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload photo');

      setTasks(tasks.map((t) => (t._id === taskId ? data.task : t)));
    } catch (err: any) {
      alert(err.message || 'Error uploading photo');
    } finally {
      setUploadingPhotoTaskId(null);
      setTargetUploadTaskId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    if (!selectedProject) return;

    try {
      const res = await fetch(`http://localhost:5000/api/v1/projects/${selectedProject._id}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTasks(tasks.filter((t) => t._id !== taskId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Sprint Management Handlers ───
  const openCreateSprintModal = () => {
    setIsEditingSprint(false);
    setEditingSprintId(null);
    setSprintName(`Sprint ${sprints.length + 1}`);
    setSprintGoal('');
    setSprintDurationWeeks(2);
    const start = new Date();
    setSprintStartDate(start.toISOString().split('T')[0]);
    const end = new Date();
    end.setDate(end.getDate() + 14);
    setSprintEndDate(end.toISOString().split('T')[0]);
    setSprintStatus('ACTIVE');
    setSprintError(null);
    setShowSprintModal(true);
  };

  const openEditSprintModal = (sprint: any) => {
    if (!sprint) return;
    setIsEditingSprint(true);
    setEditingSprintId(sprint._id);
    setSprintName(sprint.name || '');
    setSprintGoal(sprint.goal || '');
    setSprintDurationWeeks(sprint.durationWeeks || 2);
    setSprintStartDate(sprint.startDate ? sprint.startDate.split('T')[0] : '');
    setSprintEndDate(sprint.endDate ? sprint.endDate.split('T')[0] : '');
    setSprintStatus(sprint.status || 'ACTIVE');
    setSprintError(null);
    setShowSprintModal(true);
  };

  const handleSaveSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setSprintError(null);
    setIsSavingSprint(true);

    try {
      const url = isEditingSprint && editingSprintId
        ? `http://localhost:5000/api/v1/projects/${selectedProject._id}/sprints/${editingSprintId}`
        : `http://localhost:5000/api/v1/projects/${selectedProject._id}/sprints`;

      const method = isEditingSprint ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: sprintName,
          goal: sprintGoal,
          durationWeeks: sprintDurationWeeks,
          startDate: sprintStartDate || undefined,
          endDate: sprintEndDate || undefined,
          status: sprintStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save sprint');

      if (isEditingSprint) {
        const updated = sprints.map((s) => (s._id === data.sprint._id ? data.sprint : s));
        setSprints(updated);
        if (selectedSprint?._id === data.sprint._id) {
          setSelectedSprint(data.sprint);
        }
        fetchTasks(selectedProject._id);
      } else {
        const updated = [...sprints, data.sprint];
        setSprints(updated);
        setSelectedSprint(data.sprint);
      }

      setShowSprintModal(false);
    } catch (err: any) {
      setSprintError(err.message);
    } finally {
      setIsSavingSprint(false);
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (!confirm('Are you sure you want to delete this sprint? Any assigned tasks will be moved to the Product Backlog.')) return;
    if (!selectedProject) return;

    try {
      const res = await fetch(`http://localhost:5000/api/v1/projects/${selectedProject._id}/sprints/${sprintId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete sprint');

      const updated = sprints.filter((s) => s._id !== sprintId);
      setSprints(updated);
      setSelectedSprint(updated.find((s) => s.status === 'ACTIVE') || updated[0] || null);
      fetchTasks(selectedProject._id);
    } catch (err: any) {
      alert(err.message || 'Error deleting sprint');
    }
  };

  // ─── File Management Functions ───
  const openFileModal = async (project: any) => {
    setActiveProjectForFiles(project);
    setFileError(null);
    setIsFileLimitError(false);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/files/projects/${project._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setProjectFiles(data.files || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFile = e.target.files[0];
    setUploadingFile(true);
    setFileError(null);
    setIsFileLimitError(false);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`http://localhost:5000/api/v1/files/projects/${activeProjectForFiles._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.error?.includes('Storage quota exceeded')) {
          setIsFileLimitError(true);
        }
        throw new Error(data.error || 'Failed to upload file');
      }
      setProjectFiles([data.file, ...projectFiles]);
      fetchStorageUsage();
    } catch (err: any) {
      setFileError(err.message);
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProjectFiles(projectFiles.filter((f) => f._id !== fileId));
        fetchStorageUsage();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Collaborators Functions ───
  const openMembersModal = async (project: any) => {
    setActiveProjectForMembers(project);
    setInviteError(null);
    setInviteSuccess(null);
    setMembersLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/projects/${project._id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setProjectMembers(data.members || []);
        setProjectInvitations(data.pendingInvitations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectForMembers) return;
    setInviteError(null);
    setInviteSuccess(null);
    setIsInviting(true);

    try {
      const res = await fetch(`http://localhost:5000/api/v1/projects/${activeProjectForMembers._id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to invite user');

      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('CONTRIBUTOR');
      openMembersModal(activeProjectForMembers);
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/v1/projects/${activeProjectForMembers._id}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProjectMembers(projectMembers.filter((m) => m.user._id !== memberId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/v1/projects/${activeProjectForMembers._id}/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProjectInvitations(projectInvitations.filter((i) => i._id !== invitationId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter tasks for active sprint Kanban
  const activeSprintName = selectedSprint?.name || '';
  const sprintTasks = tasks.filter((t) => (activeSprintName ? t.sprint === activeSprintName && t.status !== 'BACKLOG' : false));
  const backlogTasks = tasks.filter((t) => t.status === 'BACKLOG' || t.sprint === 'Backlog');

  const todoTasks = sprintTasks.filter((t) => t.status === 'TODO');
  const inProgressTasks = sprintTasks.filter((t) => t.status === 'IN_PROGRESS');
  const inReviewTasks = sprintTasks.filter((t) => t.status === 'IN_REVIEW');
  const doneTasks = sprintTasks.filter((t) => t.status === 'DONE');

  const totalSprintTasks = sprintTasks.length;
  const completedSprintTasks = doneTasks.length;
  const sprintProgress = totalSprintTasks > 0 ? Math.round((completedSprintTasks / totalSprintTasks) * 100) : 0;

  // Priority color helper
  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Helper to resolve photo URL
  const getFullPhotoUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `http://localhost:5000${url.startsWith('/') ? url : '/' + url}`;
  };

  const currentRole = selectedProject ? getUserRole(selectedProject) : 'VIEWER';
  const canEdit = currentRole !== 'VIEWER';

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-16">
      {/* Hidden file input for card photo uploading */}
      <input
        type="file"
        ref={photoInputRef}
        accept="image/*"
        onChange={handleCardPhotoUploaded}
        className="hidden"
      />

      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Project Workspace</h1>
            {loading && <span className="text-xs text-slate-400 animate-pulse font-normal">Loading...</span>}
            {selectedProject && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {currentRole}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Agile sprints, backlog tracking, and collaborative media photo uploads
          </p>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {projects.length > 0 && (
            <div className="relative">
              <select
                value={selectedProject?._id || ''}
                onChange={(e) => {
                  const proj = projects.find((p) => p._id === e.target.value);
                  if (proj) setSelectedProject(proj);
                }}
                className="bg-white border border-slate-200 shadow-sm text-slate-900 font-semibold text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E9F71]/30 cursor-pointer pr-8"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    📁 {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedProject && (
            <button
              onClick={() => openMembersModal(selectedProject)}
              className="bg-white border border-slate-200 shadow-sm hover:border-slate-300 text-slate-700 font-semibold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-[#5E9F71]" />
              Team ({projectMembers.length || 1})
            </button>
          )}

          {selectedProject && (
            <button
              onClick={() => openFileModal(selectedProject)}
              className="bg-white border border-slate-200 shadow-sm hover:border-slate-300 text-slate-700 font-semibold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
              Files
            </button>
          )}

          <button
            onClick={() => {
              setError(null);
              setIsLimitError(false);
              setShowCreateProjectModal(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </button>
        </div>
      </div>

      {/* ─── GitHub & Code Collaboration Banner ─── */}
      {selectedProject && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#c8f542] flex items-center justify-center shrink-0 shadow-sm">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  {selectedProject.name}
                </span>
                {selectedProject.githubRepoUrl ? (
                  <a
                    href={selectedProject.githubRepoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
                  >
                    <span>{selectedProject.githubRepoUrl.replace('https://github.com/', 'github.com/')}</span>
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 font-medium">No GitHub repo connected</span>
                )}

                {selectedProject.githubRepoUrl && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {selectedProject.lastSyncedAt
                      ? `Synced ${new Date(selectedProject.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Sync ready'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedProject.description || 'Collaborative workspace repository for team members and contributors.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            {selectedProject.githubRepoUrl ? (
              <>
                <button
                  type="button"
                  onClick={handleSyncGithub}
                  disabled={isSyncingGithub}
                  title="Pull latest code from GitHub"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#5E9F71] ${isSyncingGithub ? 'animate-spin' : ''}`} />
                  {isSyncingGithub ? 'Syncing...' : 'Sync GitHub'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowGitModal(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-[#c8f542] text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Code Integration Guide
                </button>
              </>
            ) : (
              (currentRole === 'OWNER' || currentRole === 'ADMIN') && (
                <button
                  type="button"
                  onClick={handleOpenEditProject}
                  className="bg-[#5E9F71] hover:bg-[#4d855c] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  Connect GitHub Repo
                </button>
              )
            )}

            {(currentRole === 'OWNER' || currentRole === 'ADMIN') && (
              <button
                type="button"
                onClick={handleOpenEditProject}
                title="Edit Project & Repo Settings"
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {syncSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncSuccess}</span>
        </div>
      )}

      {/* Agile Sub-Navigation Pills (Matching User Screenshot) */}
      <div className="flex items-center justify-between bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => setActiveTab('backlog')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'backlog'
                ? 'bg-slate-900 text-[#c8f542] shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Backlog
            {backlogTasks.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'backlog' ? 'bg-[#c8f542]/20 text-[#c8f542]' : 'bg-slate-100 text-slate-600'}`}>
                {backlogTasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sprints')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sprints'
                ? 'bg-slate-900 text-[#c8f542] shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Sprints
            {sprintTasks.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'sprints' ? 'bg-[#c8f542]/20 text-[#c8f542]' : 'bg-slate-100 text-slate-600'}`}>
                {sprintTasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-slate-900 text-[#c8f542] shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Tasks
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'code'
                ? 'bg-slate-900 text-[#c8f542] shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Code & GitHub
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'metrics'
                ? 'bg-slate-900 text-[#c8f542] shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Metrics
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'team'
                ? 'bg-slate-900 text-[#c8f542] shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Team
          </button>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setTaskSprint(selectedSprint ? selectedSprint.name : (sprints[0]?.name || 'Backlog'));
              setShowCreateTaskModal(true);
            }}
            className="bg-[#5E9F71] hover:bg-[#4d855c] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 ml-2"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Add Task
          </button>
        )}
      </div>

      {/* ─── TAB 1: SPRINTS VIEW (MAIN WORKSPACE) ─── */}
      {activeTab === 'sprints' && (
        <div className="space-y-6">
          {sprintsLoading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-500 font-semibold shadow-sm">
              Loading sprints...
            </div>
          ) : sprints.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
              <div className="w-14 h-14 bg-emerald-50 text-[#5E9F71] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-100 shadow-sm">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">No Sprints Created Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
                You haven&apos;t created any sprints for this project yet. Create a sprint to set your team&apos;s goal, track velocity, and organize tasks.
              </p>
              {canEdit && (
                <button
                  onClick={openCreateSprintModal}
                  className="bg-slate-900 hover:bg-slate-800 text-[#c8f542] text-xs font-bold px-4 py-2.5 rounded-xl transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create First Sprint
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Dynamic Sprint Header Banner */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Sprint Selector Dropdown */}
                      <div className="relative">
                        <select
                          value={selectedSprint?._id || ''}
                          onChange={(e) => {
                            const s = sprints.find((sp) => sp._id === e.target.value);
                            if (s) setSelectedSprint(s);
                          }}
                          className="bg-slate-50 border border-slate-200 font-extrabold text-slate-900 text-sm px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E9F71]/30 cursor-pointer pr-8"
                        >
                          {sprints.map((s) => (
                            <option key={s._id} value={s._id}>
                              ⚡ {s.name} ({s.status})
                            </option>
                          ))}
                        </select>
                      </div>

                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1.5 ${
                          selectedSprint?.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedSprint?.status === 'COMPLETED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {selectedSprint?.status === 'ACTIVE' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        {selectedSprint?.status}
                      </span>

                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {selectedSprint?.durationWeeks || 2} Weeks
                      </span>

                      {selectedSprint?.startDate && selectedSprint?.endDate && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(selectedSprint.startDate).toLocaleDateString()} – {new Date(selectedSprint.endDate).toLocaleDateString()}
                        </span>
                      )}

                      {canEdit && (
                        <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                          <button
                            onClick={() => openEditSprintModal(selectedSprint)}
                            className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                            title="Edit Sprint Settings & Goal"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500" />
                            Edit
                          </button>
                          <button
                            onClick={openCreateSprintModal}
                            className="text-xs text-[#5E9F71] hover:text-[#4d855c] font-semibold px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-50/50 transition flex items-center gap-1 cursor-pointer"
                            title="Create New Sprint"
                          >
                            <Plus className="w-3 h-3" />
                            New Sprint
                          </button>
                          {(currentRole === 'OWNER' || currentRole === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteSprint(selectedSprint._id)}
                              className="text-xs text-slate-400 hover:text-rose-600 font-semibold p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="Delete Sprint"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-600">
                      <span className="font-bold text-slate-700">Sprint Goal: </span>
                      {selectedSprint?.goal ? (
                        selectedSprint.goal
                      ) : (
                        <span className="italic text-slate-400">No sprint goal specified yet. Click &quot;Edit&quot; to set one.</span>
                      )}
                    </p>
                  </div>

                  {/* Sprint Progress Gauge */}
                  <div className="flex items-center gap-4 min-w-[240px]">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Sprint Velocity</span>
                        <span>
                          {sprintProgress}% ({completedSprintTasks}/{totalSprintTasks} Done)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#5E9F71] to-[#c8f542] h-full rounded-full transition-all duration-500"
                          style={{ width: `${sprintProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

          {/* Kanban Board Columns */}
          {tasksLoading ? (
            <div className="text-center py-16 text-slate-500 text-xs font-semibold">
              Loading sprint tasks...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              
              {/* Column 1: TO DO */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">To Do</h3>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                      {todoTasks.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  {todoTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      canEdit={canEdit}
                      onUpdateStatus={handleUpdateTaskStatus}
                      onTriggerUpload={triggerTaskPhotoUpload}
                      onViewPhoto={(url, title, uploader) => setLightboxPhoto({ url, title, uploader })}
                      onDelete={handleDeleteTask}
                      uploadingPhotoId={uploadingPhotoTaskId}
                      getFullPhotoUrl={getFullPhotoUrl}
                      getPriorityBadge={getPriorityBadge}
                    />
                  ))}
                  {todoTasks.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                      No tasks in To Do
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: IN PROGRESS */}
              <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-3.5 flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">In Progress</h3>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                      {inProgressTasks.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  {inProgressTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      canEdit={canEdit}
                      onUpdateStatus={handleUpdateTaskStatus}
                      onTriggerUpload={triggerTaskPhotoUpload}
                      onViewPhoto={(url, title, uploader) => setLightboxPhoto({ url, title, uploader })}
                      onDelete={handleDeleteTask}
                      uploadingPhotoId={uploadingPhotoTaskId}
                      getFullPhotoUrl={getFullPhotoUrl}
                      getPriorityBadge={getPriorityBadge}
                    />
                  ))}
                  {inProgressTasks.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-blue-200 rounded-xl text-xs text-blue-400">
                      No tasks in progress
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: IN REVIEW */}
              <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-3.5 flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">In Review</h3>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                      {inReviewTasks.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  {inReviewTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      canEdit={canEdit}
                      onUpdateStatus={handleUpdateTaskStatus}
                      onTriggerUpload={triggerTaskPhotoUpload}
                      onViewPhoto={(url, title, uploader) => setLightboxPhoto({ url, title, uploader })}
                      onDelete={handleDeleteTask}
                      uploadingPhotoId={uploadingPhotoTaskId}
                      getFullPhotoUrl={getFullPhotoUrl}
                      getPriorityBadge={getPriorityBadge}
                    />
                  ))}
                  {inReviewTasks.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-amber-200 rounded-xl text-xs text-amber-400">
                      No tasks in review
                    </div>
                  )}
                </div>
              </div>

              {/* Column 4: DONE */}
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-3.5 flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Done</h3>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                      {doneTasks.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  {doneTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      canEdit={canEdit}
                      onUpdateStatus={handleUpdateTaskStatus}
                      onTriggerUpload={triggerTaskPhotoUpload}
                      onViewPhoto={(url, title, uploader) => setLightboxPhoto({ url, title, uploader })}
                      onDelete={handleDeleteTask}
                      uploadingPhotoId={uploadingPhotoTaskId}
                      getFullPhotoUrl={getFullPhotoUrl}
                      getPriorityBadge={getPriorityBadge}
                    />
                  ))}
                  {doneTasks.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-emerald-200 rounded-xl text-xs text-emerald-400">
                      No completed tasks yet
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  )}

      {/* ─── TAB 2: BACKLOG VIEW ─── */}
      {activeTab === 'backlog' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Product Backlog</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Unassigned user stories and future sprint items awaiting commitment.
              </p>
            </div>
            {canEdit && (
              <button
                onClick={() => {
                  setTaskSprint('Backlog');
                  setTaskStatus('BACKLOG');
                  setShowCreateTaskModal(true);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-[#c8f542] text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add to Backlog
              </button>
            )}
          </div>

          <div className="space-y-3">
            {backlogTasks.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
                Backlog is currently empty. Add user stories to plan future sprints.
              </div>
            ) : (
              backlogTasks.map((task) => (
                <div
                  key={task._id}
                  className="bg-white border border-slate-200 hover:border-slate-300 p-4 rounded-xl shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {task.photoUrl && (
                      <img
                        src={getFullPhotoUrl(task.photoUrl)}
                        alt={task.title}
                        onClick={() => setLightboxPhoto({ url: getFullPhotoUrl(task.photoUrl), title: task.title, uploader: task.createdBy?.name })}
                        className="w-14 h-14 rounded-lg object-cover cursor-pointer hover:opacity-90 shrink-0 border border-slate-200"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {task.storyPoints} pts
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 truncate">{task.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{task.description || 'No description'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {canEdit && (
                      <div className="flex items-center gap-1.5">
                        {sprints.length > 0 ? (
                          <div className="relative">
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleMoveToSprint(task._id, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              className="bg-[#5E9F71] hover:bg-[#4d855c] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer pr-7 appearance-none"
                            >
                              <option value="" disabled>Move to Sprint...</option>
                              {sprints.map((s) => (
                                <option key={s._id} value={s.name} className="text-slate-900 bg-white">
                                  ⚡ {s.name}
                                </option>
                              ))}
                            </select>
                            <Zap className="w-3 h-3 text-white absolute right-2 top-2 pointer-events-none" />
                          </div>
                        ) : (
                          <button
                            onClick={openCreateSprintModal}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            Create Sprint
                          </button>
                        )}
                      </div>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => handleDeleteTask(task._id)}
                        className="text-slate-400 hover:text-rose-500 p-1.5 transition cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: ALL TASKS TABLE VIEW ─── */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search tasks by title..."
                value={taskSearchQuery}
                onChange={(e) => setTaskSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#5E9F71]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Task</th>
                    <th className="py-3 px-4">Sprint</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Photo</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4">Status</th>
                    {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks
                    .filter((t) => taskStatusFilter === 'ALL' || t.status === taskStatusFilter)
                    .filter((t) => t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()))
                    .map((task) => (
                      <tr key={task._id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {task.title}
                          {task.description && (
                            <p className="font-normal text-slate-400 line-clamp-1 text-[11px] mt-0.5">{task.description}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-600">
                          {task.sprint}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityBadge(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {task.photoUrl ? (
                            <img
                              src={getFullPhotoUrl(task.photoUrl)}
                              alt="photo"
                              onClick={() => setLightboxPhoto({ url: getFullPhotoUrl(task.photoUrl), title: task.title, uploader: task.createdBy?.name })}
                              className="w-8 h-8 rounded-lg object-cover cursor-pointer hover:opacity-80 border border-slate-200"
                            />
                          ) : (
                            <button
                              onClick={() => triggerTaskPhotoUpload(task._id)}
                              className="text-slate-400 hover:text-indigo-600 transition p-1"
                              title="Upload Photo"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {task.assignedTo?.name || <span className="text-slate-400 italic">Unassigned</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          {canEdit ? (
                            <select
                              value={task.status}
                              onChange={(e) => handleUpdateTaskStatus(task._id, e.target.value)}
                              className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-2 py-1 text-slate-800"
                            >
                              <option value="BACKLOG">Backlog</option>
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="IN_REVIEW">In Review</option>
                              <option value="DONE">Done</option>
                            </select>
                          ) : (
                            <span className="font-bold text-slate-700">{task.status}</span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteTask(task._id)}
                              className="text-slate-400 hover:text-rose-500 transition p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: CODE & GITHUB INTEGRATION ─── */}
      {activeTab === 'code' && (
        <div className="space-y-6">
          {selectedProject?.githubRepoUrl ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-[#c8f542] flex items-center justify-center shrink-0 shadow-md">
                    <GitBranch className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                      Connected Repository
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </h2>
                    <a
                      href={selectedProject.githubRepoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-[#5E9F71] hover:underline flex items-center gap-1 mt-0.5"
                    >
                      {selectedProject.githubRepoUrl} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSyncGithub}
                    disabled={isSyncingGithub}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 text-[#5E9F71] ${isSyncingGithub ? 'animate-spin' : ''}`} />
                    {isSyncingGithub ? 'Syncing...' : 'Sync Now'}
                  </button>

                  {(currentRole === 'OWNER' || currentRole === 'ADMIN') && (
                    <button
                      type="button"
                      onClick={handleOpenEditProject}
                      className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Configure Repo
                    </button>
                  )}
                </div>
              </div>

              {/* Collaborative Git Workflow Guide */}
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#5E9F71]" />
                  Collaborative Git Workflow for Team Members
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  All invited project members ({projectMembers.length} active) can clone this repository, create feature branches, and integrate their code:
                </p>

                <div className="space-y-3">
                  {[
                    {
                      step: '1. Clone the project repository',
                      cmd: `git clone ${selectedProject.githubRepoUrl}`,
                      id: 'clone',
                    },
                    {
                      step: '2. Create a dedicated feature branch for your sprint task',
                      cmd: 'git checkout -b feature/sprint-task',
                      id: 'branch',
                    },
                    {
                      step: '3. Commit your code modifications',
                      cmd: 'git add . && git commit -m "feat: complete agile sprint task"',
                      id: 'commit',
                    },
                    {
                      step: '4. Push your branch to GitHub and create a Pull Request',
                      cmd: 'git push origin feature/sprint-task',
                      id: 'push',
                    },
                  ].map((item) => (
                    <div key={item.id} className="bg-slate-900 text-slate-100 rounded-xl p-3.5 flex items-center justify-between font-mono text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 font-sans mb-1">{item.step}</p>
                        <p className="text-[#c8f542]">{item.cmd}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.cmd, item.id)}
                        className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg transition ml-3 cursor-pointer shrink-0"
                        title="Copy Command"
                      >
                        {copiedCommand === item.id ? <Check className="w-4 h-4 text-[#c8f542]" /> : <Copy className="w-4 h-4 text-slate-400" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Roles & Collaboration access info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <span className="font-bold text-slate-800">Owner & Admin</span>
                  <p className="text-[11px] text-slate-500 mt-1">Full access to manage repository, delete tasks, invite members, and configure settings.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <span className="font-bold text-slate-800">Contributor</span>
                  <p className="text-[11px] text-slate-500 mt-1">Can pull code, push feature branches, add & complete sprint tasks, and upload photos.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <span className="font-bold text-slate-800">Viewer</span>
                  <p className="text-[11px] text-slate-500 mt-1">Read-only view of sprint board, attachments, and project progress.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-[#c8f542]/20 text-[#5E9F71] flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-1">No GitHub Repository Linked</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                Connect a GitHub repository so your team collaborators can clone the codebase, push feature branches, and integrate code seamlessly.
              </p>
              {(currentRole === 'OWNER' || currentRole === 'ADMIN') ? (
                <button
                  type="button"
                  onClick={handleOpenEditProject}
                  className="bg-slate-900 hover:bg-slate-800 text-[#c8f542] font-bold text-xs px-5 py-2.5 rounded-xl transition inline-flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Connect GitHub Repository
                </button>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Only the project Owner or Admin can connect a GitHub repository.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: METRICS & VELOCITY ─── */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-500 font-semibold">Total Tasks</span>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">{tasks.length}</p>
              <span className="text-[10px] text-slate-400 mt-1 block">Across all sprints</span>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-500 font-semibold">Sprint Velocity</span>
              <p className="text-3xl font-extrabold text-[#5E9F71] mt-2">{sprintProgress}%</p>
              <span className="text-[10px] text-slate-400 mt-1 block">{completedSprintTasks} of {totalSprintTasks} tasks done</span>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-500 font-semibold">Tasks In Progress</span>
              <p className="text-3xl font-extrabold text-blue-600 mt-2">{inProgressTasks.length}</p>
              <span className="text-[10px] text-slate-400 mt-1 block">Actively being worked on</span>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-500 font-semibold">Team Collaborators</span>
              <p className="text-3xl font-extrabold text-indigo-600 mt-2">{projectMembers.length || 1}</p>
              <span className="text-[10px] text-slate-400 mt-1 block">Active on this project</span>
            </div>
          </div>

          {/* Agile Team Velocity Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#5E9F71]" />
              Agile Sprint Health &amp; Collaboration Breakdown
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Completed Tasks (Done)</span>
                  <span>{doneTasks.length} tasks</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(doneTasks.length / (tasks.length || 1)) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Under Review &amp; Testing</span>
                  <span>{inReviewTasks.length} tasks</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(inReviewTasks.length / (tasks.length || 1)) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Pending / Blocked</span>
                  <span>{todoTasks.length + inProgressTasks.length} tasks</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${((todoTasks.length + inProgressTasks.length) / (tasks.length || 1)) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: TEAM & COLLABORATORS ─── */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Project Collaborators</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Invite teammates and contributors to work together and complete pending tasks.
              </p>
            </div>
            {(currentRole === 'OWNER' || currentRole === 'ADMIN') && (
              <button
                onClick={() => selectedProject && openMembersModal(selectedProject)}
                className="bg-[#5E9F71] hover:bg-[#4d855c] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Invite Teammate
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectMembers.map((member) => {
              const assignedTasksCount = tasks.filter((t) => t.assignedTo?.userId === member.user._id && t.status !== 'DONE').length;
              return (
                <div key={member.user._id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5E9F71] to-[#c8f542] flex items-center justify-center text-slate-900 font-extrabold text-sm shrink-0 shadow-sm">
                    {member.user.firstName?.charAt(0)}{member.user.lastName?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {member.user.firstName} {member.user.lastName}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {member.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{member.user.email}</p>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
                      <span>Pending Tasks:</span>
                      <span className="font-bold text-slate-900">{assignedTasksCount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── CREATE TASK MODAL (WITH PHOTO UPLOAD) ─── */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowCreateTaskModal(false);
                setTaskPhotoFile(null);
                setTaskPhotoPreview(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-extrabold text-slate-900 mb-1">Create Sprint Task</h2>
            <p className="text-xs text-slate-500 mb-4">
              Add task details, assign team members, and attach a photo or screenshot.
            </p>

            {taskError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{taskError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement OAuth login screen & tests"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#5E9F71]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe acceptance criteria or steps to complete..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#5E9F71]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sprint</label>
                  <select
                    value={taskSprint}
                    onChange={(e) => setTaskSprint(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="Backlog">📦 Product Backlog</option>
                    {sprints.map((s) => (
                      <option key={s._id} value={s.name}>
                        ⚡ {s.name} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Story Pts</label>
                  <select
                    value={taskStoryPoints}
                    onChange={(e) => setTaskStoryPoints(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none"
                  >
                    {[1, 2, 3, 5, 8, 13, 21].map((pts) => (
                      <option key={pts} value={pts}>{pts} pts</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assignee</label>
                  <select
                    value={taskAssignedUser}
                    onChange={(e) => setTaskAssignedUser(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {projectMembers.map((m) => (
                      <option key={m.user._id} value={m.user._id}>
                        {m.user.firstName} {m.user.lastName} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Photo Upload Field */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Photo / Screenshot Attachment</span>
                  <span className="text-[10px] text-slate-400 font-normal">PNG, JPG, WebP</span>
                </label>

                {taskPhotoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2 flex items-center gap-3">
                    <img
                      src={taskPhotoPreview}
                      alt="Preview"
                      className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{taskPhotoFile?.name}</p>
                      <p className="text-[10px] text-slate-500">{(taskPhotoFile!.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTaskPhotoFile(null);
                        setTaskPhotoPreview(null);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-[#5E9F71] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/50 hover:bg-emerald-50/20">
                    <Camera className="w-6 h-6 text-[#5E9F71] mb-1.5" />
                    <span className="text-xs font-bold text-slate-800">Upload Task Photo or Screenshot</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Click to browse file</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTask}
                  className="flex-1 bg-[#5E9F71] hover:bg-[#4d855c] text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isCreatingTask ? 'Creating...' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CREATE / EDIT SPRINT MODAL ─── */}
      {showSprintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowSprintModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-[#5E9F71]">
                <Zap className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-extrabold text-slate-900">
                {isEditingSprint ? 'Edit Sprint Settings' : 'Create New Sprint'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              {isEditingSprint
                ? 'Update sprint goal, timeline, and current working status.'
                : 'Plan your next sprint cycle with custom goals, duration, and target dates.'}
            </p>

            {sprintError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{sprintError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSprint} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sprint Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint 1 — User Authentication & Database"
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#5E9F71]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sprint Goal</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Implement photo uploads, verify database isolation, and ship core APIs..."
                  value={sprintGoal}
                  onChange={(e) => setSprintGoal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#5E9F71]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Weeks)</label>
                  <select
                    value={sprintDurationWeeks}
                    onChange={(e) => setSprintDurationWeeks(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value={1}>1 Week</option>
                    <option value={2}>2 Weeks</option>
                    <option value={3}>3 Weeks</option>
                    <option value={4}>4 Weeks</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={sprintStatus}
                    onChange={(e) => setSprintStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PLANNING">Planning</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={sprintStartDate}
                    onChange={(e) => setSprintStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={sprintEndDate}
                    onChange={(e) => setSprintEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSprintModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSprint}
                  className="flex-1 bg-[#5E9F71] hover:bg-[#4d855c] text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSavingSprint ? 'Saving...' : isEditingSprint ? 'Update Sprint' : 'Create Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PHOTO LIGHTBOX MODAL ─── */}
      {lightboxPhoto && (
        <div
          onClick={() => setLightboxPhoto(null)}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl relative cursor-default"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{lightboxPhoto.title}</h3>
                {lightboxPhoto.uploader && (
                  <p className="text-[11px] text-slate-500">Uploaded by {lightboxPhoto.uploader}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxPhoto.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                  title="Open original"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setLightboxPhoto(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-slate-950 p-2 flex items-center justify-center max-h-[75vh]">
              <img
                src={lightboxPhoto.url}
                alt="Task attachment"
                className="max-h-[70vh] max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATE PROJECT MODAL ─── */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateProjectModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-slate-900 mb-1">Create New Project</h2>
            <p className="text-xs text-slate-500 mb-6">All projects are isolated to your workspace.</p>

            {error && (
              <div
                className={`mb-6 p-4 rounded-xl text-xs ${
                  isLimitError
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-700'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{error}</p>
                    {isLimitError && (
                      <Link
                        to="/billing"
                        onClick={() => setShowCreateProjectModal(false)}
                        className="inline-block mt-2 bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded hover:bg-amber-400 transition"
                      >
                        Upgrade Subscription 🚀
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile Banking App"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#5E9F71]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe what this project is for..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#5E9F71]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GitHub Repo URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://github.com/org/repo"
                  value={githubRepoUrl}
                  onChange={(e) => setGithubRepoUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#5E9F71]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProjectModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-[#c8f542] font-bold py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── FILE MANAGER MODAL ─── */}
      {activeProjectForFiles && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setActiveProjectForFiles(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Project Attachments: <span className="text-[#5E9F71]">{activeProjectForFiles.name}</span>
            </h2>
            <p className="text-xs text-slate-500 mb-4">Files are stored securely under isolated workspace directories.</p>

            {fileError && (
              <div className="mb-4 p-4 rounded-xl text-xs bg-rose-50 border border-rose-200 text-rose-700">
                <p className="font-semibold">{fileError}</p>
                {isFileLimitError && (
                  <p className="mt-1 text-[11px] text-rose-600">Storage limit reached. Upgrade plan for more space.</p>
                )}
              </div>
            )}

            {storageUsage && (
              <div className="mb-4 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex justify-between text-xs text-slate-700 font-semibold mb-1">
                  <span>Quota: {storageUsage.usedMB} MB / {storageUsage.maxStorageMB} MB</span>
                  <span>{storageUsage.percentUsed}%</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${storageUsage.percentUsed > 90 ? 'bg-rose-500' : 'bg-[#5E9F71]'}`}
                    style={{ width: `${Math.min(storageUsage.percentUsed, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* File Upload Dropzone */}
            {getUserRole(activeProjectForFiles) !== 'VIEWER' && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 hover:border-[#5E9F71] rounded-xl p-6 text-center mb-6 transition">
                <Upload className="w-8 h-8 text-[#5E9F71] mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-900">
                  {uploadingFile ? 'Uploading file...' : 'Upload document or file'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 mb-3">Enforced against tenant storage quota</p>
                <label className="bg-[#5E9F71] hover:bg-[#4d855c] text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition inline-block">
                  Choose File
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* File List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {projectFiles.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-xs">No files uploaded to this project yet.</p>
              ) : (
                projectFiles.map((file) => (
                  <div
                    key={file._id}
                    className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-[#5E9F71] shrink-0" />
                      <div className="min-w-0">
                        <a
                          href={`http://localhost:5000${file.filePath}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-slate-900 hover:text-[#5E9F71] transition truncate block"
                        >
                          {file.originalName}
                        </a>
                        <p className="text-[10px] text-slate-500">
                          {file.fileSizeMB} MB • Uploaded {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {getUserRole(activeProjectForFiles) !== 'VIEWER' && (
                      <button
                        onClick={() => handleDeleteFile(file._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
                        title="Delete file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── COLLABORATORS MODAL ─── */}
      {activeProjectForMembers && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setActiveProjectForMembers(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Project Members: <span className="text-[#5E9F71]">{activeProjectForMembers.name}</span>
            </h2>
            <p className="text-xs text-slate-500 mb-6">Manage teammates and grant roles.</p>

            {/* Invite Form */}
            {(getUserRole(activeProjectForMembers) === 'OWNER' || getUserRole(activeProjectForMembers) === 'ADMIN') && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#5E9F71]" />
                  Invite Collaborator
                </h3>
                
                {inviteError && (
                  <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <p>{inviteError}</p>
                  </div>
                )}
                {inviteSuccess && (
                  <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
                    <p>{inviteSuccess}</p>
                  </div>
                )}

                <form onSubmit={handleInviteUser} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    required
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#5E9F71]"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="CONTRIBUTOR">Contributor</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="bg-[#5E9F71] hover:bg-[#4d855c] text-white font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isInviting ? 'Sending...' : 'Send Invite'}
                  </button>
                </form>
              </div>
            )}

            {/* Members List */}
            <div className="flex-1 overflow-y-auto">
              <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Active Members</h3>
              {membersLoading ? (
                <p className="text-center py-4 text-slate-400 text-xs">Loading members...</p>
              ) : (
                <div className="space-y-2 mb-6">
                  {projectMembers.map((member) => (
                    <div key={member.user._id} className="bg-slate-50 p-3 rounded-xl flex items-center justify-between border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5E9F71] to-[#c8f542] flex items-center justify-center text-slate-900 font-bold text-xs">
                          {member.user.firstName?.charAt(0)}{member.user.lastName?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {member.user.firstName} {member.user.lastName}
                          </p>
                          <p className="text-[10px] text-slate-400">{member.user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-white font-bold text-slate-700">
                          {member.role}
                        </span>
                        
                        {(getUserRole(activeProjectForMembers) === 'OWNER' || getUserRole(activeProjectForMembers) === 'ADMIN') && member.role !== 'OWNER' && (
                          <button
                            onClick={() => handleRemoveMember(member.user._id)}
                            className="text-slate-400 hover:text-rose-500 transition p-1 cursor-pointer"
                            title="Remove member"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {projectInvitations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-700 mb-2">Pending Invitations ({projectInvitations.length})</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {projectInvitations.map((inv) => (
                      <div key={inv._id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100">
                        <div>
                          <p className="font-semibold text-slate-800">{inv.email}</p>
                          <p className="text-[10px] text-slate-400">Role: {inv.role}</p>
                        </div>
                        {(getUserRole(activeProjectForMembers) === 'OWNER' || getUserRole(activeProjectForMembers) === 'ADMIN') && (
                          <button
                            onClick={() => handleRevokeInvite(inv._id)}
                            className="text-xs text-rose-500 hover:text-rose-700 font-semibold cursor-pointer px-2 py-1 rounded hover:bg-rose-50"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── CODE INTEGRATION & GIT GUIDE MODAL ─── */}
      {showGitModal && selectedProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowGitModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#c8f542] flex items-center justify-center">
                <GitPullRequest className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Code Collaboration & Git Guide</h2>
                <p className="text-xs text-slate-500">How you and your team integrate code with this project</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Target Repository</p>
                <p className="font-bold text-slate-800 break-all">{selectedProject.githubRepoUrl || 'No repository URL configured'}</p>
              </div>
              {selectedProject.githubRepoUrl && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(selectedProject.githubRepoUrl, 'repo-url')}
                  className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ml-2 cursor-pointer shrink-0"
                >
                  {copiedCommand === 'repo-url' ? <Check className="w-3.5 h-3.5 text-[#5E9F71]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCommand === 'repo-url' ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            <div className="space-y-4 mt-5">
              <div>
                <p className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                  Clone codebase to local machine:
                </p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs flex items-center justify-between">
                  <span className="text-[#c8f542] break-all">{`git clone ${selectedProject.githubRepoUrl || 'https://github.com/org/repo.git'}`}</span>
                  <button
                    onClick={() => copyToClipboard(`git clone ${selectedProject.githubRepoUrl || 'https://github.com/org/repo.git'}`, 'clone-cmd')}
                    className="p-1.5 text-slate-400 hover:text-white transition ml-2 shrink-0 cursor-pointer"
                  >
                    {copiedCommand === 'clone-cmd' ? <Check className="w-3.5 h-3.5 text-[#c8f542]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                  Create a feature branch for your assigned sprint task:
                </p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs flex items-center justify-between">
                  <span className="text-[#c8f542]">git checkout -b feature/task-name</span>
                  <button
                    onClick={() => copyToClipboard('git checkout -b feature/task-name', 'branch-cmd')}
                    className="p-1.5 text-slate-400 hover:text-white transition ml-2 shrink-0 cursor-pointer"
                  >
                    {copiedCommand === 'branch-cmd' ? <Check className="w-3.5 h-3.5 text-[#c8f542]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">3</span>
                  Write code, stage, and commit changes:
                </p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs flex items-center justify-between">
                  <span className="text-[#c8f542]">git add . && git commit -m "feat: implement sprint task"</span>
                  <button
                    onClick={() => copyToClipboard('git add . && git commit -m "feat: implement sprint task"', 'commit-cmd')}
                    className="p-1.5 text-slate-400 hover:text-white transition ml-2 shrink-0 cursor-pointer"
                  >
                    {copiedCommand === 'commit-cmd' ? <Check className="w-3.5 h-3.5 text-[#c8f542]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">4</span>
                  Push to GitHub remote & open Pull Request:
                </p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs flex items-center justify-between">
                  <span className="text-[#c8f542]">git push origin feature/task-name</span>
                  <button
                    onClick={() => copyToClipboard('git push origin feature/task-name', 'push-cmd')}
                    className="p-1.5 text-slate-400 hover:text-white transition ml-2 shrink-0 cursor-pointer"
                  >
                    {copiedCommand === 'push-cmd' ? <Check className="w-3.5 h-3.5 text-[#c8f542]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGitModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT PROJECT & GITHUB SETTINGS MODAL ─── */}
      {showEditProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowEditProjectModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-slate-900 mb-1">Project & GitHub Settings</h2>
            <p className="text-xs text-slate-500 mb-6">
              Connect or update the repository URL so team collaborators can push and sync code.
            </p>

            <form onSubmit={handleUpdateProjectSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#5E9F71]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editProjectDescription}
                  onChange={(e) => setEditProjectDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#5E9F71]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>GitHub Repository URL</span>
                  <span className="text-[10px] text-[#5E9F71] font-semibold">Public or Private</span>
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/organization/repo-name"
                  value={editProjectGithub}
                  onChange={(e) => setEditProjectGithub(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#5E9F71]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Team members will be able to clone and push code directly to this repository.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditProjectModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProject}
                  className="flex-1 bg-[#5E9F71] hover:bg-[#4d855c] text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingProject ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Sub-component: Task Card with Photo Thumbnail & Status Mover ───
interface TaskCardProps {
  task: any;
  canEdit: boolean;
  onUpdateStatus: (taskId: string, status: string) => void;
  onTriggerUpload: (taskId: string) => void;
  onViewPhoto: (url: string, title: string, uploader?: string) => void;
  onDelete: (taskId: string) => void;
  uploadingPhotoId: string | null;
  getFullPhotoUrl: (url?: string) => string;
  getPriorityBadge: (p: string) => string;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  canEdit,
  onUpdateStatus,
  onTriggerUpload,
  onViewPhoto,
  onDelete,
  uploadingPhotoId,
  getFullPhotoUrl,
  getPriorityBadge,
}) => {
  const isDone = task.status === 'DONE';
  const hasPhoto = !!task.photoUrl;
  const isUploadingThis = uploadingPhotoId === task._id;

  return (
    <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl p-3.5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between group">
      <div>
        {/* Priority & Story Points Header */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityBadge(task.priority)}`}>
            {task.priority}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
            {task.storyPoints} pts
          </span>
        </div>

        {/* Task Title */}
        <h4 className={`text-xs font-bold leading-snug ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
          {task.title}
        </h4>

        {/* Description */}
        {task.description && (
          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* PHOTO / SCREENSHOT DISPLAY */}
        {hasPhoto && (
          <div className="mt-2.5 relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group/photo">
            <img
              src={getFullPhotoUrl(task.photoUrl)}
              alt={task.photoName || 'attachment'}
              onClick={() => onViewPhoto(getFullPhotoUrl(task.photoUrl), task.title, task.createdBy?.name)}
              className="w-full h-28 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
            />
            <div
              onClick={() => onViewPhoto(getFullPhotoUrl(task.photoUrl), task.title, task.createdBy?.name)}
              className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-[11px] font-bold cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" />
              <span>View Photo</span>
            </div>
          </div>
        )}

        {/* Uploading Spinner */}
        {isUploadingThis && (
          <div className="mt-2 p-2 bg-emerald-50 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-emerald-800">
            <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Uploading photo...</span>
          </div>
        )}
      </div>

      {/* Card Footer: Assignee & Action Buttons */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px]">
          {/* Assignee Avatar / Name */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold shrink-0">
              {task.assignedTo?.name ? task.assignedTo.name.charAt(0) : '?'}
            </div>
            <span className="text-slate-600 truncate max-w-[110px]">
              {task.assignedTo?.name || 'Unassigned'}
            </span>
          </div>

          {/* Quick Photo Upload Button */}
          {canEdit && (
            <button
              onClick={() => onTriggerUpload(task._id)}
              className="text-slate-400 hover:text-[#5E9F71] transition p-1 rounded hover:bg-slate-50 cursor-pointer flex items-center gap-1 text-[10px] font-semibold"
              title="Attach photo/screenshot"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{hasPhoto ? 'Change' : 'Add Photo'}</span>
            </button>
          )}
        </div>

        {/* Status Mover Quick Actions */}
        {canEdit && (
          <div className="flex items-center justify-between gap-1 pt-1">
            <div className="flex items-center gap-1">
              {task.status !== 'TODO' && (
                <button
                  onClick={() => onUpdateStatus(task._id, 'TODO')}
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  title="Move to To Do"
                >
                  To Do
                </button>
              )}
              {task.status !== 'IN_PROGRESS' && (
                <button
                  onClick={() => onUpdateStatus(task._id, 'IN_PROGRESS')}
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 hover:bg-blue-200 text-blue-800 cursor-pointer"
                  title="Move to In Progress"
                >
                  Start
                </button>
              )}
              {task.status !== 'IN_REVIEW' && (
                <button
                  onClick={() => onUpdateStatus(task._id, 'IN_REVIEW')}
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 cursor-pointer"
                  title="Move to Review"
                >
                  Review
                </button>
              )}
              {task.status !== 'DONE' && (
                <button
                  onClick={() => onUpdateStatus(task._id, 'DONE')}
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#c8f542] hover:bg-[#b5e036] text-[#2c3d0c] cursor-pointer flex items-center gap-0.5"
                  title="Mark as Done"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Done
                </button>
              )}
            </div>

            <button
              onClick={() => onDelete(task._id)}
              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition p-1 cursor-pointer"
              title="Delete Task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
