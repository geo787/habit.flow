import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import FocusPage from "./pages/Focus";
import Tasks from "./pages/Tasks";
import BodyDouble from "./pages/BodyDouble";
import ProgressPage from "./pages/Progress";
import Shop from "./pages/Shop";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";

function Protected({ children, requireOnboarded = true }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#8D829B]">loading…</div>;
  if (!user) return <Navigate to="/auth" replace state={{ from: loc.pathname }} />;
  if (requireOnboarded && !user.onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

function ApplyPrefs() {
  const { user } = useAuth();
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", !!user?.settings?.reduce_motion);
  }, [user]);
  return null;
}

function Shell({ children }) {
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  return (
    <>
      <ApplyPrefs />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/onboarding" element={<Protected requireOnboarded={false}><Onboarding /></Protected>} />
        <Route path="/dashboard" element={<Protected><Shell><Dashboard /></Shell></Protected>} />
        <Route path="/focus" element={<Protected><FocusPage /></Protected>} />
        <Route path="/tasks" element={<Protected><Shell><Tasks /></Shell></Protected>} />
        <Route path="/body-double" element={<Protected><Shell><BodyDouble /></Shell></Protected>} />
        <Route path="/progress" element={<Protected><Shell><ProgressPage /></Shell></Protected>} />
        <Route path="/shop" element={<Protected><Shell><Shop /></Shell></Protected>} />
        <Route path="/settings" element={<Protected><Shell><Settings /></Shell></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          theme="dark"
          richColors
          position="top-right"
          toastOptions={{
            style: { background: "#2A2438", color: "#FDFCFD", border: "1px solid #3A3249", borderRadius: "1rem" },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
