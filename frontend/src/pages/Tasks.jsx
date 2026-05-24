import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { celebrate } from "../components/Confetti";
import { Plus, Trash2, Sparkles, Eye, EyeOff, Heart, Timer } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

const EMOJI_TAGS = [
  { e: "⚡", l: "excited" },
  { e: "😰", l: "scary" },
  { e: "😴", l: "boring" },
  { e: "🌱", l: "small" },
];

function playDing() {
  if (document.documentElement.classList.contains("reduce-motion")) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
}

export default function Tasks() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("⚡");
  const [oneThing, setOneThing] = useState(false);
  const [aiBusyId, setAiBusyId] = useState(null);
  const [empathy, setEmpathy] = useState(null);
  const [animatingId, setAnimatingId] = useState(null);
  const [xpPopId, setXpPopId] = useState(null);

  const load = async () => {
    const { data } = await api.get("/tasks");
    setTasks(data);
  };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await api.post("/tasks", { title: title.trim(), emoji_tag: tag });
    setTitle("");
    load();
  };

  const toggle = async (taskItem) => {
    if (taskItem.completed) {
      // Just un-complete without animation
      await api.patch(`/tasks/${taskItem.id}`, { completed: false });
      load();
      return;
    }
    // Optimistic animation
    setAnimatingId(taskItem.id);
    setXpPopId(taskItem.id);
    playDing();
    setTimeout(() => setXpPopId(null), 700);
    try {
      const { data } = await api.patch(`/tasks/${taskItem.id}`, { completed: true });
      // Wait for animation to finish then reload
      setTimeout(async () => {
        if (data.reward) {
          await refresh();
        }
        // Check if all tasks complete after this one
        const remaining = tasks.filter((x) => x.id !== taskItem.id && !x.completed);
        if (remaining.length === 0 && tasks.length > 0) {
          celebrate();
          setTimeout(() => celebrate(), 300);
          toast.success("You did everything today. That's incredible. 💛 +25 XP");
          // Bonus XP via mood post (small hack) — or rely on backend; for now toast only
        } else {
          celebrate();
          toast.success("+15 XP — micro win 🎉");
        }
        setAnimatingId(null);
        load();
      }, 700);
    } catch {
      setAnimatingId(null);
      toast.error("Could not save");
    }
  };

  const remove = async (taskItem) => {
    await api.delete(`/tasks/${taskItem.id}`);
    load();
  };

  const aiBreakdown = async (taskItem) => {
    setAiBusyId(taskItem.id);
    try {
      const { data } = await api.post("/ai/breakdown", { task: taskItem.title });
      await api.patch(`/tasks/${taskItem.id}`, { microsteps: data.steps });
      toast.success("Broken into tiny steps ✨");
      load();
    } catch (e) {
      if (e?.response?.status === 402) {
        toast.error("✨ Pro feature — upgrade to unlock AI breakdown");
      } else {
        toast.error("AI is resting. Try again in a moment.");
      }
    } finally {
      setAiBusyId(null);
    }
  };

  const askEmpathy = async (taskItem) => {
    setEmpathy({ task: taskItem.title, message: "loading…" });
    try {
      const { data } = await api.post("/ai/empathy", { task: taskItem.title });
      setEmpathy({ task: taskItem.title, message: data.message });
    } catch {
      setEmpathy({ task: taskItem.title, message: "Whatever you're feeling about this is valid. Try just opening the doc — that counts as starting." });
    }
  };

  const toggleStep = async (taskItem, stepId) => {
    const newSteps = taskItem.microsteps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
    await api.patch(`/tasks/${taskItem.id}`, { microsteps: newSteps });
    load();
  };

  const visible = oneThing ? tasks.filter((x) => !x.completed).slice(0, 1) : tasks;

  return (
    <div className="p-6 md:p-12 max-w-4xl">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black">{t("tasks.title")}</h1>
          <p className="text-[#D0C7DB] mt-1">{t("tasks.subtitle")}</p>
        </div>
        <button
          data-testid="just-one-thing-btn"
          onClick={() => setOneThing((v) => !v)}
          className="ff-btn-ghost flex items-center gap-2 text-sm"
        >
          {oneThing ? <Eye size={16} /> : <EyeOff size={16} />}
          {oneThing ? t("tasks.showAll") : t("tasks.justOne")}
        </button>
      </div>

      <form onSubmit={add} className="ff-card p-5 my-6 flex flex-wrap gap-3 items-center" data-testid="new-task-form">
        <input
          data-testid="new-task-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="ff-input flex-1 min-w-[200px]"
          placeholder={t("tasks.placeholder")}
        />
        <div className="flex gap-1">
          {EMOJI_TAGS.map((tg) => (
            <button
              type="button"
              key={tg.e}
              data-testid={`emoji-${tg.l}`}
              onClick={() => setTag(tg.e)}
              className={`text-xl px-3 py-2 rounded-2xl ${tag === tg.e ? "bg-[#FFD166]/20 ring-1 ring-[#FFD166]" : "bg-[#1A1625]/60"}`}
            >{tg.e}</button>
          ))}
        </div>
        <button data-testid="add-task-btn" className="ff-btn-primary text-sm flex items-center gap-1">
          <Plus size={16} /> {t("tasks.add")}
        </button>
      </form>

      {empathy && (
        <div className="ff-card p-5 mb-6 border-l-4 border-[#E07A5F]" data-testid="empathy-card">
          <div className="flex items-center gap-2 text-[#E07A5F] font-bold mb-1"><Heart size={16} /> {t("tasks.softResponse")}</div>
          <div className="text-sm text-[#D0C7DB] italic">"{empathy.message}"</div>
          <button onClick={() => setEmpathy(null)} className="text-xs text-[#8D829B] mt-2">close</button>
        </div>
      )}

      <ul className="space-y-3">
        {visible.length === 0 && (
          <li className="text-center text-[#8D829B] py-12 ff-card">{t("tasks.empty")}</li>
        )}
        {visible.map((taskItem) => {
          const animating = animatingId === taskItem.id;
          const totalMin = (taskItem.microsteps || []).reduce((s, m) => s + (m.minutes || 0), 0);
          return (
            <li
              key={taskItem.id}
              data-testid={`task-${taskItem.id}`}
              className={`ff-card p-5 relative ${animating ? "ff-task-flash ff-task-slide-out" : ""}`}
            >
              {xpPopId === taskItem.id && (
                <div className="absolute left-10 top-3 text-[#FFD166] font-extrabold text-sm ff-xp-pop pointer-events-none" data-testid={`xp-pop-${taskItem.id}`}>
                  +15 XP
                </div>
              )}
              <div className="flex items-start gap-3">
                <button
                  data-testid={`toggle-${taskItem.id}`}
                  onClick={() => toggle(taskItem)}
                  className={`h-7 w-7 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all ${
                    taskItem.completed ? "bg-[#FFD166] border-[#FFD166]" : "border-[#8D829B] hover:border-[#FFD166]"
                  }`}
                  aria-label={taskItem.completed ? "mark incomplete" : "mark complete"}
                >
                  {taskItem.completed && <span className="text-[#1A1625] font-black">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center gap-2 ${taskItem.completed ? "text-[#8D829B]" : ""}`}>
                    <span className="text-xl">{taskItem.emoji_tag || "📝"}</span>
                    <span className={`font-bold truncate ${taskItem.completed ? "line-through" : ""} ${animating ? "ff-task-strike" : ""}`}>{taskItem.title}</span>
                    {totalMin > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#45B69C]/20 text-[#45B69C] flex items-center gap-1" data-testid={`task-time-${taskItem.id}`}>
                        <Timer size={9} /> ~{totalMin} min
                      </span>
                    )}
                  </div>
                  {taskItem.microsteps && taskItem.microsteps.length > 0 && (
                    <ul className="mt-3 space-y-1.5 ml-1" data-testid={`microsteps-${taskItem.id}`}>
                      {taskItem.microsteps.map((s) => (
                        <li key={s.id} className="flex items-center gap-2 text-sm text-[#D0C7DB]">
                          <button
                            onClick={() => toggleStep(taskItem, s.id)}
                            className={`h-4 w-4 rounded border ${s.done ? "bg-[#45B69C] border-[#45B69C]" : "border-[#8D829B]"}`}
                          />
                          <span className={s.done ? "line-through text-[#8D829B]" : ""}>{s.title}</span>
                          {s.minutes && <span className="text-[10px] text-[#8D829B]">· ~{s.minutes} min</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      data-testid={`ai-breakdown-${taskItem.id}`}
                      disabled={aiBusyId === taskItem.id}
                      onClick={() => aiBreakdown(taskItem)}
                      className="text-xs ff-btn-ghost flex items-center gap-1 disabled:opacity-50"
                      title={user?.is_pro ? "Break into micro-steps" : "✨ Pro feature — upgrade to unlock"}
                    >
                      <Sparkles size={12} /> {aiBusyId === taskItem.id ? t("tasks.thinking") : user?.is_pro ? t("tasks.breakdown") : t("tasks.breakdownPro")}
                    </button>
                    <button data-testid={`ai-empathy-${taskItem.id}`} onClick={() => askEmpathy(taskItem)} className="text-xs ff-btn-ghost flex items-center gap-1">
                      <Heart size={12} /> {t("tasks.whyHard")}
                    </button>
                  </div>
                </div>
                <button data-testid={`delete-${taskItem.id}`} onClick={() => remove(taskItem)} className="text-[#8D829B] hover:text-[#E07A5F] p-2" aria-label="delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
