import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Keyboard, X } from "lucide-react";

const SHORTCUTS = [
  { key: "B", desc: "Focus brain dump input" },
  { key: "T", desc: "Open new task" },
  { key: "F", desc: "Go to focus page" },
  { key: "?", desc: "Show this overlay" },
  { key: "Space", desc: "Start/pause timer (on /focus)" },
  { key: "Esc", desc: "Exit / close overlay" },
  { key: "Enter", desc: "Save task (when typing)" },
];

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      // Ignore when user is typing in inputs/textarea
      const tag = (e.target?.tagName || "").toLowerCase();
      const editing = tag === "input" || tag === "textarea" || e.target?.isContentEditable;
      if (e.key === "?" && e.shiftKey) { setOpen(true); e.preventDefault(); return; }
      if (e.key === "Escape" && open) { setOpen(false); return; }
      if (editing) return;
      if (e.key === "b" || e.key === "B") {
        const el = document.querySelector("[data-testid='new-task-input']");
        if (el) { el.focus(); e.preventDefault(); }
        else navigate("/tasks");
      }
      if (e.key === "t" || e.key === "T") { navigate("/tasks"); }
      if (e.key === "f" || e.key === "F") { navigate("/focus"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, navigate]);

  return (
    <>
      <button
        data-testid="kbd-help-btn"
        onClick={() => setOpen(true)}
        title="Keyboard shortcuts"
        aria-label="keyboard shortcuts"
        className="fixed bottom-24 md:bottom-6 left-6 z-30 h-8 w-8 rounded-full bg-[#2A2438]/80 border border-[#3A3249] flex items-center justify-center text-[#8D829B] hover:text-[#FFD166]"
      >
        <Keyboard size={14} />
      </button>

      {open && (
        <div
          data-testid="kbd-overlay"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(15, 14, 26, 0.85)" }}
          onClick={() => setOpen(false)}
        >
          <div className="ff-card p-7 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-xl">Keyboard shortcuts</h3>
              <button onClick={() => setOpen(false)} className="text-[#8D829B]"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SHORTCUTS.map((s) => (
                <div key={s.key} className="flex items-center gap-3">
                  <kbd className="px-2.5 py-1 rounded-md bg-[#1A1625] border border-[#3A3249] text-xs font-bold min-w-[40px] text-center">{s.key}</kbd>
                  <span className="text-sm text-[#D0C7DB]">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
