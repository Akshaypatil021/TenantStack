import { HardDrive, Upload } from 'lucide-react';

export const Storage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Storage Services</h1>
          <p className="text-sm text-slate-500 mt-1">Manage objects, buckets, and file storage</p>
        </div>
        <button className="bg-slate-900 hover:bg-slate-800 text-[#c8f542] font-semibold text-sm px-4 py-2.5 rounded-xl transition shadow-lg shadow-slate-900/10 flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload Files
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <HardDrive className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Storage Buckets</h2>
        </div>
        
        <p className="text-sm text-slate-500 text-center py-8">
          Storage management dashboard is coming soon. You will be able to manage your files and buckets here.
        </p>
      </div>
    </div>
  );
};
