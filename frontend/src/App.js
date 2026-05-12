import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";
import "./i18n";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import MorningModal from "./components/MorningModal";
import PWAInstallBanner from "./components/PWAInstallBanner";
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
import Coaches from "./pages/Coaches";
import BecomeCoach from "./pages/BecomeCoach";
import Planner from "./pages/Planner";

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
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", !!user?.settings?.reduce_motion);
  }, [user]);
  useEffect(() => {
    if (user?.language && user.language !== i18n.language) {
      i18n.changeLanguage(user.language);
      localStorage.setItem("ff_lang", user.language);
    }
  }, [user, i18n]);
  // Register service worker once
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

function Shell({ children }) {
  return (
    <>
      <Layout>{children}</Layout>
      <MorningModal />
      <PWAInstallBanner />
    </>
  );
}

function AppRoutes() {
  return (
    <>
      <ApplyPrefs />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/become-a-coach" element={<BecomeCoach />} />
        <Route path="/onboarding" element={<Protected requireOnboarded={false}><Onboarding /></Protected>} />
        <Route path="/dashboard" element={<Protected><Shell><Dashboard /></Shell></Protected>} />
        <Route path="/focus" element={<Protected><FocusPage /></Protected>} />
        <Route path="/tasks" element={<Protected><Shell><Tasks /></Shell></Protected>} />
        <Route path="/body-double" element={<Protected><Shell><BodyDouble /></Shell></Protected>} />
        <Route path="/progress" element={<Protected><Shell><ProgressPage /></Shell></Protected>} />
        <Route path="/shop" element={<Protected><Shell><Shop /></Shell></Protected>} />
        <Route path="/coaches" element={<Protected><Shell><Coaches /></Shell></Protected>} />
        <Route path="/planner" element={<Protected><Shell><Planner /></Shell></Protected>} />
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
