import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { LANGUAGES } from "../i18n";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function LanguageSwitcher({ compact = true }) {
  const { i18n } = useTranslation();
  const { user, refresh } = useAuth();
  const [open, setOpen] = useState(false);

  const change = async (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem("ff_lang", code);
    setOpen(false);
    if (user) {
      try {
        await api.patch("/me/language", { language: code });
        await refresh();
      } catch {}
    }
  };

  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  if (!compact) {
    // Full list (used in Settings)
    return (
      <div className="space-y-2" data-testid="language-switcher-full">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            data-testid={`lang-${l.code}`}
            onClick={() => change(l.code)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
              i18n.language === l.code
                ? "bg-[#FFD166]/15 border-[#FFD166] text-[#FDFCFD]"
                : "bg-[#1A1625]/60 border-[#3A3249] text-[#D0C7DB] hover:bg-[#352D47]"
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl">{l.flag}</span>
              <span className="font-bold">{l.name}</span>
            </span>
            {i18n.language === l.code && <Check className="text-[#FFD166]" size={18} />}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative" data-testid="language-switcher">
      <button
        data-testid="lang-toggle"
        onClick={() => setOpen((v) => !v)}
        className="ff-btn-ghost flex items-center gap-2 text-xs"
        aria-label="language"
      >
        <Globe size={14} />
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-40 ff-card p-2 min-w-[180px]" data-testid="lang-menu">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                data-testid={`lang-menu-${l.code}`}
                onClick={() => change(l.code)}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm ${
                  i18n.language === l.code ? "bg-[#FFD166]/15 text-[#FFD166]" : "hover:bg-[#352D47]"
                }`}
              >
                <span className="text-lg">{l.flag}</span>
                <span>{l.name}</span>
                {i18n.language === l.code && <Check size={14} className="ml-auto" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
