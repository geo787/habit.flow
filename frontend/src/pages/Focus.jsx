import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { celebrate } from "../components/Confetti";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const SOUNDS = ["lofi", "rain", "white-noise", "silence"];

export default function FocusPage() {
  const { user, refresh } = useAuth();
  const initial = (user?.focus_length || 15) * 60;
  const [duration, setDuration] = useState(initial);
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(false);
  const [sound, setSound] = useState(user?.settings?.sound || "lofi");
  const intRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => () => clearInterval(intRef.current), []);

  useEffect(() => {
    if (!running) return;
    intRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intRef.current);
          setRunning(false);
          finishSession(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intRef.current);
  }, [running]);

  const finishSession = async (completed) => {
    try {
      const { data } = await api.post("/focus/session", {
        duration_min: Math.round(duration / 60),
        completed,
        sound,
      });
      if (completed) {
        celebrate();
        toast.success(`+${data.xp_gained} XP — beautiful focus 🎉`);
      } else {
        toast(`+${data.xp_gained} XP for showing up. No shame.`);
      }
      await refresh();
    } catch {
      toast.error("Could not save session");
    }
  };

  const reset = () => {
    clearInterval(intRef.current);
    setRunning(false);
    setRemaining(duration);
  };

  const setMins = (m) => {
    const s = m * 60;
    setDuration(s);
    setRemaining(s);
  };

  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");
  const pct = 1 - remaining / duration;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative">
      <button
        data-testid="exit-focus-btn"
        onClick={() => { if (running) finishSession(false); navigate("/dashboard"); }}
        className="absolute top-6 right-6 ff-btn-ghost text-sm flex items-center gap-1"
      >
        <X size={16} /> Exit
      </button>

      <div className="text-xs text-[#8D829B] uppercase tracking-[0.2em] mb-6" data-testid="focus-status">
        {running ? "Breathe in… breathe out…" : "Choose your sprint"}
      </div>

      {/* Breathing circle */}
      <div className="relative w-72 h-72 sm:w-96 sm:h-96 flex items-center justify-center mb-10">
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-[#FFD166]/20 via-[#B19CD9]/30 to-[#45B69C]/20 ${running ? "ff-breathe" : ""}`} />
        <div className="absolute inset-6 rounded-full border border-[#3A3249]/60" />
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#3A3249" strokeWidth="2" />
          <circle
            cx="50" cy="50" r="46" fill="none"
            stroke="#FFD166" strokeWidth="2"
            strokeDasharray={`${pct * 289.03} 289.03`}
            strokeLinecap="round"
          />
        </svg>
        <div className="text-center z-10">
          <div className="text-6xl sm:text-7xl font-black tabular-nums" data-testid="focus-timer">{mm}:{ss}</div>
          <div className="text-sm text-[#8D829B] mt-2">{running ? "in flow" : "ready when you are"}</div>
        </div>
      </div>

      {/* duration picker */}
      {!running && remaining === duration && (
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {[10, 15, 25, 45].map((m) => (
            <button
              key={m}
              data-testid={`focus-mins-${m}`}
              onClick={() => setMins(m)}
              className={`px-5 py-2 rounded-full text-sm ${duration === m * 60 ? "bg-[#FFD166] text-[#1A1625] font-extrabold" : "ff-btn-ghost"}`}
            >
              {m} min
            </button>
          ))}
        </div>
      )}

      {/* controls */}
      <div className="flex gap-3 mb-6">
        {!running ? (
          <button data-testid="play-btn" onClick={() => setRunning(true)} className="ff-btn-primary flex items-center gap-2">
            <Play size={18} fill="#1A1625" /> {remaining === duration ? "Begin" : "Resume"}
          </button>
        ) : (
          <button data-testid="pause-btn" onClick={() => setRunning(false)} className="ff-btn-primary flex items-center gap-2">
            <Pause size={18} /> Pause
          </button>
        )}
        <button data-testid="reset-btn" onClick={reset} className="ff-btn-ghost flex items-center gap-2">
          <RotateCcw size={16} /> Reset
        </button>
      </div>

      {/* sound */}
      <div className="flex flex-wrap gap-2 justify-center" data-testid="sound-picker">
        {SOUNDS.map((s) => (
          <button
            key={s}
            onClick={() => setSound(s)}
            data-testid={`sound-${s}`}
            className={`text-xs px-4 py-1.5 rounded-full ${sound === s ? "bg-[#B19CD9]/30 text-[#FDFCFD] border border-[#B19CD9]" : "text-[#8D829B] border border-[#3A3249]"}`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
