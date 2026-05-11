import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import FocusBuddy from "../components/FocusBuddy";
import { Flame, Users, Sparkles, Play, Heart, X, Lock } from "lucide-react";
import { toast } from "sonner";

const moodEmojis = ["😩", "😕", "😐", "🙂", "🔥"];

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [affirmation, setAffirmation] = useState("");
  const [rooms, setRooms] = useState({ rooms: [], total_live: 0 });
  const [usage, setUsage] = useState(null);
  const [moodOpen, setMoodOpen] = useState(false);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [showProBanner, setShowProBanner] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    (async () => {
      const [t, aff, r, u] = await Promise.all([
        api.get("/tasks"),
        api.get("/ai/affirmation").catch(() => ({ data: { affirmation: "You showed up — that already counts." } })),
        api.get("/body-double/rooms"),
        api.get("/focus/usage"),
      ]);
      setTasks(t.data);
      setAffirmation(aff.data.affirmation);
      setRooms(r.data);
      setUsage(u.data);
    })();
  }, []);

  // Handle Stripe success redirect
  useEffect(() => {
    const upgrade = params.get("upgrade");
    const sid = params.get("session_id");
    if (upgrade === "success" && sid) {
      let attempts = 0;
      const poll = async () => {
        try {
          const { data } = await api.get(`/checkout/status/${sid}`);
          if (data.payment_status === "paid") {
            await refresh();
            setShowProBanner(true);
            toast.success("Welcome to Pro! 🌟");
            return;
          }
        } catch {}
        if (attempts++ < 5) setTimeout(poll, 2000);
      };
      poll();
    }
  }, [params, refresh]);

  const todayTasks = tasks.filter((t) => !t.completed).slice(0, 3);
  const lvl = user?.level_info;

  const submitMood = async () => {
    try {
      await api.post("/mood", { mood, energy });
      toast.success("Logged. Thanks for checking in. 💛");
      setMoodOpen(false);
      await refresh();
    } catch {
      toast.error("Could not log mood");
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-6xl">
      {showProBanner && (
        <div data-testid="pro-banner" className="ff-card p-5 mb-6 bg-gradient-to-r from-[#FFD166]/15 to-[#B19CD9]/15 ring-1 ring-[#FFD166] flex items-center gap-3">
          <Sparkles className="text-[#FFD166]" />
          <div className="flex-1">
            <div className="font-extrabold">Welcome to Pro! 🌟</div>
            <div className="text-sm text-[#D0C7DB]">Unlimited sessions, AI breakdown, all sounds — unlocked.</div>
          </div>
          <button onClick={() => setShowProBanner(false)} className="text-[#8D829B]" aria-label="dismiss"><X size={16} /></button>
        </div>
      )}
      {/* greeting */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-[#8D829B] text-sm">Welcome back,</div>
          <h1 className="text-3xl sm:text-4xl font-black">Hi {user?.name} 💛</h1>
          {affirmation && (
            <p className="text-[#D0C7DB] mt-2 max-w-xl italic" data-testid="daily-affirmation">"{affirmation}"</p>
          )}
        </div>
        <div className="ff-card px-5 py-3 flex items-center gap-3" data-testid="streak-badge">
          <Flame className="text-[#FFD166]" />
          <div>
            <div className="text-xs text-[#8D829B]">Streak</div>
            <div className="font-extrabold">{user?.streak || 0} days</div>
          </div>
        </div>
      </div>

      {/* level bar */}
      <div className="ff-card p-6 mb-8" data-testid="level-card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-3">
            <Sparkles className="text-[#FFD166]" />
            <div>
              <div className="text-xs text-[#8D829B] uppercase tracking-widest">Level {lvl?.level}</div>
              <div className="font-extrabold text-xl">{lvl?.title}</div>
            </div>
          </div>
          <div className="text-sm text-[#D0C7DB]">{user?.xp} / {lvl?.next_threshold} XP</div>
        </div>
        <div className="h-3 bg-[#1A1625] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FFD166] via-[#B19CD9] to-[#45B69C] transition-all"
            style={{ width: `${Math.min(100, (lvl?.progress || 0) * 100)}%` }}
          />
        </div>
      </div>

      {/* hero CTA */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <button
          data-testid="start-focus-btn"
          onClick={() => navigate("/focus")}
          className="lg:col-span-2 ff-card p-10 text-left relative overflow-hidden hover:bg-[#352D47] transition-all"
        >
          <div className="absolute -top-10 -right-10 h-56 w-56 rounded-full bg-[#FFD166]/15 blur-3xl ff-pulse-soft" />
          <div className="relative">
            <div className="text-xs uppercase tracking-[0.2em] text-[#FFD166]">Primary</div>
            <h2 className="text-3xl sm:text-4xl font-black mt-2 mb-3">Start a focus sprint</h2>
            <p className="text-[#D0C7DB] mb-6 max-w-md">{user?.focus_length || 15} minutes of soft, distraction-free focus. Breathing circle included.</p>
            <span className="ff-btn-primary inline-flex items-center gap-2 text-base">
              <Play size={18} fill="#1A1625" /> Begin
            </span>
          </div>
        </button>
        <div className="ff-card p-6 flex flex-col items-center text-center">
          <FocusBuddy size={100} />
          <div className="font-bold mt-3">{user?.buddy === "cat" ? "Cat" : user?.buddy === "fox" ? "Fox" : "Blob"} is rooting for you</div>
          <div className="text-sm text-[#8D829B] mt-1">"You don't need motivation. Tiny steps. We've got this."</div>
        </div>
      </div>

      {/* today tasks */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="ff-card p-6 lg:col-span-2" data-testid="today-tasks">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-xl">Today's 3 tasks</h3>
            <Link to="/tasks" className="text-sm text-[#FFD166]">Open brain dump →</Link>
          </div>
          {todayTasks.length === 0 ? (
            <div className="text-[#8D829B] py-8 text-center">
              No tasks yet. <Link to="/tasks" className="text-[#FFD166] font-bold">Add a tiny one</Link>.
            </div>
          ) : (
            <ul className="space-y-3">
              {todayTasks.map((t) => (
                <li key={t.id} data-testid={`dash-task-${t.id}`} className="flex items-center gap-3 p-3 rounded-2xl bg-[#1A1625]/60 border border-[#3A3249]/40">
                  <div className="text-2xl">{t.emoji_tag || "📝"}</div>
                  <div className="flex-1 truncate">{t.title}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          {/* Mood card */}
          <div className="ff-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="text-[#E07A5F]" size={18} />
              <h3 className="font-extrabold">How are you?</h3>
            </div>
            {!moodOpen ? (
              <button data-testid="open-mood-btn" onClick={() => setMoodOpen(true)} className="ff-btn-ghost w-full">10-sec check-in</button>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-[#8D829B] mb-1">Mood</div>
                  <div className="flex justify-between gap-1">
                    {moodEmojis.map((e, i) => (
                      <button
                        key={i}
                        data-testid={`mood-${i + 1}`}
                        onClick={() => setMood(i + 1)}
                        className={`text-2xl p-2 rounded-xl ${mood === i + 1 ? "bg-[#FFD166]/20 ring-2 ring-[#FFD166]" : ""}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#8D829B] mb-1">Energy</div>
                  <input
                    data-testid="energy-slider"
                    type="range"
                    min="1"
                    max="5"
                    value={energy}
                    onChange={(e) => setEnergy(Number(e.target.value))}
                    className="w-full accent-[#FFD166]"
                  />
                </div>
                <button data-testid="submit-mood-btn" onClick={submitMood} className="ff-btn-primary w-full">Save · +5 XP</button>
              </div>
            )}
          </div>

          {/* body double pulse */}
          <Link to="/body-double" data-testid="body-double-pulse" className="ff-card p-6 block hover:bg-[#352D47]">
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="text-[#45B69C]" />
              <span className="font-extrabold">Body doubling</span>
            </div>
            <div className="text-2xl font-black text-[#45B69C]">{rooms.total_live.toLocaleString()}</div>
            <div className="text-xs text-[#8D829B]">people focusing right now →</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
