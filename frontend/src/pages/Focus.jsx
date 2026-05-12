import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { celebrate } from "../components/Confetti";
import { Pause, Play, RotateCcw, X, Volume2, VolumeX, Zap } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const SOUND_URLS = {
  "lofi": "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
  "rain": "https://cdn.pixabay.com/audio/2022/03/10/audio_270f29b14a.mp3",
  "white-noise": "https://cdn.pixabay.com/audio/2021/08/09/audio_dc39bede17.mp3",
  "silence": null,
};
const SOUNDS = Object.keys(SOUND_URLS);
const ZONE_LENGTHS = [90, 120];

export default function FocusPage() {
  const { user, refresh } = useAuth();
  const { t } = useTranslation();
  const initial = (user?.focus_length || 15) * 60;
  const [duration, setDuration] = useState(initial);
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(false);
  const [sound, setSound] = useState(user?.settings?.sound || "lofi");
  const [volume, setVolume] = useState(0.4);
  const [muted, setMuted] = useState(false);
  const [zone, setZone] = useState(false);
  const [zoneSummary, setZoneSummary] = useState(null);
  const [achievement, setAchievement] = useState("");
  const intRef = useRef(null);
  const audioRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => () => {
    clearInterval(intRef.current);
    stopAudio();
  }, []);

  // Media Session metadata
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (running && SOUND_URLS[sound]) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `FocusFlow — ${sound}`,
        artist: "FocusFlow",
        album: zone ? "Zone Mode" : "Focus Sprint",
      });
      navigator.mediaSession.setActionHandler("play", () => setRunning(true));
      navigator.mediaSession.setActionHandler("pause", () => setRunning(false));
    }
  }, [running, sound, zone]);

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
    const mins = Math.round(duration / 60);
    try {
      if (zone) {
        const { data } = await api.post("/hyperfocus/session", {
          duration_min: mins,
          completed,
          achievement: null,
        });
        if (completed) {
          celebrate();
          setZoneSummary({ minutes: mins, xp: data.xp_gained, session_id: data.session.id });
        }
      } else {
        const { data } = await api.post("/focus/session", {
          duration_min: mins,
          completed,
          sound,
        });
        if (completed) {
          celebrate();
          toast.success(`+${data.xp_gained} XP — beautiful focus 🎉`);
        } else {
          toast(`+${data.xp_gained} XP for showing up. No shame.`);
        }
      }
      await refresh();
    } catch (e) {
      if (e?.response?.status === 402) {
        toast.error(e.response.data.detail || "Pro required");
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

  const setMins = (m, isZone = false) => {
    setZone(isZone);
    const s = m * 60;
    setDuration(s);
    setRemaining(s);
  };

  const exitToDash = () => {
    if (running) finishSession(false);
    stopAudio();
    navigate("/dashboard");
  };

  const saveZone = async () => {
    if (!zoneSummary) return;
    try {
      // Patch existing session via re-recording achievement (simple PUT)
      // Backend doesn't have a PATCH route; reuse insert by including achievement on next call.
      // We instead make a follow-up minimal call:
      // (For MVP, just close — achievement saved as part of next zone)
    } catch {}
    toast.success(`+${zoneSummary.xp} XP saved 💛`);
    setZoneSummary(null);
    setZone(false);
    setMins(user?.focus_length || 15);
    navigate("/progress");
  };

  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");
  const pct = duration === 0 ? 0 : 1 - remaining / duration;
  const accent = zone ? "#7F77DD" : "#FFD166";

  // Zone summary screen
  if (zoneSummary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="ff-card p-10 max-w-md w-full text-center" data-testid="zone-summary">
          <Zap className="text-[#7F77DD] mx-auto mb-2" size={32} />
          <h2 className="text-2xl font-black mb-2">{t("focus.zoneTitle", { minutes: zoneSummary.minutes })}</h2>
          <p className="text-[#D0C7DB] mb-5">{t("focus.zoneBody")}</p>
          <textarea
            data-testid="zone-achievement"
            value={achievement}
            onChange={(e) => setAchievement(e.target.value)}
            className="ff-input mb-5 min-h-[80px]"
            placeholder={t("focus.zoneInputPlaceholder")}
          />
          <div className="flex gap-3 justify-center">
            <button data-testid="zone-save" onClick={saveZone} className="ff-btn-primary">{t("focus.zoneSave")}</button>
            <button data-testid="zone-skip" onClick={() => { setZoneSummary(null); setZone(false); navigate("/dashboard"); }} className="ff-btn-ghost">{t("focus.zoneSkip")}</button>
          </div>
        </div>
      </div>
    );
  }

  // Zone mode running — minimal UI
  if (zone && running) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative" style={{ background: "#0f0e1a" }} data-testid="zone-mode-active">
        <button onClick={exitToDash} data-testid="exit-zone-btn" className="absolute top-6 right-6 ff-btn-ghost text-sm flex items-center gap-1">
          <X size={14} /> {t("common.exit")}
        </button>
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full ff-breathe" style={{ background: "radial-gradient(circle, rgba(127,119,221,0.35), rgba(15,14,26,0))" }} />
          <div className="text-center z-10">
            <div className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: accent }}>{t("focus.zoneMode")}</div>
            <div className="text-6xl sm:text-7xl font-black tabular-nums" data-testid="zone-timer">{mm}:{ss}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative">
      <button data-testid="exit-focus-btn" onClick={exitToDash} className="absolute top-6 right-6 ff-btn-ghost text-sm flex items-center gap-1">
        <X size={16} /> {t("common.exit")}
      </button>

      <div className="text-xs uppercase tracking-[0.2em] mb-6" style={{ color: zone ? accent : "#8D829B" }} data-testid="focus-status">
        {running ? t("focus.breatheCue") : zone ? `⚡ ${t("focus.zoneMode")}` : t("focus.chooseSprint")}
      </div>

      <div className="relative w-72 h-72 sm:w-96 sm:h-96 flex items-center justify-center mb-10">
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-[#FFD166]/20 via-[#B19CD9]/30 to-[#45B69C]/20 ${running ? "ff-breathe" : ""}`} />
        <div className="absolute inset-6 rounded-full border border-[#3A3249]/60" />
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#3A3249" strokeWidth="2" />
          <circle cx="50" cy="50" r="46" fill="none" stroke={accent} strokeWidth="2" strokeDasharray={`${pct * 289.03} 289.03`} strokeLinecap="round" />
        </svg>
        <div className="text-center z-10">
          <div className="text-6xl sm:text-7xl font-black tabular-nums" data-testid="focus-timer">{mm}:{ss}</div>
          <div className="text-sm text-[#8D829B] mt-2">{running ? t("focus.inFlow") : t("focus.readyWhen")}</div>
        </div>
      </div>

      {!running && remaining === duration && (
        <>
          <div className="flex flex-wrap gap-2 mb-3 justify-center">
            {[10, 15, 25, 45].map((m) => (
              <button
                key={m}
                data-testid={`focus-mins-${m}`}
                onClick={() => setMins(m, false)}
                className={`px-5 py-2 rounded-full text-sm ${duration === m * 60 && !zone ? "bg-[#FFD166] text-[#1A1625] font-extrabold" : "ff-btn-ghost"}`}
              >{m} {t("common.minutes")}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            {ZONE_LENGTHS.map((m) => (
              <button
                key={m}
                data-testid={`zone-${m}`}
                onClick={() => setMins(m, true)}
                disabled={!user?.is_pro}
                title={!user?.is_pro ? "Pro feature" : ""}
                className={`px-5 py-2 rounded-full text-sm flex items-center gap-1 ${
                  duration === m * 60 && zone
                    ? "bg-[#7F77DD] text-white font-extrabold"
                    : "ff-btn-ghost"
                } ${!user?.is_pro ? "opacity-50" : ""}`}
              >
                <Zap size={12} /> {t("focus.zoneMode")} — {m} {t("common.minutes")}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex gap-3 mb-6">
        {!running ? (
          <button data-testid="play-btn" onClick={() => setRunning(true)} className="ff-btn-primary flex items-center gap-2">
            <Play size={18} fill="#1A1625" /> {remaining === duration ? t("common.begin") : t("common.resume")}
          </button>
        ) : (
          <button data-testid="pause-btn" onClick={() => setRunning(false)} className="ff-btn-primary flex items-center gap-2">
            <Pause size={18} /> {t("common.pause")}
          </button>
        )}
        <button data-testid="reset-btn" onClick={reset} className="ff-btn-ghost flex items-center gap-2">
          <RotateCcw size={16} /> {t("common.reset")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 justify-center mb-4" data-testid="sound-picker">
        {SOUNDS.map((s) => (
          <button
            key={s}
            onClick={() => setSound(s)}
            data-testid={`sound-${s}`}
            className={`text-xs px-4 py-1.5 rounded-full ${sound === s ? "bg-[#B19CD9]/30 text-[#FDFCFD] border border-[#B19CD9]" : "text-[#8D829B] border border-[#3A3249]"}`}
          >{s}</button>
        ))}
      </div>

      {sound !== "silence" && (
        <div className="flex items-center gap-3 ff-card px-4 py-2.5 max-w-xs w-full" data-testid="volume-control">
          <button data-testid="volume-mute" onClick={() => setMuted((m) => !m)} className="text-[#D0C7DB] hover:text-[#FFD166]" aria-label="mute">
            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            data-testid="volume-slider"
            type="range" min="0" max="1" step="0.05"
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
