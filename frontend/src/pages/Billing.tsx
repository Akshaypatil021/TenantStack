import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Check, Zap, Receipt } from 'lucide-react';

export const Billing = () => {
  const { token } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subRes, invRes] = await Promise.all([
        fetch('http://localhost:5000/api/v1/subscriptions/current', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5000/api/v1/subscriptions/invoices', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const subData = await subRes.json();
      const invData = await invRes.json();

      if (subRes.ok) setSubscription(subData);
      if (invRes.ok) setInvoices(invData.invoices || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpgrade = async (newPlan: 'PRO' | 'BUSINESS') => {
    setActionMessage(null);
    try {
      const res = await fetch('http://localhost:5000/api/v1/subscriptions/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPlan }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upgrade failed');

      setActionMessage(`🎉 Successfully upgraded to ${newPlan} plan!`);
      fetchData();
    } catch (err: any) {
      setActionMessage(`❌ Error: ${err.message}`);
    }
  };

  const plans = [
    {
      name: 'FREE',
      price: '$0',
      description: 'Ideal for small teams testing TenantFlow.',
      features: ['2 Team Users', '5 Active Projects', '10 MB Storage', '100 API Requests/day'],
    },
    {
      name: 'PRO',
      price: '$29',
      description: 'For growing businesses with expanding needs.',
      features: ['10 Team Users', '20 Active Projects', '50 MB Storage', '1,000 API Requests/day'],
      popular: true,
    },
    {
      name: 'BUSINESS',
      price: '$99',
      description: 'Full power for high-volume enterprise organizations.',
      features: ['15 Team Users', '100 Active Projects', '100 MB Storage', '2,000 API Requests/day'],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Billing & Subscriptions</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your plan limits, payment methods, and invoices</p>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold ${
            actionMessage.startsWith('🎉')
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          {actionMessage}
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan === plan.name;
          return (
            <div
              key={plan.name}
              className={`bg-slate-900 border rounded-2xl p-6 relative flex flex-col justify-between transition duration-200 ${
                plan.popular
                  ? 'border-purple-500/50 shadow-xl shadow-purple-500/10'
                  : 'border-slate-800'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                  Most Popular
                </span>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  {isCurrent && (
                    <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{plan.description}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-600 text-xs font-medium">/month</span>
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <Check className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full bg-slate-800 text-slate-600 font-semibold py-2.5 rounded-xl text-xs cursor-default"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.name as any)}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-lg shadow-purple-600/20 flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Upgrade to {plan.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoice Receipts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Receipt className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-bold text-white">Payment Invoices</h2>
        </div>

        {invoices.length === 0 ? (
          <p className="text-slate-600 text-xs text-center py-6">No billing invoices found yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/50 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Transaction ID</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-mono text-purple-300">{inv.transactionId}</td>
                    <td className="p-3 font-bold text-white">{inv.plan}</td>
                    <td className="p-3 text-slate-200">${inv.amount} USD</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-semibold rounded-full">
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{new Date(inv.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
