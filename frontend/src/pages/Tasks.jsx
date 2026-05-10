import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { celebrate } from "../components/Confetti";
import { Plus, Trash2, Sparkles, Eye, EyeOff, Heart } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

const EMOJI_TAGS = [
  { e: "⚡", l: "excited" },
  { e: "😰", l: "scary" },
  { e: "😴", l: "boring" },
  { e: "🌱", l: "small" },
];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("⚡");
  const [oneThing, setOneThing] = useState(false);
  const [aiBusyId, setAiBusyId] = useState(null);
  const [empathy, setEmpathy] = useState(null);
  const { refresh } = useAuth();

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

  const toggle = async (t) => {
    const { data } = await api.patch(`/tasks/${t.id}`, { completed: !t.completed });
    if (data.reward && !t.completed) {
      celebrate();
      toast.success("+15 XP — micro win 🎉");
      await refresh();
    }
    load();
  };

  const remove = async (t) => {
    await api.delete(`/tasks/${t.id}`);
    load();
  };

  const aiBreakdown = async (t) => {
    setAiBusyId(t.id);
    try {
      const { data } = await api.post("/ai/breakdown", { task: t.title });
      await api.patch(`/tasks/${t.id}`, { microsteps: data.steps });
      toast.success("Broken into tiny steps ✨");
      load();
    } catch {
      toast.error("AI is resting. Try again in a moment.");
    } finally {
      setAiBusyId(null);
    }
  };

  const askEmpathy = async (t) => {
    setEmpathy({ task: t.title, message: "loading…" });
    try {
      const { data } = await api.post("/ai/empathy", { task: t.title });
      setEmpathy({ task: t.title, message: data.message });
    } catch {
      setEmpathy({ task: t.title, message: "Whatever you're feeling about this is valid. Try just opening the doc — that counts as starting." });
    }
  };

  const toggleStep = async (t, stepId) => {
    const newSteps = t.microsteps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
    await api.patch(`/tasks/${t.id}`, { microsteps: newSteps });
    load();
  };

  const visible = oneThing ? tasks.filter((t) => !t.completed).slice(0, 1) : tasks;

  return (
    <div className="p-6 md:p-12 max-w-4xl">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black">Brain dump</h1>
          <p className="text-[#D0C7DB] mt-1">Pour everything out. We'll make it small.</p>
        </div>
        <button
          data-testid="just-one-thing-btn"
          onClick={() => setOneThing((v) => !v)}
          className="ff-btn-ghost flex items-center gap-2 text-sm"
        >
          {oneThing ? <Eye size={16} /> : <EyeOff size={16} />}
          {oneThing ? "Show all" : "Just ONE thing"}
        </button>
      </div>

      <form onSubmit={add} className="ff-card p-5 my-6 flex flex-wrap gap-3 items-center" data-testid="new-task-form">
        <input
          data-testid="new-task-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="ff-input flex-1 min-w-[200px]"
          placeholder="what's on your mind?"
        />
        <div className="flex gap-1">
          {EMOJI_TAGS.map((t) => (
            <button
              type="button"
              key={t.e}
              data-testid={`emoji-${t.l}`}
              onClick={() => setTag(t.e)}
              className={`text-xl px-3 py-2 rounded-2xl ${tag === t.e ? "bg-[#FFD166]/20 ring-1 ring-[#FFD166]" : "bg-[#1A1625]/60"}`}
            >{t.e}</button>
          ))}
        </div>
        <button data-testid="add-task-btn" className="ff-btn-primary text-sm flex items-center gap-1">
          <Plus size={16} /> Add
        </button>
      </form>

      {empathy && (
        <div className="ff-card p-5 mb-6 border-l-4 border-[#E07A5F]" data-testid="empathy-card">
          <div className="flex items-center gap-2 text-[#E07A5F] font-bold mb-1"><Heart size={16} /> Soft response</div>
          <div className="text-sm text-[#D0C7DB] italic">"{empathy.message}"</div>
          <button onClick={() => setEmpathy(null)} className="text-xs text-[#8D829B] mt-2">close</button>
        </div>
      )}

      <ul className="space-y-3">
        {visible.length === 0 && (
          <li className="text-center text-[#8D829B] py-12 ff-card">
            All clear. Add a tiny task above ✨
          </li>
        )}
        {visible.map((t) => (
          <li key={t.id} data-testid={`task-${t.id}`} className="ff-card p-5">
            <div className="flex items-start gap-3">
              <button
                data-testid={`toggle-${t.id}`}
                onClick={() => toggle(t)}
                className={`h-7 w-7 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all ${
                  t.completed ? "bg-[#FFD166] border-[#FFD166]" : "border-[#8D829B] hover:border-[#FFD166]"
                }`}
                aria-label={t.completed ? "mark incomplete" : "mark complete"}
              >
                {t.completed && <span className="text-[#1A1625] font-black">✓</span>}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`flex items-center gap-2 ${t.completed ? "line-through text-[#8D829B]" : ""}`}>
                  <span className="text-xl">{t.emoji_tag || "📝"}</span>
                  <span className="font-bold truncate">{t.title}</span>
                </div>
                {t.microsteps && t.microsteps.length > 0 && (
                  <ul className="mt-3 space-y-1.5 ml-1" data-testid={`microsteps-${t.id}`}>
                    {t.microsteps.map((s) => (
                      <li key={s.id} className="flex items-center gap-2 text-sm text-[#D0C7DB]">
                        <button
                          onClick={() => toggleStep(t, s.id)}
                          className={`h-4 w-4 rounded border ${s.done ? "bg-[#45B69C] border-[#45B69C]" : "border-[#8D829B]"}`}
                        />
                        <span className={s.done ? "line-through text-[#8D829B]" : ""}>{s.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    data-testid={`ai-breakdown-${t.id}`}
                    disabled={aiBusyId === t.id}
                    onClick={() => aiBreakdown(t)}
                    className="text-xs ff-btn-ghost flex items-center gap-1 disabled:opacity-50"
                  >
                    <Sparkles size={12} /> {aiBusyId === t.id ? "thinking…" : "Break it down"}
                  </button>
                  <button
                    data-testid={`ai-empathy-${t.id}`}
                    onClick={() => askEmpathy(t)}
                    className="text-xs ff-btn-ghost flex items-center gap-1"
                  >
                    <Heart size={12} /> Why is this hard?
                  </button>
                </div>
              </div>
              <button
                data-testid={`delete-${t.id}`}
                onClick={() => remove(t)}
                className="text-[#8D829B] hover:text-[#E07A5F] p-2"
                aria-label="delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
