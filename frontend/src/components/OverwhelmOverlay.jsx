import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { X } from "lucide-react";

export default function OverwhelmOverlay({ onClose }) {
  const { t } = useTranslation();
  const [task, setTask] = useState(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    api.get("/overwhelm/next-tiny").then(({ data }) => setTask(data.task)).catch(() => {});
    const i = setInterval(() => setPhase((p) => (p + 1) % 3), 4000);
    return () => clearInterval(i);
  }, []);

  const cues = [t("overwhelm.breathe1"), t("overwhelm.breathe2"), t("overwhelm.breathe3")];

  return (
    <div
      data-testid="overwhelm-overlay"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6"
      style={{ background: "#0f0e1a" }}
    >
      <button
        data-testid="overwhelm-exit"
        onClick={onClose}
        className="absolute top-6 right-6 ff-btn-ghost text-sm flex items-center gap-1"
      >
        <X size={14} /> {t("overwhelm.exit")}
      </button>

      {/* Breathing circle */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center mb-10">
        <div className="absolute inset-0 rounded-full ff-breathe bg-gradient-to-br from-[#B19CD9]/30 via-[#45B69C]/15 to-[#FFD166]/15" />
        <div className="text-[#D0C7DB] text-lg sm:text-xl font-semibold tracking-wide text-center relative" data-testid="breathe-cue">
          {cues[phase]}
        </div>
      </div>

      <div className="max-w-lg text-center">
        <div className="ff-card p-6 mb-6">
          <div className="text-xs uppercase tracking-[0.2em] text-[#B19CD9] mb-2">one tiny thing</div>
          <div className="text-2xl font-extrabold" data-testid="overwhelm-task">
            {task ? task.title : t("overwhelm.fallback")}
          </div>
        </div>
        <p className="text-[#D0C7DB] leading-relaxed italic" data-testid="overwhelm-message">
          "{t("overwhelm.message")}"
        </p>
      </div>
    </div>
  );
}
