import { Link } from "react-router-dom";
import { useState } from "react";
import { Sparkles, Heart, Timer, Users } from "lucide-react";
import FocusBuddy from "../components/FocusBuddy";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);

  const joinWaitlist = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      await api.post("/waitlist", { email: email.trim() });
      setJoined(true);
      toast.success("You're on the list! We'll reach out soon 💛");
      setEmail("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not join — try again?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="px-6 md:px-12 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-[#FFD166] flex items-center justify-center">
            <Sparkles className="text-[#1A1625]" size={22} />
          </div>
          <div className="font-extrabold text-lg">FocusFlow</div>
        </div>
        <div className="flex gap-2">
          <Link to="/auth?mode=login" data-testid="nav-login" className="ff-btn-ghost text-sm">Sign in</Link>
          <Link to="/auth?mode=register" data-testid="nav-register" className="ff-btn-primary text-sm">Get started</Link>
        </div>
      </header>

      <section className="px-6 md:px-12 lg:px-20 py-12 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 ff-card px-4 py-2 mb-6 text-xs tracking-widest uppercase text-[#FFD166]">
            <Heart size={14} /> Built for ADHD brains
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] mb-6">
            Productivity that feels like <span className="text-[#FFD166]">a warm hug</span>, not a lecture.
          </h1>
          <p className="text-lg text-[#D0C7DB] mb-8 leading-relaxed max-w-xl">
            Tiny tasks. Gentle nudges. Confetti when you finish. FocusFlow is your dopamine-friendly companion for staying focused without the shame spiral.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/auth?mode=register" data-testid="hero-cta" className="ff-btn-primary text-base">
              Start free — no credit card
            </Link>
            <Link to="/auth?mode=login" className="ff-btn-ghost text-base">I already have an account</Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-6 text-sm text-[#D0C7DB]">
            <div className="flex items-center gap-2"><Timer size={16} className="text-[#45B69C]" /> 15-min focus sprints</div>
            <div className="flex items-center gap-2"><Users size={16} className="text-[#B19CD9]" /> Body doubling rooms</div>
            <div className="flex items-center gap-2"><Heart size={16} className="text-[#E07A5F]" /> Grace days, no shame</div>
          </div>
        </div>

        <div className="ff-card p-10 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-[#FFD166]/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-[#B19CD9]/15 blur-3xl" />
          <FocusBuddy size={140} />
          <div className="text-2xl font-extrabold mt-6">Hi, I'm Blob.</div>
          <div className="text-[#D0C7DB] mt-2 max-w-xs">I'll cheer you on through tiny wins and gentle resets. We're in this together.</div>
          <div className="mt-6 grid grid-cols-3 gap-2 w-full">
            {[
              { v: "15m", l: "Focus" },
              { v: "+15", l: "XP/task" },
              { v: "🔥7", l: "Streak" },
            ].map((s) => (
              <div key={s.l} className="bg-[#1A1625]/60 rounded-2xl p-3 border border-[#3A3249]/60">
                <div className="font-extrabold text-[#FFD166]">{s.v}</div>
                <div className="text-xs text-[#8D829B]">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 lg:px-20 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { t: "Brain dump → Micro-steps", d: "Tell us what's on your mind. AI breaks it down so it stops feeling impossible.", c: "#B19CD9" },
            { t: "Body doubling, no pressure", d: "Drop into a silent co-working room. No video, no chat — just quiet company.", c: "#45B69C" },
            { t: "Streaks with grace days", d: "Miss a day? We hold your streak. Two grace days, every week. No guilt.", c: "#FFD166" },
          ].map((f) => (
            <div key={f.t} className="ff-card p-7">
              <div className="h-10 w-10 rounded-2xl mb-4" style={{ background: f.c }} />
              <div className="font-extrabold text-lg mb-2">{f.t}</div>
              <div className="text-sm text-[#D0C7DB] leading-relaxed">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Waitlist */}
      <section className="px-6 md:px-12 lg:px-20 pb-20">
        <div className="ff-card p-8 md:p-12 max-w-3xl mx-auto text-center relative overflow-hidden" data-testid="waitlist-section">
          <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-[#FFD166]/10 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[#B19CD9]/15 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">Be the first to know when Pro launches 🚀</h2>
            <p className="text-[#D0C7DB] mb-8 max-w-lg mx-auto">Get early access, founder pricing, and a soft heads-up — no spam, just one warm email.</p>
            {joined ? (
              <div data-testid="waitlist-success" className="ff-card inline-block px-6 py-4 bg-[#45B69C]/10 ring-1 ring-[#45B69C]">
                <span className="text-[#45B69C] font-extrabold">You're on the list! We'll reach out soon 💛</span>
              </div>
            ) : (
              <form onSubmit={joinWaitlist} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" data-testid="waitlist-form">
                <input
                  data-testid="waitlist-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="ff-input flex-1"
                />
                <button
                  data-testid="waitlist-submit"
                  disabled={busy}
                  className="ff-btn-primary disabled:opacity-60 whitespace-nowrap"
                >
                  {busy ? "Adding…" : "Notify me"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="px-6 md:px-12 py-8 text-center text-sm text-[#8D829B]">
        Made with care for neurodivergent brains. © FocusFlow
      </footer>
    </div>
  );
}
