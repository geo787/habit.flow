import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import FocusBuddy from "../components/FocusBuddy";
import { toast } from "sonner";

const struggleOptions = [
  { id: "starting", label: "Starting tasks", emoji: "🚀" },
  { id: "focus", label: "Staying focused", emoji: "🎯" },
  { id: "memory", label: "Remembering things", emoji: "🧠" },
  { id: "all", label: "All of the above", emoji: "🤝" },
];

const buddies = [
  { id: "blob", label: "Blob", desc: "soft & cheerful" },
  { id: "cat", label: "Cat", desc: "calm & curious" },
  { id: "fox", label: "Fox", desc: "clever & cozy" },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [struggles, setStruggles] = useState([]);
  const [focusLength, setFocusLength] = useState(15);
  const [buddy, setBuddy] = useState("blob");
  const [notifications, setNotifications] = useState(false);
  const [firstTask, setFirstTask] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const toggle = (id) =>
    setStruggles((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const finish = async () => {
    setSaving(true);
    try {
      await api.post("/auth/onboarding", { struggles, focus_length: focusLength, buddy, notifications });
      if (firstTask.trim()) {
        await api.post("/tasks", { title: firstTask.trim(), emoji_tag: "⚡" });
        await api.post("/mood", { mood: 4, energy: 3 });
      }
      await refresh();
      toast.success("You're all set. Tiny win unlocked! 🎉");
      navigate("/dashboard");
    } catch (e) {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      title: "What feels hardest right now?",
      sub: "Pick anything that fits. We'll keep this gentle.",
      content: (
        <div className="grid grid-cols-2 gap-3 max-w-md">
          {struggleOptions.map((o) => (
            <button
              key={o.id}
              data-testid={`struggle-${o.id}`}
              onClick={() => toggle(o.id)}
              className={`ff-card p-5 text-left transition-all ${
                struggles.includes(o.id) ? "ring-2 ring-[#FFD166]" : "hover:bg-[#352D47]"
              }`}
            >
              <div className="text-2xl mb-2">{o.emoji}</div>
              <div className="font-bold">{o.label}</div>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "How long should a focus sprint be?",
      sub: "You can change this later, no pressure.",
      content: (
        <div className="flex flex-wrap gap-3 max-w-md">
          {[10, 15, 25, 45].map((m) => (
            <button
              key={m}
              data-testid={`focus-${m}`}
              onClick={() => setFocusLength(m)}
              className={`px-6 py-4 rounded-3xl border ${
                focusLength === m
                  ? "bg-[#FFD166] text-[#1A1625] border-transparent font-extrabold"
                  : "ff-card hover:bg-[#352D47]"
              }`}
            >
              {m} min
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Pick a focus buddy",
      sub: "Your tiny companion that cheers you on.",
      content: (
        <div className="grid grid-cols-3 gap-3 max-w-md">
          {buddies.map((b) => (
            <button
              key={b.id}
              data-testid={`buddy-${b.id}`}
              onClick={() => setBuddy(b.id)}
              className={`ff-card p-5 text-center ${buddy === b.id ? "ring-2 ring-[#FFD166]" : ""}`}
            >
              <div className="flex justify-center mb-2"><FocusBuddy size={64} /></div>
              <div className="font-bold">{b.label}</div>
              <div className="text-xs text-[#8D829B]">{b.desc}</div>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Want gentle nudges?",
      sub: "Soft reminders, never alarms. You can turn this off any time.",
      content: (
        <div className="flex gap-3">
          <button
            data-testid="notif-yes"
            onClick={() => setNotifications(true)}
            className={`px-6 py-4 rounded-3xl ${notifications ? "bg-[#FFD166] text-[#1A1625] font-extrabold" : "ff-card"}`}
          >
            Yes please ✨
          </button>
          <button
            data-testid="notif-no"
            onClick={() => setNotifications(false)}
            className={`px-6 py-4 rounded-3xl ${!notifications ? "bg-[#FFD166] text-[#1A1625] font-extrabold" : "ff-card"}`}
          >
            Not right now
          </button>
        </div>
      ),
    },
    {
      title: "What's one tiny thing on your mind?",
      sub: "Anything. We'll add it as your first task. Quick win unlocked.",
      content: (
        <input
          data-testid="onboarding-first-task"
          className="ff-input max-w-md"
          placeholder="reply to that one email…"
          value={firstTask}
          onChange={(e) => setFirstTask(e.target.value)}
        />
      ),
    },
  ];

  const cur = steps[step];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2 mb-8" data-testid="onboarding-progress">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all ${i <= step ? "bg-[#FFD166]" : "bg-[#3A3249]"}`}
            />
          ))}
        </div>
        <h1 className="text-3xl sm:text-4xl font-black mb-2" data-testid="onboarding-title">{cur.title}</h1>
        <p className="text-[#D0C7DB] mb-8">{cur.sub}</p>
        <div className="mb-10">{cur.content}</div>
        <div className="flex gap-3">
          {step > 0 && (
            <button data-testid="onboarding-back" onClick={() => setStep(step - 1)} className="ff-btn-ghost">Back</button>
          )}
          {step < steps.length - 1 ? (
            <button data-testid="onboarding-next" onClick={() => setStep(step + 1)} className="ff-btn-primary">Next</button>
          ) : (
            <button data-testid="onboarding-finish" disabled={saving} onClick={finish} className="ff-btn-primary">
              {saving ? "Saving…" : "Begin my flow ✨"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
