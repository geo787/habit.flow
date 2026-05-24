import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { Send, X, Sparkles } from "lucide-react";

export default function BlobChat() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    if (!input.trim() || busy) return;
    const userMsg = { role: "user", text: input.trim() };
    const newHist = [...messages, userMsg];
    setMessages(newHist);
    setInput("");
    setBusy(true);
    try {
      const { data } = await api.post("/blob/chat", { message: userMsg.text, history: messages });
      setMessages([...newHist, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages([...newHist, { role: "assistant", text: "I'm resting for a sec. Try again? 💛" }]);
    } finally {
      setBusy(false);
    }
  };

  // Open/close panel
  if (!user) return null;
  return (
    <>
      {!open && (
        <button
          data-testid="blob-fab"
          onClick={() => { setOpen(true); if (messages.length === 0) setMessages([{ role: "assistant", text: "Hi! How are you feeling? 💛" }]); }}
          title="Need to talk? I'm here 💛"
          className="fixed bottom-24 md:bottom-6 right-6 z-40 h-[52px] w-[52px] rounded-full bg-[#B19CD9] hover:bg-[#9C84CC] flex items-center justify-center shadow-2xl transition-all hover:scale-105"
          aria-label="Talk to Blob"
        >
          <Sparkles className="text-white" size={22} />
        </button>
      )}

      {open && (
        <div
          data-testid="blob-chat-panel"
          className="fixed bottom-24 md:bottom-6 right-6 z-40 ff-card overflow-hidden flex flex-col"
          style={{ width: 320, height: 380 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#3A3249]/40">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#B19CD9] flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="font-extrabold">Blob</div>
            </div>
            <button onClick={() => { setOpen(false); setMessages([]); }} data-testid="blob-close" className="text-[#8D829B]"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2" data-testid="blob-messages">
            {messages.slice(-6).map((m, i) => (
              <div key={i} className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${m.role === "user" ? "ml-auto bg-[#FFD166]/15 text-[#FDFCFD]" : "bg-[#1A1625]/60 text-[#D0C7DB]"}`}>
                {m.text}
              </div>
            ))}
            {busy && (
              <div className="bg-[#1A1625]/60 px-3 py-2 rounded-2xl text-sm text-[#8D829B] inline-flex gap-1" data-testid="blob-typing">
                <span className="ff-pulse-soft">●</span><span className="ff-pulse-soft" style={{animationDelay:'0.2s'}}>●</span><span className="ff-pulse-soft" style={{animationDelay:'0.4s'}}>●</span>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="p-2 border-t border-[#3A3249]/40 flex gap-1">
            <input
              data-testid="blob-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a feeling…"
              className="ff-input text-sm py-2 flex-1"
            />
            <button data-testid="blob-send" onClick={send} disabled={busy} className="ff-btn-primary px-3 py-2 disabled:opacity-50">
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
