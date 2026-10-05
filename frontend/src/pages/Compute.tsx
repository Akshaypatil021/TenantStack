import { Server, Zap } from 'lucide-react';

export const Compute = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Compute Services</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and provision virtual machines and containers</p>
        </div>
        <button className="bg-slate-900 hover:bg-slate-800 text-[#c8f542] font-semibold text-sm px-4 py-2.5 rounded-xl transition shadow-lg shadow-slate-900/10 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Deploy Instance
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <Server className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Compute Resources</h2>
        </div>
        
        <p className="text-sm text-slate-500 text-center py-8">
          Compute management dashboard is coming soon. You will be able to see all your active instances here.
        </p>
      </div>
    </div>
  );
};
