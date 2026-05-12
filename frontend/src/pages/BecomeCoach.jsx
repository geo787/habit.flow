import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function BecomeCoach() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", credentials: "", specialty: "", calendly_url: "" });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!agree) return;
    setBusy(true);
    try {
      await api.post("/coaches/apply", { ...form, agree_fee: agree });
      setDone(true);
      toast.success(t("coaches.applySuccess"));
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not submit");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="p-6 md:p-12 max-w-2xl text-center">
        <div className="ff-card p-10">
          <div className="text-5xl mb-3">💛</div>
          <h2 className="text-2xl font-black mb-2">{t("coaches.applySuccess")}</h2>
          <Link to="/coaches" className="ff-btn-ghost mt-6 inline-block">← {t("coaches.title")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-2xl">
      <Link to="/coaches" className="text-sm text-[#8D829B] mb-4 inline-block hover:text-[#FFD166]">← {t("coaches.title")}</Link>
      <h1 className="text-3xl sm:text-4xl font-black mb-2">{t("coaches.applyTitle")}</h1>
      <p className="text-[#D0C7DB] mb-8">{t("coaches.applySubtitle")}</p>

      <form onSubmit={submit} className="space-y-4" data-testid="coach-apply-form">
        {[
          { k: "name", l: t("coaches.yourName") },
          { k: "email", l: t("auth.email"), type: "email" },
          { k: "credentials", l: t("coaches.credentials") },
          { k: "specialty", l: t("coaches.specialty") },
          { k: "calendly_url", l: t("coaches.calendlyUrl"), type: "url" },
        ].map((f) => (
          <div key={f.k}>
            <label className="text-sm text-[#D0C7DB] mb-1 block">{f.l}</label>
            <input
              data-testid={`coach-${f.k}`}
              required
              type={f.type || "text"}
              className="ff-input"
              value={form[f.k]}
              onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
            />
          </div>
        ))}
        <label className="flex items-start gap-2 text-sm text-[#D0C7DB] cursor-pointer">
          <input
            data-testid="coach-agree"
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-1 accent-[#FFD166]"
          />
          <span>{t("coaches.agreeFee")}</span>
        </label>
        <button
          data-testid="coach-submit"
          disabled={!agree || busy}
          className="ff-btn-primary disabled:opacity-50"
        >
          {busy ? "…" : t("coaches.apply")}
        </button>
      </form>
    </div>
  );
}
