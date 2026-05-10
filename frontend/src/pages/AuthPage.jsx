import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import FocusBuddy from "../components/FocusBuddy";
import { toast } from "sonner";

export default function AuthPage() {
  const [params] = useSearchParams();
  const initial = params.get("mode") === "login" ? "login" : "register";
  const [mode, setMode] = useState(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        const u = await register(email, password, name || "Friend");
        toast.success(`Welcome, ${u.name}! 🌱`);
        navigate("/onboarding");
      } else {
        const u = await login(email, password);
        toast.success(`Welcome back, ${u.name}!`);
        navigate(u.onboarded ? "/dashboard" : "/onboarding");
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col items-center justify-center p-12 bg-[#2A2438]/50 relative overflow-hidden">
        <div className="absolute top-10 left-10 h-72 w-72 rounded-full bg-[#B19CD9]/15 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-[#FFD166]/10 blur-3xl" />
        <FocusBuddy size={180} />
        <h2 className="text-3xl font-black mt-8 text-center max-w-md">A gentler way to get things done</h2>
        <p className="text-[#D0C7DB] mt-4 text-center max-w-sm">No streak shaming. No productivity guilt. Just tiny wins, every day.</p>
      </div>

      <div className="flex flex-col justify-center p-6 md:p-12">
        <Link to="/" className="text-sm text-[#8D829B] mb-6 hover:text-[#FFD166]">← back</Link>
        <h1 className="text-3xl sm:text-4xl font-black mb-2">
          {mode === "register" ? "Make a soft start" : "Welcome back, friend"}
        </h1>
        <p className="text-[#D0C7DB] mb-8">
          {mode === "register" ? "Create your account in 30 seconds." : "Glad you're here. Let's keep going."}
        </p>

        <form onSubmit={submit} className="space-y-4 max-w-sm">
          {mode === "register" && (
            <div>
              <label className="text-sm text-[#D0C7DB] mb-1 block">Your name</label>
              <input
                data-testid="auth-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="ff-input"
                placeholder="What should we call you?"
              />
            </div>
          )}
          <div>
            <label className="text-sm text-[#D0C7DB] mb-1 block">Email</label>
            <input
              data-testid="auth-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ff-input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-sm text-[#D0C7DB] mb-1 block">Password</label>
            <input
              data-testid="auth-password-input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ff-input"
              placeholder="At least 6 characters"
            />
          </div>
          <button
            data-testid="auth-submit-btn"
            disabled={loading}
            className="ff-btn-primary w-full disabled:opacity-60"
          >
            {loading ? "One sec…" : mode === "register" ? "Create my account 🌱" : "Sign me in"}
          </button>
        </form>

        <div className="mt-6 text-sm text-[#D0C7DB]">
          {mode === "register" ? (
            <>Already have an account?{" "}
              <button data-testid="toggle-login" onClick={() => setMode("login")} className="text-[#FFD166] font-bold">Sign in</button>
            </>
          ) : (
            <>New here?{" "}
              <button data-testid="toggle-register" onClick={() => setMode("register")} className="text-[#FFD166] font-bold">Make an account</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
