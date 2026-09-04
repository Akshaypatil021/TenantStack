import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  FolderKanban, 
  AlertTriangle, 
  Calendar, 
  X, 
  Paperclip, 
  Upload, 
  Trash2, 
  HardDrive, 
  FileText 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Projects = () => {
  const { token } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLimitError, setIsLimitError] = useState(false);

  // File Management State
  const [activeProjectForFiles, setActiveProjectForFiles] = useState<any>(null);
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [storageUsage, setStorageUsage] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isFileLimitError, setIsFileLimitError] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchStorageUsage();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setProjects(data.projects || []);
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
      if (res.ok) {
        setStorageUsage(data);
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
        body: JSON.stringify({ name, description }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.error?.includes('Subscription plan limit reached')) {
          setIsLimitError(true);
        }
        throw new Error(data.error || 'Failed to create project');
      }

      setProjects([data.project, ...projects]);
      setShowCreateModal(false);
      setName('');
      setDescription('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openFileModal = async (project: any) => {
    setActiveProjectForFiles(project);
    setFileError(null);
    setIsFileLimitError(false);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/files/projects/${project._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setProjectFiles(data.files || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFile = e.target.files[0];
    setUploading(true);
    setFileError(null);
    setIsFileLimitError(false);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`http://localhost:5000/api/v1/files/projects/${activeProjectForFiles._id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
      setUploading(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Projects</h1>
          <p className="text-sm text-slate-400 mt-1">Manage, organize, and store files for your tenant projects</p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setIsLimitError(false);
            setShowCreateModal(true);
          }}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition shadow-lg shadow-purple-600/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Project
        </button>
      </div>

      {/* Storage Quota Meter Banner */}
      {storageUsage && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Tenant Isolated Storage</h4>
              <p className="text-xs text-slate-400">
                Plan Limit ({storageUsage.plan}): {storageUsage.usedMB} MB / {storageUsage.maxStorageMB} MB used
              </p>
            </div>
          </div>

          <div className="w-full md:w-48">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  storageUsage.percentUsed >= 90 ? 'bg-rose-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${storageUsage.percentUsed}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 text-right mt-1 font-mono">
              {storageUsage.percentUsed}% storage full
            </p>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto">
          <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white">No projects found</h3>
          <p className="text-slate-400 text-xs mt-1 mb-6">Start by creating your first project for this tenant.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project._id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-6 rounded-2xl transition duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold rounded-full uppercase">
                    {project.status || 'TODO'}
                  </span>
                  <div className="flex items-center gap-1 text-slate-500 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white tracking-wide">{project.name}</h3>
                <p className="text-slate-400 text-xs mt-2 line-clamp-2">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => openFileModal(project)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-purple-300 font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  Files & Attachments
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Create New Project</h2>
            <p className="text-xs text-slate-400 mb-6">All projects are isolated to your organization.</p>

            {error && (
              <div
                className={`mb-6 p-4 rounded-xl text-xs ${
                  isLimitError
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{error}</p>
                    {isLimitError && (
                      <Link
                        to="/billing"
                        onClick={() => setShowCreateModal(false)}
                        className="inline-block mt-2 bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded hover:bg-amber-400 transition"
                      >
                        Upgrade Plan Now 🚀
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  placeholder="Website Redesign"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  placeholder="Project goals and details..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-lg shadow-purple-600/20"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Manager Modal */}
      {activeProjectForFiles && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setActiveProjectForFiles(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">
              Project Attachments: <span className="text-purple-400">{activeProjectForFiles.name}</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">Files are stored securely under isolated tenant directories.</p>

            {fileError && (
              <div
                className={`mb-4 p-4 rounded-xl text-xs ${
                  isFileLimitError
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{fileError}</p>
                    {isFileLimitError && (
                      <Link
                        to="/billing"
                        onClick={() => setActiveProjectForFiles(null)}
                        className="inline-block mt-2 bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded hover:bg-amber-400 transition"
                      >
                        Upgrade Storage Plan 🚀
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* File Upload Dropzone */}
            <div className="bg-slate-800/50 border-2 border-dashed border-slate-700 hover:border-purple-500/50 rounded-xl p-6 text-center mb-6 transition">
              <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-white">
                {uploading ? 'Uploading file...' : 'Upload document or file'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 mb-3">Enforced against tenant storage quota</p>
              <label className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer transition inline-block">
                Choose File
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {projectFiles.length === 0 ? (
                <p className="text-center py-6 text-slate-500 text-xs">No files uploaded to this project yet.</p>
              ) : (
                projectFiles.map((file) => (
                  <div
                    key={file._id}
                    className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-purple-400 shrink-0" />
                      <div className="min-w-0">
                        <a
                          href={`http://localhost:5000${file.filePath}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-white hover:text-purple-300 transition truncate block"
                        >
                          {file.originalName}
                        </a>
                        <p className="text-[10px] text-slate-400">
                          {file.fileSizeMB} MB • Uploaded {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteFile(file._id)}
                      className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
