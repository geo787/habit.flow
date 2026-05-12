import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Award, Flame, TrendingUp, Share2, Zap } from "lucide-react";
import ShareCard from "../components/ShareCard";

const allBadges = [
  { slug: "first_focus", name: "First Focus", emoji: "🌱" },
  { slug: "streak_5", name: "5-Day Streak", emoji: "🔥" },
  { slug: "streak_14", name: "Two Week Hero", emoji: "⭐" },
  { slug: "task_slayer", name: "Task Slayer", emoji: "⚔️" },
];

export default function ProgressPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [moods, setMoods] = useState([]);
  const [zone, setZone] = useState({ week_total_min: 0, week_count: 0, sessions: [] });
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    api.get("/progress/summary").then(({ data }) => setSummary(data));
    api.get("/mood").then(({ data }) => setMoods(data.slice(0, 14).reverse()));
    api.get("/hyperfocus/sessions").then(({ data }) => setZone(data)).catch(() => {});
  }, []);

  const earnedSlugs = new Set((summary?.badges || []).map((b) => b.slug));

  const zoneHours = Math.floor(zone.week_total_min / 60);
  const zoneMins = zone.week_total_min % 60;

  return (
    <div className="p-6 md:p-12 max-w-5xl">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black">{t("progress.title")}</h1>
          <p className="text-[#D0C7DB] mt-1">{t("progress.subtitle")}</p>
        </div>
        <button
          data-testid="share-week-btn"
          onClick={() => setShareOpen(true)}
          disabled={!user?.is_pro}
          title={!user?.is_pro ? "Pro feature" : ""}
          className={`ff-btn-primary text-sm flex items-center gap-2 ${!user?.is_pro ? "opacity-60" : ""}`}
        >
          <Share2 size={14} /> {t("progress.shareWeek")} {!user?.is_pro && "🔒"}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8 mt-8">
        <div className="ff-card p-6" data-testid="stat-streak">
          <div className="flex items-center gap-2 text-[#FFD166] mb-2"><Flame size={16} /><span className="text-xs uppercase tracking-widest">{t("progress.streak")}</span></div>
          <div className="text-3xl font-black">{summary?.streak ?? 0}</div>
          <div className="text-xs text-[#8D829B] mt-1">{t("progress.daysInRow")}</div>
        </div>
        <div className="ff-card p-6" data-testid="stat-sessions">
          <div className="flex items-center gap-2 text-[#45B69C] mb-2"><TrendingUp size={16} /><span className="text-xs uppercase tracking-widest">{t("progress.thisWeek")}</span></div>
          <div className="text-3xl font-black">{summary?.week_sessions ?? 0}</div>
          <div className="text-xs text-[#8D829B] mt-1">{t("progress.focusSessions")}</div>
        </div>
        <div className="ff-card p-6" data-testid="stat-tasks">
          <div className="flex items-center gap-2 text-[#B19CD9] mb-2"><Award size={16} /><span className="text-xs uppercase tracking-widest">{t("progress.totalWins")}</span></div>
          <div className="text-3xl font-black">{summary?.tasks_completed_total ?? 0}</div>
          <div className="text-xs text-[#8D829B] mt-1">{t("progress.tasksCompleted")}</div>
        </div>
      </div>

      {/* Zone sessions */}
      <div className="ff-card p-6 mb-8" data-testid="zone-card" style={{ background: "linear-gradient(135deg, rgba(127,119,221,0.10), transparent)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="text-[#7F77DD]" size={18} />
          <h2 className="font-extrabold text-xl">{t("progress.zoneSessions")}</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[#8D829B] uppercase tracking-widest">{t("progress.zoneTotalThisWeek")}</div>
            <div className="text-3xl font-black mt-1">{zoneHours}h {zoneMins}min</div>
          </div>
          <div>
            <div className="text-xs text-[#8D829B] uppercase tracking-widest">Sessions</div>
            <div className="text-3xl font-black mt-1">{zone.week_count}</div>
          </div>
        </div>
      </div>

      <div className="ff-card p-6 mb-8">
        <h2 className="font-extrabold text-xl mb-4">{t("progress.moodEnergy")}</h2>
        {moods.length === 0 ? (
          <div className="text-[#8D829B] text-sm">{t("progress.logMoodHint")}</div>
        ) : (
          <div className="flex items-end gap-2 h-40" data-testid="mood-chart">
            {moods.map((m) => (
              <div key={m.id} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-0.5">
                  <div className="bg-[#FFD166] rounded-t-md" style={{ height: `${m.mood * 14}px` }} />
                  <div className="bg-[#B19CD9]" style={{ height: `${m.energy * 10}px` }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-4 text-xs text-[#8D829B] mt-3">
          <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-[#FFD166]" /> mood</div>
          <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-[#B19CD9]" /> energy</div>
        </div>
      </div>

      <div className="ff-card p-6 mb-8">
        <h2 className="font-extrabold text-xl mb-4">{t("progress.badges")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="badges-grid">
          {allBadges.map((b) => {
            const earned = earnedSlugs.has(b.slug);
            return (
              <div key={b.slug} className={`p-4 rounded-2xl text-center ${earned ? "bg-[#FFD166]/15 ring-1 ring-[#FFD166]" : "bg-[#1A1625]/60 opacity-50"}`}>
                <div className="text-3xl mb-1">{b.emoji}</div>
                <div className="text-sm font-bold">{b.name}</div>
                <div className="text-xs text-[#8D829B] mt-1">{earned ? t("progress.earned") : t("progress.locked")}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="ff-card p-6 bg-gradient-to-br from-[#352D47] to-[#2A2438]">
        <div className="text-xs uppercase tracking-widest text-[#FFD166] mb-2">{t("progress.weeklyWrapped")}</div>
        <h2 className="text-2xl font-black mb-3">{t("progress.softSummary")}</h2>
        <p className="text-[#D0C7DB] leading-relaxed">
          {summary?.week_sessions || 0} focus sessions
          {summary?.avg_mood ? <>, mood <span className="text-[#FFD166] font-bold">{summary.avg_mood}/5</span></> : ""}
          {summary?.avg_energy ? <> and energy <span className="text-[#FFD166] font-bold">{summary.avg_energy}/5</span></> : ""}.
        </p>
      </div>

      {shareOpen && <ShareCard summary={summary} user={user} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
