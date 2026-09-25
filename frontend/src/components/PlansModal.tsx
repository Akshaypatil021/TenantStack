import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Server, HardDrive, Check, Sparkles, ArrowRight, 
  ShieldCheck, CheckCircle2, Clock, AlertCircle, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type PlanCategory = 'compute' | 'storage';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: PlanCategory;
  onSelectPlan?: (planName: string, category: PlanCategory) => void;
}

// Exact price counter animation from LandingPage.tsx
const AnimatedPrice = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (displayValue === value) return;
    const step = value > displayValue ? 1 : -1;
    const timer = setInterval(() => {
      setDisplayValue((prev) => {
        if (prev === value) {
          clearInterval(timer);
          return prev;
        }
        const diff = Math.abs(value - prev);
        const inc = diff > 8 ? Math.ceil(diff / 4) * step : step * Math.min(diff, 3);
        const next = prev + inc;
        if ((step > 0 && next >= value) || (step < 0 && next <= value)) {
          clearInterval(timer);
          return value;
        }
        return next;
      });
    }, 12);
    return () => clearInterval(timer);
  }, [value, displayValue]);

  return <span>${displayValue}</span>;
};

// Helper to load Razorpay Checkout script dynamically
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const PlansModal: React.FC<PlansModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'compute',
  onSelectPlan,
}) => {
  const { token, user, tenant, login } = useAuth();
  const [category, setCategory] = useState<PlanCategory>(initialCategory);
  const [isYearly, setIsYearly] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('Dev Pro');
  const [provisioningPlan, setProvisioningPlan] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const PLAN_TIERS: Record<PlanCategory, Record<string, number>> = {
    compute: {
      'Sandbox / Testing': 1,
      'Dev Pro': 2,
      'Compute Node': 3,
    },
    storage: {
      'Free Tier': 1,
      'Solo Dev': 2,
      'Pro Dev': 3,
    },
  };

  const activeComputePlan = tenant?.computePlan || tenant?.allocatedResources?.computePlan;
  const activeStoragePlan = tenant?.storagePlan || tenant?.allocatedResources?.storagePlan;

  const currentCategoryActivePlan = category === 'compute' ? activeComputePlan : activeStoragePlan;
  const currentCategoryExpiresAt = category === 'compute'
    ? tenant?.allocatedResources?.computeExpiresAt
    : tenant?.allocatedResources?.storageExpiresAt;

  const isCurrentCategorySubActive = !!currentCategoryActivePlan && (
    !currentCategoryExpiresAt || new Date(currentCategoryExpiresAt) > new Date()
  );

  useEffect(() => {
    setCategory(initialCategory);
    if (initialCategory === 'compute') {
      setSelectedPlan('Dev Pro');
    } else {
      setSelectedPlan('Solo Dev');
    }
  }, [initialCategory]);

  if (!isOpen) return null;

  // ─── Exact Compute Plans from LandingPage.tsx ───
  const computePlans = [
    {
      name: 'Sandbox / Testing',
      isTrial: false,
      priceMonthly: 5,
      priceYearly: 42,
      originalYearly: 60,
      badge: 'Best for Testing',
      description: 'Shared vCPU ideal for development, testing, and small personal projects.',
      usersMonthly: 1,
      usersYearly: 1,
      unitName: 'vCPU Core',
      features: [
        '1 GB Memory (RAM)',
        '25 GB NVMe Storage',
        'Shared CPU Architecture',
        'Community Support',
      ],
      buttonText: 'Deploy Sandbox',
      popular: false,
    },
    {
      name: 'Dev Pro',
      isTrial: false,
      priceMonthly: 15,
      priceYearly: 126,
      originalYearly: 180,
      discountBadge: '30% OFF',
      description: 'Balanced performance for production apps and staging environments.',
      usersMonthly: 2,
      usersYearly: 2,
      unitName: 'vCPU Cores',
      features: ['4 GB Memory (RAM)', '80 GB NVMe Storage', 'Dedicated CPU Architecture'],
      yearlyExtraFeatures: [
        'Free Automated Daily Backups',
        'Priority Support Access',
      ],
      popular: true,
      buttonText: 'Deploy Node',
    },
    {
      name: 'Compute Node',
      isTrial: false,
      priceMonthly: 40,
      priceYearly: 336,
      originalYearly: 480,
      discountBadge: '30% OFF',
      description: 'High performance dedicated CPUs for intensive workloads and CI/CD.',
      usersMonthly: 4,
      usersYearly: 4,
      unitName: 'vCPU Cores',
      features: ['8 GB Memory (RAM)', '160 GB NVMe Storage', 'High-Frequency CPU'],
      yearlyExtraFeatures: [
        'Free Automated Daily Backups',
        'Priority Support Access',
        'Advanced Network Telemetry',
      ],
      buttonText: 'Deploy Node',
      popular: false,
    },
  ];

  // ─── Exact Storage & Workspace Plans from LandingPage.tsx ───
  const storagePlans = [
    {
      name: 'Free Tier',
      isTrial: true,
      priceMonthly: 0,
      priceYearly: 0,
      badge: 'Free Forever',
      description: 'Ideal for personal learning, experiments, and small side projects.',
      usersMonthly: 1,
      usersYearly: 1,
      unitName: 'Team User',
      features: [
        '3 Active Projects',
        '1 GB NVMe Storage',
        '1,000 API Requests/day',
        'Community Support',
      ],
      buttonText: 'Get Started Free',
      popular: false,
    },
    {
      name: 'Solo Dev',
      isTrial: false,
      priceMonthly: 5,
      priceYearly: 49,
      originalYearly: 60,
      discountBadge: '18% OFF',
      description: 'Built for individual developers and indie hackers launching apps.',
      usersMonthly: 3,
      usersYearly: 5,
      unitName: 'Team Users',
      features: ['15 Active Projects', '15 GB NVMe Storage', '25,000 API Requests/day'],
      yearlyExtraFeatures: [
        '+5 GB Extra Storage Bonus',
        'Automated Daily Backups',
      ],
      popular: true,
      buttonText: 'Select Solo Dev',
    },
    {
      name: 'Pro Dev',
      isTrial: false,
      priceMonthly: 15,
      priceYearly: 149,
      originalYearly: 180,
      discountBadge: '17% OFF',
      description: 'For power developers and freelancers building client solutions.',
      usersMonthly: 10,
      usersYearly: 15,
      unitName: 'Team Users',
      features: ['Unlimited Active Projects', '50 GB NVMe Storage', '100,000 API Requests/day'],
      yearlyExtraFeatures: [
        '+15 GB Extra Storage Bonus',
        'Automated Daily Backups',
        'Priority Email & Chat Support',
      ],
      buttonText: 'Select Pro Dev',
      popular: false,
    },
  ];

  const currentPlans = category === 'compute' ? computePlans : storagePlans;

  const handleAction = async (planName: string) => {
    setProvisioningPlan(planName);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!token) {
        throw new Error('Please sign in to allocate or upgrade workspace resources.');
      }

      // 1. Create payment order on backend
      const orderRes = await fetch('http://localhost:5000/api/v1/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planName,
          category,
          isYearly,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to initialize payment order');
      }

      // 2. If free tier ($0), allocate directly without payment gateway
      if (orderData.isFree) {
        const verifyRes = await fetch('http://localhost:5000/api/v1/payments/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            planName,
            category,
            isYearly,
            isFree: true,
          }),
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyData.error || 'Failed to activate Free Tier');
        }

        login(verifyData.token, verifyData.user, verifyData.tenant);
        setProvisioningPlan(null);
        setSuccessMessage(`Free Tier activated successfully! 1 GB storage & community support ready.`);
        if (onSelectPlan) {
          onSelectPlan(planName, category);
        }
        setTimeout(() => {
          setSuccessMessage(null);
          onClose();
        }, 1800);
        return;
      }

      // 3. Paid plan: load Razorpay checkout SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay Checkout SDK failed to load. Please check your network connection.');
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'TenantStack Cloud',
        description: `${planName} (${isYearly ? '1-Year Reserved' : 'Monthly'}) - Test Payment`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            setProvisioningPlan(planName);
            const verifyRes = await fetch('http://localhost:5000/api/v1/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planName,
                category,
                isYearly,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Payment signature verification failed.');
            }

            // Sync user, token and tenant in AuthContext
            login(verifyData.token, verifyData.user, verifyData.tenant);

            setProvisioningPlan(null);
            setSuccessMessage(`Payment verified! "${planName}" resources allocated to your workspace.`);
            if (onSelectPlan) {
              onSelectPlan(planName, category);
            }
            setTimeout(() => {
              setSuccessMessage(null);
              onClose();
            }, 1800);
          } catch (err: any) {
            setProvisioningPlan(null);
            setErrorMessage(err.message || 'Payment verification failed.');
          }
        },
        prefill: {
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          email: user?.email || '',
          contact: '9999999999',
        },
        notes: {
          planName,
          category,
          isYearly: isYearly ? 'yes' : 'no',
        },
        theme: {
          color: '#18181b',
        },
        modal: {
          ondismiss: function () {
            setProvisioningPlan(null);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setProvisioningPlan(null);
        setErrorMessage(resp.error?.description || 'Payment was cancelled or rejected.');
      });
      rzp.open();
    } catch (err: any) {
      setProvisioningPlan(null);
      setErrorMessage(err.message || 'Something went wrong during checkout.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="min-h-full flex items-center justify-center p-3 sm:p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative bg-white border border-slate-200/90 rounded-[2rem] shadow-2xl w-full max-w-6xl overflow-hidden z-10 my-6"
        >
          {/* Header Accent Line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#c8f542] via-[#5E9F71] to-emerald-400" />
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-20 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="px-6 sm:px-12 pt-8 pb-6 border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c8f542]/20 text-slate-900 text-xs font-bold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#5E9F71]" />
                  <span>Choose Your Plan</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {category === 'compute' ? 'Select your Compute Node' : 'Transparent, Developer-Friendly Pricing'}
                </h2>
                <p className="text-sm text-slate-500 mt-1 max-w-xl">
                  {category === 'compute'
                    ? 'Pay-as-you-go billing with a predictable monthly cap. Dedicated CPUs and scalable NVMe instances.'
                    : 'Scale storage and compute seamlessly with predictable tiers designed for developers and growing teams.'
                  }
                </p>
              </div>

              {/* Compute vs Storage Switcher */}
              <div className="inline-flex p-1.5 bg-slate-100 rounded-2xl shrink-0 self-start md:self-auto border border-slate-200/60 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setCategory('compute');
                    setSelectedPlan('Dev Pro');
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    category === 'compute'
                      ? 'bg-slate-900 text-[#c8f542] shadow-md shadow-slate-900/10'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Server className="w-4 h-4" />
                  <span>Compute Nodes</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategory('storage');
                    setSelectedPlan('Solo Dev');
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    category === 'storage'
                      ? 'bg-slate-900 text-[#c8f542] shadow-md shadow-slate-900/10'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <HardDrive className="w-4 h-4" />
                  <span>Storage & Plans</span>
                </button>
              </div>
            </div>

            {/* ─── Exact Slider Toggle from LandingPage.tsx ─── */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <span className={`text-sm font-bold transition-colors ${!isYearly ? 'text-slate-900' : 'text-slate-400'}`}>
                {category === 'compute' ? 'On-Demand (Monthly)' : 'Monthly'}
              </span>
              <button 
                type="button"
                onClick={() => setIsYearly(!isYearly)}
                className="w-12 h-6 bg-[#5E9F71]/20 rounded-full relative p-1 transition-colors outline-none cursor-pointer"
                aria-label="Toggle Monthly/Yearly"
              >
                <div 
                  className={`w-4 h-4 bg-[#5E9F71] rounded-full shadow-sm transition-transform duration-300 ${
                    isYearly ? 'translate-x-6' : 'translate-x-0'
                  }`} 
                />
              </button>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold transition-colors ${isYearly ? 'text-slate-900' : 'text-slate-400'}`}>
                  {category === 'compute' ? '1-Year Reserved' : 'Yearly'}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold tracking-wide rounded-full">
                  {category === 'compute' ? 'Save up to 30%' : 'Extra Perks + Save up to 25%'}
                </span>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="mx-6 sm:mx-12 mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-sm font-semibold">{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mx-6 sm:mx-12 mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span className="text-sm font-semibold">{errorMessage}</span>
              </div>
              <button 
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-600 hover:text-rose-900 cursor-pointer p-1"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Modal Body: Exact Cards from LandingPage.tsx */}
          <div className="p-6 sm:p-12 max-h-[62vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {currentPlans.map((plan, idx) => {
                const isDark = selectedPlan === plan.name;

                const currentTierRank = isCurrentCategorySubActive
                  ? (PLAN_TIERS[category]?.[currentCategoryActivePlan] || 0)
                  : 0;
                const planTierRank = PLAN_TIERS[category]?.[plan.name] || 0;

                const isCurrentPlan = isCurrentCategorySubActive && plan.name === currentCategoryActivePlan;
                const isDowngrade = isCurrentCategorySubActive && planTierRank < currentTierRank;
                const isUpgrade = isCurrentCategorySubActive && planTierRank > currentTierRank;

                return (
                  <div key={idx} className="h-full">
                    <div
                      onClick={() => !isDowngrade && setSelectedPlan(plan.name)}
                      className={`border rounded-[1.5rem] p-8 sm:p-10 relative flex flex-col justify-between transition-all duration-300 hover:shadow-2xl h-full ${
                        isDowngrade
                          ? 'bg-slate-50/60 border-slate-200/60 text-slate-500 opacity-80 cursor-not-allowed'
                          : isDark
                          ? 'bg-[#18181b] border-transparent text-white shadow-2xl shadow-slate-900/30 transform md:-translate-y-2 cursor-pointer'
                          : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300 hover:-translate-y-1 cursor-pointer'
                      }`}
                    >
                      <div>
                        {/* Top Plan Title & Badges */}
                        <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {plan.name}
                          </h3>
                          {isCurrentPlan && (
                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" strokeWidth={3} />
                              Active Plan
                            </span>
                          )}
                          {isDowngrade && (
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                              <Lock className="w-3 h-3 text-slate-400" />
                              Downgrade Locked
                            </span>
                          )}
                          {isUpgrade && (
                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold uppercase tracking-wider rounded-full">
                              Upgrade
                            </span>
                          )}
                          {!isCurrentPlan && !isDowngrade && plan.popular && (
                            <span className="px-3 py-1 bg-[#c8f542] text-[#2c3d0c] text-[10px] font-bold uppercase tracking-wider rounded-full">
                              Recommended
                            </span>
                          )}
                          {plan.badge && (
                            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider rounded-full">
                              {plan.badge}
                            </span>
                          )}
                        </div>

                        <p className={`text-sm mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {plan.description}
                        </p>

                        {/* Exact Animated Price Block */}
                        <div className="mt-8 mb-6">
                          <div className="flex items-baseline gap-1.5">
                            <span className={`text-5xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {plan.isTrial ? (
                                <span>$0</span>
                              ) : (
                                <AnimatedPrice value={isYearly ? plan.priceYearly : plan.priceMonthly} />
                              )}
                            </span>
                            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {plan.isTrial ? 'for 7 days only' : (isYearly ? 'per year' : 'per month')}
                            </span>
                          </div>

                          {/* Discount Badge UI (Visible on Yearly for paid plans) */}
                          <div className={`mt-3 flex items-center gap-2 h-6 transition-opacity duration-300 ${!plan.isTrial && isYearly && plan.originalYearly ? 'opacity-100' : 'opacity-0'}`}>
                            {plan.originalYearly && (
                              <>
                                <span className={`text-sm line-through font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  ${plan.originalYearly}
                                </span>
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold tracking-wide rounded-full">
                                  {plan.discountBadge}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Features List */}
                        <ul className="space-y-4">
                          {/* Dynamic Team Users / vCPU Feature with Yearly Upgrade & Blurred Previous Value */}
                          <li className={`flex items-center justify-between gap-2 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full bg-[#5E9F71] flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <div className="flex items-center gap-2">
                                {isYearly && plan.usersYearly > plan.usersMonthly ? (
                                  <>
                                    <span className="line-through text-slate-400 opacity-40 blur-[0.6px] select-none text-xs font-semibold">
                                      {plan.usersMonthly} {plan.unitName}
                                    </span>
                                    <span className={`font-bold transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                      {plan.usersYearly} {plan.unitName}
                                    </span>
                                  </>
                                ) : (
                                  <span>{plan.usersMonthly} {plan.unitName}</span>
                                )}
                              </div>
                            </div>
                            {isYearly && plan.usersYearly > plan.usersMonthly && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${
                                isDark 
                                  ? 'bg-[#c8f542]/20 text-[#c8f542] border border-[#c8f542]/30' 
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                +{plan.usersYearly - plan.usersMonthly} Extra
                              </span>
                            )}
                          </li>

                          {plan.features.map((feat, fIdx) => (
                            <li key={fIdx} className={`flex items-center gap-3 text-sm font-medium ${
                              isDark ? 'text-slate-300' : 'text-slate-600'
                            }`}>
                              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-[#5E9F71] text-white">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Yearly Extra Benefits (revealed dynamically when Yearly is active for paid plans) */}
                        {!plan.isTrial && isYearly && plan.yearlyExtraFeatures && plan.yearlyExtraFeatures.length > 0 && (
                          <div className="mt-6 pt-5 border-t border-dashed border-slate-200/80 transition-all duration-300">
                            <div className="flex items-center gap-1.5 mb-3.5">
                              <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-[#c8f542]' : 'text-[#5E9F71]'}`} />
                              <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-[#c8f542]' : 'text-[#5E9F71]'}`}>
                                Yearly Extra Benefits
                              </span>
                            </div>
                            <ul className="space-y-3">
                              {plan.yearlyExtraFeatures.map((extraFeat, eIdx) => (
                                <li 
                                  key={eIdx} 
                                  className={`flex items-center justify-between gap-2 text-sm font-medium ${
                                    isDark ? 'text-slate-200' : 'text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      isDark ? 'bg-[#c8f542] text-slate-950' : 'bg-[#5E9F71] text-white'
                                    }`}>
                                      <Check className="w-3 h-3" strokeWidth={3} />
                                    </div>
                                    <span>{extraFeat}</span>
                                  </div>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${
                                    isDark ? 'bg-[#c8f542]/20 text-[#c8f542]' : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    Bonus
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Action Button: Current Plan, Downgrade-Locked, or Upgrade/Deploy */}
                      {isCurrentPlan ? (
                        <div className="mt-10 w-full">
                          <button
                            type="button"
                            disabled={true}
                            className="w-full font-semibold py-3 px-6 rounded-full text-sm flex items-center justify-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-300 cursor-not-allowed shadow-sm"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Current Active Plan</span>
                          </button>
                        </div>
                      ) : isDowngrade ? (
                        <div className="mt-10 w-full flex flex-col gap-1.5 items-center">
                          <button
                            type="button"
                            disabled={true}
                            className="w-full font-semibold py-3 px-6 rounded-full text-sm flex items-center justify-center gap-2 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                            title={`Cannot downgrade while your ${currentCategoryActivePlan} plan is active`}
                          >
                            <Lock className="w-4 h-4 text-slate-400" />
                            <span>Downgrade Unavailable</span>
                          </button>
                          <span className="text-[11px] text-slate-400 font-medium text-center">
                            Active {currentCategoryActivePlan} until {currentCategoryExpiresAt ? new Date(currentCategoryExpiresAt).toLocaleDateString() : 'expiry'}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={provisioningPlan === plan.name}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(plan.name);
                          }}
                          className={`mt-10 w-full font-semibold py-3 px-6 rounded-full text-sm flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
                            isDark
                              ? 'bg-white hover:bg-[#c8f542] text-slate-900 hover:text-slate-950 shadow-md hover:shadow-xl border border-transparent'
                              : 'bg-[#18181b] hover:bg-[#c8f542] text-white hover:text-slate-900 shadow-md hover:shadow-lg hover:shadow-[#c8f542]/20'
                          }`}
                        >
                          {provisioningPlan === plan.name ? (
                            <>
                              <Clock className="w-4 h-4 animate-spin" />
                              <span>{isUpgrade ? 'Upgrading...' : 'Allocating...'}</span>
                            </>
                          ) : (
                            <>
                              <span>{isUpgrade ? `Upgrade to ${plan.name}` : plan.buttonText}</span>
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 sm:px-12 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#5E9F71]" />
              <span>Full resource isolation · Pause, upgrade, or destroy instances anytime.</span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-800 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
