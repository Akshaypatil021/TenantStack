import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, type Variants } from "framer-motion";
import {
  Server, HardDrive, Check, Sparkles, ArrowRight,
  ShieldCheck, CheckCircle2, Clock, AlertCircle,
  ChevronRight, Layers
} from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

type PlanCategory = "compute" | "storage";

const AnimatedPrice = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (display === value) return;
    const step = value > display ? 1 : -1;
    const timer = setInterval(() => {
      setDisplay((prev) => {
        if (prev === value) { clearInterval(timer); return prev; }
        const diff = Math.abs(value - prev);
        const inc = diff > 8 ? Math.ceil(diff / 4) * step : step * Math.min(diff, 3);
        const next = prev + inc;
        if ((step > 0 && next >= value) || (step < 0 && next <= value)) { clearInterval(timer); return value; }
        return next;
      });
    }, 12);
    return () => clearInterval(timer);
  }, [value, display]);
  return <span>${display}</span>;
};

const loadRazorpay = (): Promise<boolean> =>
  new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export const OnboardingPlans: React.FC = () => {
  const { token, user, tenant, login, logout } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<PlanCategory>("storage");
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Free Tier");
  const [provisioningPlan, setProvisioningPlan] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const hasPlan =
      tenant?.computePlan ||
      tenant?.storagePlan ||
      tenant?.subscriptionPlan ||
      tenant?.allocatedResources?.computePlan ||
      tenant?.allocatedResources?.storagePlan;
    if (hasPlan) navigate("/dashboard", { replace: true });
  }, [tenant, navigate]);

  const computePlans = [
    {
      name: "Sandbox / Testing", isTrial: false, priceMonthly: 5, priceYearly: 42,
      originalYearly: 60, discountBadge: undefined, badge: "Best for Testing",
      description: "Shared vCPU ideal for development, testing, and small personal projects.",
      usersMonthly: 1, usersYearly: 1, unitName: "vCPU Core",
      features: ["1 GB Memory (RAM)", "25 GB NVMe Storage", "Shared CPU Architecture", "Community Support"],
      yearlyExtraFeatures: [] as string[],
      buttonText: "Deploy Sandbox", popular: false,
    },
    {
      name: "Dev Pro", isTrial: false, priceMonthly: 15, priceYearly: 126,
      originalYearly: 180, discountBadge: "30% OFF", badge: undefined,
      description: "Balanced performance for production apps and staging environments.",
      usersMonthly: 2, usersYearly: 2, unitName: "vCPU Cores",
      features: ["4 GB Memory (RAM)", "80 GB NVMe Storage", "Dedicated CPU Architecture"],
      yearlyExtraFeatures: ["Free Automated Daily Backups", "Priority Support Access"],
      popular: true, buttonText: "Deploy Node",
    },
    {
      name: "Compute Node", isTrial: false, priceMonthly: 40, priceYearly: 336,
      originalYearly: 480, discountBadge: "30% OFF", badge: undefined,
      description: "High performance dedicated CPUs for intensive workloads and CI/CD.",
      usersMonthly: 4, usersYearly: 4, unitName: "vCPU Cores",
      features: ["8 GB Memory (RAM)", "160 GB NVMe Storage", "High-Frequency CPU"],
      yearlyExtraFeatures: ["Free Automated Daily Backups", "Priority Support Access", "Advanced Network Telemetry"],
      buttonText: "Deploy Node", popular: false,
    },
  ];

  const storagePlans = [
    {
      name: "Free Tier", isTrial: true, priceMonthly: 0, priceYearly: 0,
      originalYearly: undefined, discountBadge: undefined, badge: "Free Forever",
      description: "Ideal for personal learning, experiments, and small side projects.",
      usersMonthly: 1, usersYearly: 1, unitName: "Team User",
      features: ["3 Active Projects", "1 GB NVMe Storage", "1,000 API Requests/day", "Community Support"],
      yearlyExtraFeatures: [] as string[],
      buttonText: "Get Started Free", popular: false,
    },
    {
      name: "Solo Dev", isTrial: false, priceMonthly: 5, priceYearly: 49,
      originalYearly: 60, discountBadge: "18% OFF", badge: undefined,
      description: "Built for individual developers and indie hackers launching apps.",
      usersMonthly: 3, usersYearly: 5, unitName: "Team Users",
      features: ["15 Active Projects", "15 GB NVMe Storage", "25,000 API Requests/day"],
      yearlyExtraFeatures: ["+5 GB Extra Storage Bonus", "Automated Daily Backups"],
      popular: true, buttonText: "Select Solo Dev",
    },
    {
      name: "Pro Dev", isTrial: false, priceMonthly: 15, priceYearly: 149,
      originalYearly: 180, discountBadge: "17% OFF", badge: undefined,
      description: "For power developers and freelancers building client solutions.",
      usersMonthly: 10, usersYearly: 15, unitName: "Team Users",
      features: ["Unlimited Active Projects", "50 GB NVMe Storage", "100,000 API Requests/day"],
      yearlyExtraFeatures: ["+15 GB Extra Storage Bonus", "Automated Daily Backups", "Priority Email & Chat Support"],
      buttonText: "Select Pro Dev", popular: false,
    },
  ];

  const currentPlans = category === "compute" ? computePlans : storagePlans;

  const handleAction = async (planName: string) => {
    setProvisioningPlan(planName);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (!token) throw new Error("Authentication error. Please log in again.");
      const orderRes = await fetch("http://localhost:5000/api/v1/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planName, category, isYearly }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to initialize payment order");

      if (orderData.isFree) {
        const verifyRes = await fetch("http://localhost:5000/api/v1/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ planName, category, isYearly, isFree: true }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || "Failed to activate Free Tier");
        login(verifyData.token, verifyData.user, verifyData.tenant);
        setProvisioningPlan(null);
        setSuccessMessage("Free Tier activated! Redirecting to your dashboard...");
        setTimeout(() => navigate("/dashboard", { replace: true }), 1600);
        return;
      }

      const scriptLoaded = await loadRazorpay();
      if (!scriptLoaded) throw new Error("Razorpay SDK failed to load. Check your network.");

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "TenantStack Cloud",
        description: `${planName} (${isYearly ? "1-Year Reserved" : "Monthly"})`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            setProvisioningPlan(planName);
            const verifyRes = await fetch("http://localhost:5000/api/v1/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planName, category, isYearly,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed.");
            login(verifyData.token, verifyData.user, verifyData.tenant);
            setProvisioningPlan(null);
            setSuccessMessage(`"${planName}" activated! Redirecting to your dashboard...`);
            setTimeout(() => navigate("/dashboard", { replace: true }), 1600);
          } catch (err: any) {
            setProvisioningPlan(null);
            setErrorMessage(err.message || "Payment verification failed.");
          }
        },
        prefill: {
          name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
          email: user?.email || "",
          contact: "9999999999",
        },
        notes: { planName, category, isYearly: isYearly ? "yes" : "no" },
        theme: { color: "#18181b" },
        modal: { ondismiss: () => setProvisioningPlan(null) },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        setProvisioningPlan(null);
        setErrorMessage(resp.error?.description || "Payment was cancelled or rejected.");
      });
      rzp.open();
    } catch (err: any) {
      setProvisioningPlan(null);
      setErrorMessage(err.message || "Something went wrong during checkout.");
    }
  };

  const userInitials =
    `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 selection:bg-[#c8f542] selection:text-slate-900">
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(145,151,157,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(141,151,163,0.25) 1px, transparent 1px)",
            backgroundSize: "6.5rem 6.5rem",
          }}
        />
      </div>

      <header className="relative z-20 w-full bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#c8f542] flex items-center justify-center shadow-sm">
              <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" stroke="#0f172a" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 6 L26 11 L16 16 L6 11 Z" fill="#c8f542" />
                <path d="M6 11 L6 13.5 L16 18.5 L26 13.5 L26 11" />
                <path d="M6 17 L16 22 L26 17" />
                <path d="M6 21 L16 26 L26 21" />
              </svg>
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">TenantStack</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400">
            <span className="line-through">Create Account</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-slate-900">Choose a Plan</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c8f542] to-[#5E9F71] flex items-center justify-center text-slate-900 font-bold text-sm shadow-md">
              {userInitials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-800 leading-none">{user?.firstName} {user?.lastName}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-none">{user?.email}</p>
            </div>
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="text-xs text-slate-400 hover:text-rose-500 font-medium transition ml-1 cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <motion.div initial="hidden" animate="visible" variants={stagger} className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-12 pb-4">
        <motion.div variants={fadeUp} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c8f542]/20 text-slate-900 text-xs font-bold uppercase tracking-wider mb-5 border border-[#c8f542]/40">
            <Sparkles className="w-3.5 h-3.5 text-[#5E9F71]" />
            <span>Welcome to TenantStack -- Step 2 of 2</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-4">
            Set up your workspace
          </h1>
          <p className="text-slate-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Choose a plan to activate your cloud resources. Start free -- no credit card required.
          </p>
        </motion.div>

        <motion.div variants={fadeUp} className="flex items-center justify-center mb-8">
          <div className="inline-flex p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
            <button
              type="button"
              onClick={() => { setCategory("storage"); setSelectedPlan("Free Tier"); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${category === "storage" ? "bg-slate-900 text-[#c8f542] shadow-md" : "text-slate-500 hover:text-slate-900"}`}
            >
              <HardDrive className="w-4 h-4" />
              Storage &amp; Plans
            </button>
            <button
              type="button"
              onClick={() => { setCategory("compute"); setSelectedPlan("Dev Pro"); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${category === "compute" ? "bg-slate-900 text-[#c8f542] shadow-md" : "text-slate-500 hover:text-slate-900"}`}
            >
              <Server className="w-4 h-4" />
              Compute Nodes
            </button>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="flex items-center justify-center gap-4 mb-10">
          <span className={`text-sm font-bold transition-colors ${!isYearly ? "text-slate-900" : "text-slate-400"}`}>
            {category === "compute" ? "On-Demand (Monthly)" : "Monthly"}
          </span>
          <button
            type="button"
            onClick={() => setIsYearly(!isYearly)}
            className="w-12 h-6 bg-[#5E9F71]/20 rounded-full relative p-1 outline-none cursor-pointer"
            aria-label="Toggle monthly/yearly billing"
          >
            <div className={`w-4 h-4 bg-[#5E9F71] rounded-full shadow-sm transition-transform duration-300 ${isYearly ? "translate-x-6" : "translate-x-0"}`} />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold transition-colors ${isYearly ? "text-slate-900" : "text-slate-400"}`}>
              {category === "compute" ? "1-Year Reserved" : "Yearly"}
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold tracking-wide rounded-full">
              {category === "compute" ? "Save up to 30%" : "Extra Perks + Save up to 25%"}
            </span>
          </div>
        </motion.div>

        {successMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold">{successMessage}</span>
            <div className="ml-auto w-5 h-5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
          </motion.div>
        )}
        {errorMessage && (
          <div className="max-w-3xl mx-auto mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="text-sm font-semibold">{errorMessage}</span>
            </div>
            <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-700 cursor-pointer p-1">x</button>
          </div>
        )}

        <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch pb-8">
          {currentPlans.map((plan, idx) => {
            const isDark = selectedPlan === plan.name;
            return (
              <motion.div key={idx} variants={fadeUp} className="h-full">
                <div
                  onClick={() => setSelectedPlan(plan.name)}
                  className={`border rounded-[1.5rem] p-8 sm:p-10 relative flex flex-col justify-between transition-all duration-300 hover:shadow-2xl h-full cursor-pointer ${isDark ? "bg-[#18181b] border-transparent text-white shadow-2xl shadow-slate-900/30 md:-translate-y-2" : "bg-white border-slate-200 text-slate-900 hover:border-slate-300 hover:-translate-y-1"}`}
                >
                  {isDark && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#c8f542] via-[#5E9F71] to-emerald-400 rounded-t-[1.5rem]" />}
                  <div>
                    <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                      <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{plan.name}</h3>
                      {plan.popular && <span className="px-3 py-1 bg-[#c8f542] text-[#2c3d0c] text-[10px] font-bold uppercase tracking-wider rounded-full">Recommended</span>}
                      {plan.badge && <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider rounded-full">{plan.badge}</span>}
                    </div>
                    <p className={`text-sm leading-relaxed mb-8 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{plan.description}</p>
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-5xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                          {plan.isTrial ? <span>$0</span> : <AnimatedPrice value={isYearly ? plan.priceYearly : plan.priceMonthly} />}
                        </span>
                        <span className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {plan.isTrial ? "forever" : isYearly ? "per year" : "per month"}
                        </span>
                      </div>
                      <div className={`mt-3 flex items-center gap-2 h-6 transition-opacity duration-300 ${!plan.isTrial && isYearly && plan.originalYearly ? "opacity-100" : "opacity-0"}`}>
                        {plan.originalYearly && (
                          <>
                            <span className={`text-sm line-through font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>${plan.originalYearly}</span>
                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold tracking-wide rounded-full">{plan.discountBadge}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ul className="space-y-4">
                      <li className={`flex items-center justify-between gap-2 text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#5E9F71] flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <div className="flex items-center gap-2">
                            {isYearly && plan.usersYearly > plan.usersMonthly ? (
                              <>
                                <span className="line-through text-slate-400 opacity-40 blur-[0.6px] select-none text-xs font-semibold">{plan.usersMonthly} {plan.unitName}</span>
                                <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{plan.usersYearly} {plan.unitName}</span>
                              </>
                            ) : (
                              <span>{plan.usersMonthly} {plan.unitName}</span>
                            )}
                          </div>
                        </div>
                        {isYearly && plan.usersYearly > plan.usersMonthly && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${isDark ? "bg-[#c8f542]/20 text-[#c8f542] border border-[#c8f542]/30" : "bg-emerald-100 text-emerald-800 border border-emerald-200"}`}>
                            +{plan.usersYearly - plan.usersMonthly} Extra
                          </span>
                        )}
                      </li>
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className={`flex items-center gap-3 text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          <div className="w-5 h-5 rounded-full bg-[#5E9F71] flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                    {!plan.isTrial && isYearly && plan.yearlyExtraFeatures.length > 0 && (
                      <div className="mt-6 pt-5 border-t border-dashed border-slate-200/80">
                        <div className="flex items-center gap-1.5 mb-3.5">
                          <Sparkles className={`w-3.5 h-3.5 ${isDark ? "text-[#c8f542]" : "text-[#5E9F71]"}`} />
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-[#c8f542]" : "text-[#5E9F71]"}`}>Yearly Extra Benefits</span>
                        </div>
                        <ul className="space-y-3">
                          {plan.yearlyExtraFeatures.map((extraFeat, eIdx) => (
                            <li key={eIdx} className={`flex items-center justify-between gap-2 text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? "bg-[#c8f542] text-slate-950" : "bg-[#5E9F71] text-white"}`}>
                                  <Check className="w-3 h-3" strokeWidth={3} />
                                </div>
                                <span>{extraFeat}</span>
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${isDark ? "bg-[#c8f542]/20 text-[#c8f542]" : "bg-emerald-100 text-emerald-800"}`}>Bonus</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={provisioningPlan === plan.name}
                    onClick={(e) => { e.stopPropagation(); handleAction(plan.name); }}
                    className={`mt-10 w-full font-semibold py-3 px-6 rounded-full text-sm flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed ${isDark ? "bg-white hover:bg-[#c8f542] text-slate-900 hover:text-slate-950 shadow-md hover:shadow-xl" : "bg-[#18181b] hover:bg-[#c8f542] text-white hover:text-slate-900 shadow-md hover:shadow-lg hover:shadow-[#c8f542]/20"}`}
                  >
                    {provisioningPlan === plan.name ? (
                      <><Clock className="w-4 h-4 animate-spin" /><span>Activating...</span></>
                    ) : (
                      <><span>{plan.buttonText}</span><ArrowRight className="w-4 h-4 ml-1" /></>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-col items-center gap-6 py-10 border-t border-slate-200/80">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-sm text-slate-500">
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#5E9F71]" /><span>Full resource isolation</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#5E9F71]" /><span>Pause, upgrade, or cancel anytime</span></div>
            <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-[#5E9F71]" /><span>Secure multi-tenant architecture</span></div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
