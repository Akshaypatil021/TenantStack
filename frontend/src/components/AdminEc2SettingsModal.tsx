import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Server,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminEc2SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const API_BASE = 'http://localhost:5000/api/v1';

export const AdminEc2SettingsModal: React.FC<AdminEc2SettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const { token } = useAuth();
  const [label, setLabel] = useState('Primary AWS EC2 Host Node');
  const [hostIp, setHostIp] = useState('13.233.94.120');
  const [sshUsername, setSshUsername] = useState('ubuntu');
  const [sshKey, setSshKey] = useState('');
  const [region, setRegion] = useState('ap-south-1');
  const [basePort, setBasePort] = useState(3001);
  const [totalApps, setTotalApps] = useState(0);
  const [hasSshKey, setHasSshKey] = useState(false);

  const [_isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch host configuration
  useEffect(() => {
    if (!isOpen || !token) return;
    const fetchHost = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/compute/admin/ec2-host`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const h = data.host;
          if (h) {
            setLabel(h.label || 'Primary AWS EC2 Host Node');
            setHostIp(h.hostIp || '13.233.94.120');
            setSshUsername(h.sshUsername || 'ubuntu');
            setRegion(h.region || 'ap-south-1');
            setBasePort(h.basePort || 3001);
            setTotalApps(h.totalAppsHosted || 0);
            setHasSshKey(h.hasSshKey || false);
          }
        }
      } catch (err) {
        console.error('Error fetching EC2 host:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHost();
  }, [isOpen, token]);

  // Test EC2 Connection
  const handleTestConnection = async () => {
    if (!token) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/compute/admin/ec2-host/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({
          success: true,
          message: data.message,
          latencyMs: data.latencyMs,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to connect to EC2 host.',
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Network error communicating with EC2 test endpoint.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save Settings
  const handleSave = async () => {
    if (!token) return;
    if (!hostIp.trim()) {
      setError('EC2 Host IP address is required.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_BASE}/compute/admin/ec2-host`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label: label.trim(),
          hostIp: hostIp.trim(),
          sshUsername: sshUsername.trim(),
          sshKey: sshKey.trim() || undefined,
          region: region.trim(),
          basePort: Number(basePort),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save EC2 host configuration.');
      } else {
        setSuccessMsg('Master AWS EC2 Host configuration updated successfully!');
        if (sshKey.trim()) setHasSshKey(true);
        setSshKey('');
        onSaved?.();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch {
      setError('Network error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-[#c8f542] shadow-sm">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Master AWS EC2 Host Configuration</h2>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-900 text-[#c8f542]">
                    Super Admin
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Single EC2 Server where all multi-tenant GitHub applications are deployed
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Status Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                    Master Host Active
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">Region: {region}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-bold text-[#c8f542]">{hostIp}</span>
                <span className="text-xs text-slate-400">({sshUsername}@{hostIp})</span>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300">
                <div>
                  <span className="text-slate-400">Tenant Apps Hosted:</span>{' '}
                  <span className="font-bold text-white">{totalApps}</span>
                </div>
                <div>
                  <span className="text-slate-400">Port Range:</span>{' '}
                  <span className="font-mono text-white">:{basePort}+</span>
                </div>
                <div className="ml-auto">
                  <span className="text-slate-400">SSH Key:</span>{' '}
                  <span className={hasSshKey ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                    {hasSshKey ? 'Configured ✓' : 'Default / Password'}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Host IP & Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                    AWS EC2 Public IPv4 Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={hostIp}
                    onChange={(e) => setHostIp(e.target.value)}
                    placeholder="e.g., 13.233.94.120"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Host Node Label</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Primary AWS EC2 Host"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* SSH Username & AWS Region */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1.5 block">SSH Username</label>
                  <input
                    type="text"
                    value={sshUsername}
                    onChange={(e) => setSshUsername(e.target.value)}
                    placeholder="ubuntu"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Usually 'ubuntu' for Ubuntu AMI</span>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1.5 block">AWS Region</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                  >
                    <option value="ap-south-1">ap-south-1 (Mumbai, India)</option>
                    <option value="us-east-1">us-east-1 (N. Virginia, USA)</option>
                    <option value="eu-west-1">eu-west-1 (Ireland, Europe)</option>
                    <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                  </select>
                </div>
              </div>

              {/* Base Port */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                  Base Application Port
                </label>
                <input
                  type="number"
                  value={basePort}
                  onChange={(e) => setBasePort(Number(e.target.value))}
                  placeholder="3001"
                  min={1024}
                  max={65000}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Each new tenant application deployed from GitHub automatically increments from this port (3001, 3002...)
                </span>
              </div>

              {/* SSH Private Key */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>SSH Private Key (.pem file content)</span>
                  <span className="text-xs font-normal text-slate-400">
                    {hasSshKey ? 'Key currently configured ✓' : 'Optional / Password'}
                  </span>
                </label>
                <textarea
                  value={sshKey}
                  onChange={(e) => setSshKey(e.target.value)}
                  placeholder={
                    hasSshKey
                      ? '•••••••••••••••••••••••••••••••• (Leave blank to keep existing key)'
                      : '-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----'
                  }
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Encrypted and securely stored on backend. Never visible to tenant users.
                </span>
              </div>
            </div>

            {/* Test Connection Button & Result */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Testing EC2 Host Connection...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" /> Test EC2 Connection & Ping
                  </>
                )}
              </button>

              {testResult && (
                <div
                  className={`mt-3 p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <div>
                    <div>{testResult.message}</div>
                    {testResult.latencyMs && (
                      <div className="text-[10px] text-emerald-600 font-mono mt-0.5">
                        Roundtrip latency: {testResult.latencyMs}ms
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Error / Success Banners */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {successMsg}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-100 sticky bottom-0 bg-white">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-[#c8f542] font-semibold text-sm px-6 py-2.5 rounded-xl transition shadow-lg shadow-slate-900/20"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Configuration...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" /> Save EC2 Host Node
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
