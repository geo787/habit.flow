import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { celebrate } from "../components/Confetti";
import { toast } from "sonner";
import { Users, Pause, Play, Share2 } from "lucide-react";

export default function BodyDouble() {
  const [rooms, setRooms] = useState([]);
  const [active, setActive] = useState(null);
  const [remaining, setRemaining] = useState(15 * 60);
  const [running, setRunning] = useState(false);
  const [buddyName, setBuddyName] = useState(null);
  const [inviteCode, setInviteCode] = useState(null);
  const intRef = useRef(null);
  const { refresh } = useAuth();
  const [params] = useSearchParams();

  useEffect(() => {
    api.get("/body-double/rooms").then(({ data }) => {
      setRooms(data.rooms);
      // Handle invite URL: /body-double?room=ID&invite=true
      const roomId = params.get("room");
      if (roomId) {
        const r = data.rooms.find((x) => x.id === roomId);
        if (r) joinRoom(r);
      }
    });
    return () => clearInterval(intRef.current);
  }, []);

  useEffect(() => {
    if (!running) return;
    intRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intRef.current);
          setRunning(false);
          finish();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intRef.current);
  }, [running]);

  const finish = async () => {
    try {
      const { data } = await api.post("/focus/session", {
        duration_min: 15,
        completed: true,
        body_doubling: true,
      });
      celebrate();
      toast.success(`+${data.xp_gained} XP for co-working 🎉${buddyName ? " (+25 Focus Buddy bonus)" : ""}`);
      await refresh();
      setActive(null);
      setBuddyName(null);
      setInviteCode(null);
    } catch {
      toast.error("Could not save session");
    }
  };

  const joinRoom = (room) => {
    setActive(room);
    setRemaining(15 * 60);
    setRunning(true);
  };

  const join = (room) => joinRoom(room);

  const generateInvite = async () => {
    if (!active) return;
    try {
      const { data } = await api.post("/body-double/invite", { room_id: active.id });
      const link = `${window.location.origin}/body-double?room=${active.id}&invite=${data.invite_code}`;
      navigator.clipboard?.writeText(link);
      setInviteCode(data.invite_code);
      toast.success("Invite link copied! Share it with a friend 💛");
    } catch {
      toast.error("Could not generate invite");
    }
  };

  if (active) {
    const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
    const ss = (remaining % 60).toString().padStart(2, "0");
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-xs uppercase tracking-[0.2em] text-[#8D829B] mb-3">in room</div>
        <h1 className="text-3xl font-black mb-1">{active.name}</h1>
        <div className="text-[#D0C7DB] mb-8">{active.vibe}</div>

        <div className="ff-card p-12 mb-6 relative">
          <div className="absolute inset-0 rounded-3xl bg-[#45B69C]/5 blur-2xl ff-pulse-soft" />
          <div className="text-7xl font-black tabular-nums relative" data-testid="bd-timer">{mm}:{ss}</div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6 justify-center" data-testid="bd-presence">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 w-10 rounded-full border-2 border-[#45B69C]/60 ff-pulse-soft"
              style={{ background: ["#FFD166", "#B19CD9", "#45B69C", "#89B4FA"][i % 4] + "55", animationDelay: `${i * 0.4}s` }} />
          ))}
        </div>
        {buddyName ? (
          <div className="text-sm text-[#FFD166] mb-6">You're focusing with {buddyName} 🎯</div>
        ) : (
          <div className="text-sm text-[#8D829B] mb-6">{(active.live || 200).toLocaleString()} silent companions • no chat, no video</div>
        )}

        <div className="flex gap-3 flex-wrap justify-center">
          <button data-testid="bd-toggle" onClick={() => setRunning((r) => !r)} className="ff-btn-primary flex items-center gap-2">
            {running ? <><Pause size={18} /> Pause</> : <><Play size={18} fill="#1A1625" /> Resume</>}
          </button>
          <button data-testid="bd-invite" onClick={generateInvite} className="ff-btn-ghost flex items-center gap-2">
            <Share2 size={14} /> {inviteCode ? "Link copied ✨" : "Invite a friend"}
          </button>
          <button data-testid="bd-leave" onClick={() => { setRunning(false); setActive(null); setBuddyName(null); }} className="ff-btn-ghost">Leave gently</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-5xl">
      <h1 className="text-3xl sm:text-4xl font-black mb-2">Body doubling rooms</h1>
      <p className="text-[#D0C7DB] mb-8 max-w-2xl">No video, no chat — just quiet company. Drop in, get cozy, focus together.</p>

      <div className="grid md:grid-cols-2 gap-5">
        {rooms.map((r) => (
          <div key={r.id} data-testid={`room-${r.id}`} className="ff-card p-6 hover:bg-[#352D47] transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-extrabold text-xl">{r.name}</h3>
                <div className="text-sm text-[#D0C7DB] mt-1">{r.vibe}</div>
              </div>
              <div className="ff-pulse-soft text-[#45B69C] flex items-center gap-1 text-sm">
                <Users size={14} /> {r.live.toLocaleString()}
              </div>
            </div>
            <button data-testid={`join-${r.id}`} onClick={() => join(r)} className="ff-btn-primary text-sm">Join silently</button>
          </div>
        ))}
      </div>
    </div>
  );
}
