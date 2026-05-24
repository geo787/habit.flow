import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { Copy, Users } from "lucide-react";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function Settings() {
  const { t } = useTranslation();
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
      toast.success(t("settings.saved"));
    } catch {
      toast.error("Could not save");
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-2xl">
      <h1 className="text-3xl sm:text-4xl font-black mb-2">{t("settings.title")}</h1>
      <p className="text-[#D0C7DB] mb-8">{t("settings.subtitle")}</p>

      <div className="space-y-4">
        <Toggle label={t("settings.reduceMotion")} desc={t("settings.reduceMotionDesc")} testid="toggle-reduce-motion" value={reduceMotion} onChange={setReduceMotion} />
        <Toggle label={t("settings.highContrast")} desc={t("settings.highContrastDesc")} testid="toggle-high-contrast" value={highContrast} onChange={setHighContrast} />

        <div className="ff-card p-5">
          <div className="font-bold mb-2">{t("settings.defaultFocus")}</div>
          <div className="flex flex-wrap gap-2">
            {[10, 15, 25, 45].map((m) => (
              <button
                key={m}
                data-testid={`set-focus-${m}`}
                onClick={() => setFocusLength(m)}
                className={`px-5 py-2 rounded-full ${focusLength === m ? "bg-[#FFD166] text-[#1A1625] font-extrabold" : "ff-btn-ghost"}`}
              >{m} {t("common.minutes")}</button>
            ))}
          </div>
        </div>

        <div className="ff-card p-5">
          <div className="font-bold mb-2">{t("settings.defaultSound")}</div>
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

        <div className="ff-card p-5" data-testid="settings-language">
          <div className="font-bold mb-1">{t("settings.language")}</div>
          <div className="text-sm text-[#8D829B] mb-4">{t("settings.languageDesc")}</div>
          <LanguageSwitcher compact={false} />
        </div>

        <ReferralCard />

        <button data-testid="save-settings" onClick={save} className="ff-btn-primary">{t("settings.saveChanges")}</button>
      </div>
    </div>
  );
}

function ReferralCard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/referral/stats").then(({ data }) => setStats(data)); }, []);
  if (!stats?.code) return null;
  const link = `${window.location.origin}/?ref=${stats.code}`;
  const text = `Try FocusFlow — productivity that feels like a warm hug. ${link}`;
  const progress = Math.min(1, stats.count / stats.target);
  return (
    <div className="ff-card p-5" data-testid="settings-referral">
      <div className="flex items-center gap-2 mb-1"><Users size={16} className="text-[#FFD166]" /><div className="font-bold">Invite Friends</div></div>
      <div className="text-sm text-[#8D829B] mb-4">Share FocusFlow. You both get XP.</div>
      <div className="flex items-center gap-2 mb-3">
        <input data-testid="referral-link" readOnly value={link} className="ff-input flex-1 text-xs" />
        <button data-testid="copy-referral" onClick={() => { navigator.clipboard?.writeText(link); toast.success("Copied 💛"); }} className="ff-btn-ghost text-xs">
          <Copy size={12} />
        </button>
      </div>
      <div className="text-xs text-[#D0C7DB] mb-2" data-testid="referral-stats">{stats.count} friends invited · {stats.count} joined</div>
      <div className="h-2 bg-[#1A1625] rounded-full overflow-hidden mb-1">
        <div className="h-full bg-[#FFD166]" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="text-[10px] text-[#8D829B] mb-3">{stats.count}/{stats.target} for 1 free Pro month</div>
      <div className="flex gap-2 flex-wrap">
        <a data-testid="share-wa" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`} className="ff-btn-ghost text-xs">WhatsApp</a>
        <a data-testid="share-li" target="_blank" rel="noopener noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`} className="ff-btn-ghost text-xs">LinkedIn</a>
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
