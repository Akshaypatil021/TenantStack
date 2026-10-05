import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, Activity as ActivityIcon, User, PlusCircle, UserPlus, RefreshCw } from 'lucide-react';

export const Activity = () => {
  const { token } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/v1/activity', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setActivities(data.activities);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'PROJECT_CREATED':
        return <PlusCircle className="w-5 h-5 text-emerald-500" />;
      case 'USER_INVITED':
        return <UserPlus className="w-5 h-5 text-purple-500" />;
      case 'REPO_SYNCED':
        return <RefreshCw className="w-5 h-5 text-blue-500" />;
      default:
        return <ActivityIcon className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Activity Log</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor recent events and actions across your workspace</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12">
            <ActivityIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No recent activity found.</p>
          </div>
        ) : (
          <div className="relative border-l border-slate-200 ml-4 space-y-8 pb-4">
            {activities.map((activity, idx) => (
              <div key={activity._id || idx} className="relative pl-6">
                {/* Timeline Dot */}
                <span className="absolute -left-3.5 top-1 bg-white p-1 rounded-full border border-slate-200 shadow-sm">
                  {getActionIcon(activity.action)}
                </span>
                
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-600 shadow-sm">
                      {activity.action.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(activity.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-800 font-medium">{activity.details}</p>
                  
                  {activity.userId && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 border-t border-slate-200/60 pt-3">
                      <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                        <User className="w-3 h-3" />
                      </div>
                      <span>
                        Performed by <span className="font-semibold text-slate-700">{activity.userId.firstName} {activity.userId.lastName}</span>
                      </span>
                    </div>
                  )}
                  {!activity.userId && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 border-t border-slate-200/60 pt-3">
                      <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[#c8f542]">
                        <RefreshCw className="w-3 h-3" />
                      </div>
                      <span>Performed by <span className="font-semibold text-slate-900">System (Auto)</span></span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
