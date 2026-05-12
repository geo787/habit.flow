import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { X } from "lucide-react";

const ENERGY_EMOJIS = ["😴", "💤", "😐", "⚡", "🔥"];

export default function MorningModal() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [energy, setEnergy] = useState(null);
  const [tasks, setTasks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await api.get("/morning/should-show");
        if (data.show) setOpen(true);
      } catch {}
    })();
  }, [user]);

  const pickEnergy = async (e) => {
    setEnergy(e);
    try {
      await api.post("/morning/energy", { energy: e });
      const { data } = await api.get("/tasks");
      const incomplete = data.filter((t) => !t.completed);
      const slice = e <= 2 ? incomplete.slice(0, 1) : e === 3 ? incomplete.slice(0, 2) : incomplete.slice(0, 3);
      setTasks(slice);
      setStep(2);
      await refresh();
    } catch {}
  };

  const dismiss = async () => {
    try { await api.post("/morning/dismiss"); } catch {}
    setOpen(false);
  };

  const goSprint = async () => {
    await dismiss();
    navigate("/focus");
  };

  if (!open) return null;

  const subtitleKey = energy <= 2 ? "morning.lowSubtitle" : energy === 3 ? "morning.mediumSubtitle" : "morning.onFireSubtitle";
  const intro = energy <= 2 ? t("morning.low") : energy >= 4 ? t("morning.onFire") : "";

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4" style={{ background: "rgba(15, 14, 26, 0.95)" }} data-testid="morning-modal">
      <div className="ff-card max-w-lg w-full p-7 sm:p-10 relative">
        <button onClick={dismiss} className="absolute top-4 right-4 text-[#8D829B]" data-testid="morning-dismiss" aria-label="dismiss">
          <X size={18} />
        </button>

        {step === 1 && (
          <>
            <h2 className="text-2xl sm:text-3xl font-black mb-2">{t("morning.title", { name: user?.name || "" })}</h2>
            <p className="text-[#D0C7DB] mb-6">{t("morning.energyQuestion")}</p>
            <div className="flex justify-between gap-2" data-testid="morning-energy-picker">
              {ENERGY_EMOJIS.map((e, i) => (
                <button
                  key={i}
                  data-testid={`morning-energy-${i + 1}`}
                  onClick={() => pickEnergy(i + 1)}
                  className="text-4xl p-3 rounded-2xl flex-1 hover:bg-[#352D47] transition-all"
                >
                  {e}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {intro && <div className="text-[#FFD166] font-extrabold text-lg mb-1">{intro}</div>}
            <p className="text-[#D0C7DB] mb-5">{t(subtitleKey)}</p>
            <ul className="space-y-2 mb-6" data-testid="morning-task-list">
              {tasks.length === 0 ? (
                <li className="text-[#8D829B] text-sm">{t("morning.lowRest")}</li>
              ) : tasks.map((task) => (
                <li key={task.id} className="ff-card p-3 flex items-center gap-2 bg-[#1A1625]/60">
                  <span className="text-xl">{task.emoji_tag || "📝"}</span>
                  <span className="truncate">{task.title}</span>
                </li>
              ))}
            </ul>
            {energy <= 2 && <p className="text-sm text-[#8D829B] italic mb-5">{t("morning.lowRest")}</p>}
            <p className="text-[#D0C7DB] mb-5">{t("morning.ready")}</p>
            <div className="flex flex-wrap gap-2">
              <button data-testid="morning-begin" onClick={goSprint} className="ff-btn-primary">
                {t("morning.beginSprint")}
              </button>
              <button data-testid="morning-skip" onClick={dismiss} className="ff-btn-ghost text-sm">
                {t("morning.skip")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
