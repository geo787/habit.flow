import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export default function Settings() {
  const { user, refresh } = useAuth();
  const [reduceMotion, setReduceMotion] = useState(user?.settings?.reduce_motion || false);
  const [highContrast, setHighContrast] = useState(user?.settings?.high_contrast || false);
  const [focusLength, setFocusLength] = useState(user?.focus_length || 15);
  const [sound, setSound] = useState(user?.settings?.sound || "lofi");

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [reduceMotion]);

  const save = async () => {
    try {
      await api.patch("/settings", {
        reduce_motion: reduceMotion,
        high_contrast: highContrast,
        focus_length: focusLength,
        sound,
      });
      await refresh();
      toast.success("Saved gently 💛");
    } catch {
      toast.error("Could not save");
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-2xl">
      <h1 className="text-3xl sm:text-4xl font-black mb-2">Settings</h1>
      <p className="text-[#D0C7DB] mb-8">Make this app feel like yours.</p>

      <div className="space-y-4">
        <Toggle label="Reduce motion" desc="Calmer animations everywhere." testid="toggle-reduce-motion" value={reduceMotion} onChange={setReduceMotion} />
        <Toggle label="High contrast" desc="Boost readability for tired eyes." testid="toggle-high-contrast" value={highContrast} onChange={setHighContrast} />

        <div className="ff-card p-5">
          <div className="font-bold mb-2">Default focus length</div>
          <div className="flex flex-wrap gap-2">
            {[10, 15, 25, 45].map((m) => (
              <button
                key={m}
                data-testid={`set-focus-${m}`}
                onClick={() => setFocusLength(m)}
                className={`px-5 py-2 rounded-full ${focusLength === m ? "bg-[#FFD166] text-[#1A1625] font-extrabold" : "ff-btn-ghost"}`}
              >{m} min</button>
            ))}
          </div>
        </div>

        <div className="ff-card p-5">
          <div className="font-bold mb-2">Default sound</div>
          <div className="flex flex-wrap gap-2">
            {["lofi", "rain", "white-noise", "silence"].map((s) => (
              <button
                key={s}
                data-testid={`set-sound-${s}`}
                onClick={() => setSound(s)}
                className={`px-5 py-2 rounded-full ${sound === s ? "bg-[#B19CD9] text-[#1A1625] font-extrabold" : "ff-btn-ghost"}`}
              >{s}</button>
            ))}
          </div>
        </div>

        <button data-testid="save-settings" onClick={save} className="ff-btn-primary">Save changes</button>
      </div>
    </div>
  );
}

function Toggle({ label, desc, value, onChange, testid }) {
  return (
    <div className="ff-card p-5 flex items-center justify-between">
      <div>
        <div className="font-bold">{label}</div>
        <div className="text-sm text-[#8D829B]">{desc}</div>
      </div>
      <button
        data-testid={testid}
        onClick={() => onChange(!value)}
        className={`h-8 w-14 rounded-full transition-all ${value ? "bg-[#FFD166]" : "bg-[#3A3249]"}`}
        aria-pressed={value}
      >
        <div className={`h-6 w-6 rounded-full bg-white transition-all ${value ? "translate-x-7" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
