import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, Copy, X } from "lucide-react";
import FocusBuddy from "./FocusBuddy";

export default function ShareCard({ summary, user, onClose }) {
  const { t } = useTranslation();
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const totalFocusMin = summary?.week_sessions ? summary.week_sessions * (user?.focus_length || 15) : 0;
  const hours = Math.floor(totalFocusMin / 60);
  const mins = totalFocusMin % 60;
  const lvl = summary?.level_info || user?.level_info || { level: 1, title: "Getting Started" };

  const render = async () => {
    if (!cardRef.current) return null;
    return await html2canvas(cardRef.current, {
      backgroundColor: "#1a1830",
      scale: 2,
      useCORS: true,
    });
  };

  const download = async () => {
    setBusy(true);
    try {
      const canvas = await render();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = "focusflow-week.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Saved 💛");
    } catch {
      toast.error("Could not generate image");
    } finally { setBusy(false); }
  };

  const copy = async () => {
    setBusy(true);
    try {
      const canvas = await render();
      if (!canvas) return;
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          toast.success("Copied to clipboard ✨");
        } catch {
          toast.error("Clipboard not supported");
        }
      });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(15, 14, 26, 0.92)" }} data-testid="share-modal">
      <div className="max-w-3xl w-full">
        <button data-testid="share-close" onClick={onClose} className="ff-btn-ghost text-xs flex items-center gap-1 mb-3 ml-auto">
          <X size={14} /> close
        </button>

        {/* Renderable card */}
        <div
          ref={cardRef}
          data-testid="share-card"
          style={{
            width: 800,
            height: 450,
            background: "#1a1830",
            color: "#FDFCFD",
            position: "relative",
            overflow: "hidden",
            fontFamily: "Nunito, sans-serif",
            margin: "0 auto",
            maxWidth: "100%",
          }}
          className="rounded-3xl"
        >
          {/* glow */}
          <div style={{ position: "absolute", top: -120, left: -100, width: 320, height: 320, borderRadius: "50%", background: "rgba(250,199,117,0.18)", filter: "blur(60px)" }} />
          <div style={{ position: "absolute", bottom: -100, right: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(177,156,217,0.18)", filter: "blur(60px)" }} />

          {/* Top left logo */}
          <div style={{ position: "absolute", top: 32, left: 36, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "#FAC775", color: "#1a1830", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>✦</div>
            <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>FocusFlow</div>
          </div>

          {/* Center stats */}
          <div style={{ position: "absolute", top: 110, left: 36, right: 280, color: "#FDFCFD" }}>
            <div style={{ fontSize: 12, color: "#8D829B", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>my week on focusflow</div>
            <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.05, marginBottom: 18, color: "#FAC775" }}>
              {summary?.tasks_completed_total || 0} tasks done
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
              ⏱  {hours}h {mins}min focus
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
              🔥 {summary?.streak || 0}-day streak
            </div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              ⭐ Level {lvl.level} — {lvl.title}
            </div>
          </div>

          {/* Right: Blob */}
          <div style={{ position: "absolute", right: 60, top: "50%", transform: "translateY(-50%)" }}>
            <FocusBuddy size={180} />
          </div>

          {/* Footer */}
          <div style={{ position: "absolute", bottom: 24, left: 36, fontSize: 12, color: "#8D829B" }}>focusflow.app</div>
        </div>

        <div className="flex gap-3 justify-center mt-4">
          <button data-testid="share-download" disabled={busy} onClick={download} className="ff-btn-primary text-sm flex items-center gap-2">
            <Download size={14} /> {t("progress.downloadPng")}
          </button>
          <button data-testid="share-copy" disabled={busy} onClick={copy} className="ff-btn-ghost text-sm flex items-center gap-2">
            <Copy size={14} /> {t("progress.copyImage")}
          </button>
        </div>
      </div>
    </div>
  );
}
