import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Star, Users } from "lucide-react";
import { api } from "../lib/api";

function StarRow({ rating }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < Math.round(rating) ? "text-[#FFD166] fill-[#FFD166]" : "text-[#3A3249]"}
          fill={i < Math.round(rating) ? "#FFD166" : "transparent"}
        />
      ))}
    </div>
  );
}

export default function Coaches() {
  const { t } = useTranslation();
  const [coaches, setCoaches] = useState([]);

  useEffect(() => {
    api.get("/coaches").then(({ data }) => setCoaches(data.coaches));
  }, []);

  return (
    <div className="p-6 md:p-12 max-w-5xl">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-2">
            <Users className="text-[#B19CD9]" /> {t("coaches.title")}
          </h1>
          <p className="text-[#D0C7DB] mt-1">{t("coaches.subtitle")}</p>
        </div>
        <Link to="/become-a-coach" data-testid="become-coach-link" className="ff-btn-ghost text-sm">
          {t("coaches.becomeCoach")}
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mt-8">
        {coaches.map((c) => (
          <div key={c.id} data-testid={`coach-${c.id}`} className="ff-card p-6 hover:bg-[#352D47] transition-all">
            <div className="flex items-start gap-4 mb-4">
              <div className="text-5xl">{c.avatar || "🌿"}</div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-lg">{c.name}</div>
                <div className="text-sm text-[#D0C7DB] mt-0.5">{c.specialty}</div>
                <div className="mt-2"><StarRow rating={c.rating || 4} /></div>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-2xl font-black text-[#FFD166]">${c.price_per_session}</span>
                <span className="text-xs text-[#8D829B]">{t("coaches.perSession")}</span>
              </div>
              <a
                href={c.calendly_url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`book-${c.id}`}
                className="ff-btn-primary text-sm"
              >
                {t("coaches.bookSession")}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
