import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { celebrate } from "../components/Confetti";
import { Pause, Play, RotateCcw, X, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const SOUND_URLS = {
  "lofi": "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
  "rain": "https://cdn.pixabay.com/audio/2022/03/10/audio_270f29b14a.mp3",
  "white-noise": "https://cdn.pixabay.com/audio/2021/08/09/audio_dc39bede17.mp3",
  "silence": null,
};
const SOUNDS = Object.keys(SOUND_URLS);

export default function FocusPage() {
  const { user, refresh } = useAuth();
  const initial = (user?.focus_length || 15) * 60;
  const [duration, setDuration] = useState(initial);
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(false);
  const [sound, setSound] = useState(user?.settings?.sound || "lofi");
  const [volume, setVolume] = useState(0.4);
  const [muted, setMuted] = useState(false);
  const intRef = useRef(null);
  const audioRef = useRef(null);
  const navigate = useNavigate();

  // Cleanup on unmount: stop timer + audio
  useEffect(() => () => {
    clearInterval(intRef.current);
    stopAudio();
  }, []);

  // Audio source/volume management
  useEffect(() => {
    const url = SOUND_URLS[sound];
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }
    const a = audioRef.current;
    if (!url) {
      a.pause();
      a.removeAttribute("src");
      return;
    }
    if (a.src !== url) {
      a.src = url;
      a.load();
    }
    a.volume = muted ? 0 : volume;
    if (running) a.play().catch(() => {});
  }, [sound, running, volume, muted]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Timer
  useEffect(() => {
    if (!running) {
      if (audioRef.current) audioRef.current.pause();
      return;
    }
    if (audioRef.current && SOUND_URLS[sound]) {
      audioRef.current.play().catch(() => {});
    }
    intRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intRef.current);
          setRunning(false);
          stopAudio();
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
    } catch (e) {
      if (e?.response?.status === 402) {
        toast.error(e.response.data.detail || "Free tier limit reached");
      } else {
        toast.error("Could not save session");
      }
    }
  };

  const reset = () => {
    clearInterval(intRef.current);
    setRunning(false);
    stopAudio();
    setRemaining(duration);
  };

  const setMins = (m) => {
    const s = m * 60;
    setDuration(s);
    setRemaining(s);
  };

  const exitToDash = () => {
    if (running) finishSession(false);
    stopAudio();
    navigate("/dashboard");
  };

  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");
  const pct = 1 - remaining / duration;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative">
      <button
        data-testid="exit-focus-btn"
        onClick={exitToDash}
        className="absolute top-6 right-6 ff-btn-ghost text-sm flex items-center gap-1"
      >
        <X size={16} /> Exit
      </button>

      <div className="text-xs text-[#8D829B] uppercase tracking-[0.2em] mb-6" data-testid="focus-status">
        {running ? "Breathe in… breathe out…" : "Choose your sprint"}
      </div>

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

      {/* sound picker */}
      <div className="flex flex-wrap gap-2 justify-center mb-4" data-testid="sound-picker">
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

      {/* volume slider */}
      {sound !== "silence" && (
        <div className="flex items-center gap-3 ff-card px-4 py-2.5 max-w-xs w-full" data-testid="volume-control">
          <button
            data-testid="volume-mute"
            onClick={() => setMuted((m) => !m)}
            className="text-[#D0C7DB] hover:text-[#FFD166]"
            aria-label={muted ? "unmute" : "mute"}
          >
            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            data-testid="volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }}
            className="flex-1 accent-[#FFD166]"
          />
          <span className="text-xs text-[#8D829B] w-8 text-right">{Math.round((muted ? 0 : volume) * 100)}%</span>
        </div>
      )}
    </div>
  );
}
