import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Smartphone } from "lucide-react";

export default function PWAInstallBanner() {
  const { t } = useTranslation();
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const visits = parseInt(localStorage.getItem("ff_visit_count") || "0", 10) + 1;
    localStorage.setItem("ff_visit_count", String(visits));
    const dismissedAt = parseInt(localStorage.getItem("ff_pwa_dismissed_at") || "0", 10);
    const dismissedRecent = dismissedAt && (Date.now() - dismissedAt) < 7 * 24 * 60 * 60 * 1000;

    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
      if (visits >= 3 && !dismissedRecent) {
        setShow(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferred) { setShow(false); return; }
    deferred.prompt();
    await deferred.userChoice;
    setShow(false);
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem("ff_pwa_dismissed_at", String(Date.now()));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      data-testid="pwa-banner"
      className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 ff-card p-4 max-w-sm w-[92%] flex items-center gap-3 shadow-2xl"
    >
      <Smartphone className="text-[#FFD166] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{t("pwa.installTitle")}</div>
        <div className="text-xs text-[#D0C7DB]">{t("pwa.installBody")}</div>
      </div>
      <button onClick={install} data-testid="pwa-install" className="ff-btn-primary text-xs">
        {t("pwa.install")}
      </button>
      <button onClick={dismiss} data-testid="pwa-dismiss" className="text-[#8D829B]" aria-label="dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
