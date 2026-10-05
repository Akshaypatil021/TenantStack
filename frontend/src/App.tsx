import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Billing } from './pages/Billing';
import { AcceptInvite } from './pages/AcceptInvite';
import { AcceptProjectInvite } from './pages/AcceptProjectInvite';
import { AdminDashboard } from './pages/AdminDashboard';
import { Activity } from './pages/Activity';
import { Team } from './pages/Team';
import { Compute } from './pages/Compute';
import { Storage } from './pages/Storage';
import { GlobalSessionManager } from './components/GlobalSessionManager';
import { OnboardingPlans } from './pages/OnboardingPlans';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';

// Scroll to top on route transition
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
};

// Protected Route Component
const ProtectedLayout = () => {
  const { isAuthenticated, user, tenant } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const hasPlan = !!(
    tenant?.computePlan ||
    tenant?.storagePlan ||
    tenant?.subscriptionPlan ||
    tenant?.allocatedResources?.computePlan ||
    tenant?.allocatedResources?.storagePlan
  );

  if (!hasPlan && user?.email !== 'admin@gmail.com') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="flex min-h-screen bg-[#fafbfc] text-slate-900 selection:bg-[#c8f542] selection:text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

function AppRoutes() {
  const { isAuthenticated, user, tenant } = useAuth();

  // Detect whether the authenticated user already has any active plan
  const hasPlan = !!(
    tenant?.computePlan ||
    tenant?.storagePlan ||
    tenant?.subscriptionPlan ||
    tenant?.allocatedResources?.computePlan ||
    tenant?.allocatedResources?.storagePlan
  );

  return (
    <>
      <GlobalSessionManager />
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

      {/* Public Auth Routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={user?.email === 'admin@gmail.com' ? "/admin" : (hasPlan ? "/dashboard" : "/onboarding")} replace /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to={user?.email === 'admin@gmail.com' ? "/admin" : (hasPlan ? "/dashboard" : "/onboarding")} replace /> : <Register />}
      />
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to={user?.email === 'admin@gmail.com' ? "/admin" : (hasPlan ? "/dashboard" : "/onboarding")} replace /> : <ForgotPassword />}
      />
      <Route
        path="/reset-password/:token"
        element={isAuthenticated ? <Navigate to={user?.email === 'admin@gmail.com' ? "/admin" : (hasPlan ? "/dashboard" : "/onboarding")} replace /> : <ResetPassword />}
      />
      <Route
        path="/invite/:token"
        element={isAuthenticated ? <Navigate to={user?.email === 'admin@gmail.com' ? "/admin" : (hasPlan ? "/dashboard" : "/onboarding")} replace /> : <AcceptInvite />}
      />
      <Route
        path="/invite/project/:token"
        element={isAuthenticated ? <Navigate to={user?.email === 'admin@gmail.com' ? "/admin" : (hasPlan ? "/dashboard" : "/onboarding")} replace /> : <AcceptProjectInvite />}
      />

      {/* Onboarding Plan Selection - shown to new users who haven't chosen a plan yet */}
      <Route
        path="/onboarding"
        element={
          !isAuthenticated
            ? <Navigate to="/login" replace />
            : (user?.email === 'admin@gmail.com' || hasPlan)
            ? <Navigate to={user?.email === 'admin@gmail.com' ? '/admin' : '/dashboard'} replace />
            : <OnboardingPlans />
        }
      />

      {/* Dashboard - Full page with its own light-theme nav */}
      <Route
        path="/dashboard"
        element={
          !isAuthenticated
            ? <Navigate to="/login" replace />
            : (!hasPlan && user?.email !== 'admin@gmail.com' ? <Navigate to="/onboarding" replace /> : <Dashboard />)
        }
      />

      {/* Admin Dashboard - Full page with its own layout */}
      <Route
        path="/admin"
        element={isAuthenticated && user?.email === 'admin@gmail.com' ? <AdminDashboard /> : <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
      />

      {/* Protected SaaS App Routes (with sidebar/navbar layout) */}
      <Route element={<ProtectedLayout />}>
        <Route path="/projects" element={<Projects />} />
        <Route path="/compute" element={<Compute />} />
        <Route path="/storage" element={<Storage />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/team" element={<Team />} />
        <Route path="/billing" element={<Billing />} />
      </Route>

      {/* Default Catch-all */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? (user?.email === 'admin@gmail.com' ? "/admin" : (hasPlan ? "/dashboard" : "/onboarding")) : "/"} replace />}
      />
    </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
