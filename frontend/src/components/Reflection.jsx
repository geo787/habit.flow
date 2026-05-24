import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { X } from "lucide-react";

const CHALLENGES = [
  { id: "starting", emoji: "😰", label: "Starting tasks" },
  { id: "focus", emoji: "🌀", label: "Staying focused" },
  { id: "energy", emoji: "😔", label: "Low energy" },
  { id: "distractions", emoji: "🔇", label: "Too many distractions" },
  { id: "other", emoji: "😤", label: "Something else" },
];

export default function Reflection({ onClose }) {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const [step, setStep] = useState(1);
  const [accomplishments, setAccomplishments] = useState("");
  const [challenges, setChallenges] = useState([]);
  const [other, setOther] = useState("");
  const [endMood, setEndMood] = useState(3);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const toggle = (id) => setChallenges((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post("/reflections", {
        accomplishments,
        challenges,
        challenges_other: other || null,
        end_mood: endMood,
      });
      await refresh();
      toast.success("+10 XP — soft win 💛");
      onClose();
      navigate("/progress");
    } catch {
      toast.error("Could not save");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4" style={{ background: "rgba(15, 14, 26, 0.95)" }} data-testid="reflection-modal">
      <div className="ff-card max-w-lg w-full p-7 sm:p-10 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#8D829B]" data-testid="reflection-close" aria-label="close"><X size={18} /></button>
        <div className="flex gap-2 mb-6" data-testid="reflection-progress">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-[#FFD166]" : "bg-[#3A3249]"}`} />
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 className="text-2xl font-black mb-2">What did you accomplish today?</h2>
            <p className="text-[#D0C7DB] mb-5 text-sm">Even tiny things count.</p>
            <textarea
              data-testid="reflection-accomplishments"
              value={accomplishments}
              onChange={(e) => setAccomplishments(e.target.value)}
              className="ff-input min-h-[120px] mb-6"
              placeholder="I opened the document. I sent one email."
            />
            <button data-testid="reflection-next-1" onClick={() => setStep(2)} disabled={!accomplishments.trim()} className="ff-btn-primary disabled:opacity-50">Next</button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-2xl font-black mb-2">What felt hard today?</h2>
            <p className="text-[#D0C7DB] mb-5 text-sm">Pick whatever fits.</p>
            <div className="space-y-2 mb-4" data-testid="reflection-challenges">
              {CHALLENGES.map((c) => (
                <button
                  key={c.id}
                  data-testid={`challenge-${c.id}`}
                  onClick={() => toggle(c.id)}
                  className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 border transition-all ${challenges.includes(c.id) ? "bg-[#FFD166]/15 border-[#FFD166]" : "border-[#3A3249] hover:bg-[#352D47]"}`}
                >
                  <span className="text-xl">{c.emoji}</span>
                  <span className="text-sm">{c.label}</span>
                </button>
              ))}
            </div>
            {challenges.includes("other") && (
              <input data-testid="reflection-other" value={other} onChange={(e) => setOther(e.target.value)} placeholder="Tell us…" className="ff-input mb-4" />
            )}
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="ff-btn-ghost">Back</button>
              <button data-testid="reflection-next-2" onClick={() => setStep(3)} className="ff-btn-primary">Next</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-2xl font-black mb-2">How do you feel right now?</h2>
            <div className="flex justify-between gap-2 my-6">
              {["😩", "😕", "😐", "🙂", "🔥"].map((e, i) => (
                <button
                  key={i}
                  data-testid={`reflection-mood-${i + 1}`}
                  onClick={() => setEndMood(i + 1)}
                  className={`text-3xl p-3 rounded-2xl flex-1 ${endMood === i + 1 ? "bg-[#FFD166]/20 ring-2 ring-[#FFD166]" : "hover:bg-[#352D47]"}`}
                >{e}</button>
              ))}
            </div>
            <p className="text-[#D0C7DB] italic text-sm mb-5">"Tomorrow is a new start. You showed up today. That's everything. 💛"</p>
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="ff-btn-ghost">Back</button>
              <button data-testid="reflection-finish" disabled={busy} onClick={submit} className="ff-btn-primary disabled:opacity-50">{busy ? "…" : "Finish reflection · +10 XP"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
