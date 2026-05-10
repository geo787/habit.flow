import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Award, Flame, TrendingUp } from "lucide-react";

const allBadges = [
  { slug: "first_focus", name: "First Focus", emoji: "🌱" },
  { slug: "streak_5", name: "5-Day Streak", emoji: "🔥" },
  { slug: "streak_14", name: "Two Week Hero", emoji: "⭐" },
  { slug: "task_slayer", name: "Task Slayer", emoji: "⚔️" },
];

export default function ProgressPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [moods, setMoods] = useState([]);

  useEffect(() => {
    api.get("/progress/summary").then(({ data }) => setSummary(data));
    api.get("/mood").then(({ data }) => setMoods(data.slice(0, 14).reverse()));
  }, []);

  const earnedSlugs = new Set((summary?.badges || []).map((b) => b.slug));

  return (
    <div className="p-6 md:p-12 max-w-5xl">
      <h1 className="text-3xl sm:text-4xl font-black mb-2">Your progress</h1>
      <p className="text-[#D0C7DB] mb-8">Look how far you've come — gently and with care.</p>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="ff-card p-6" data-testid="stat-streak">
          <div className="flex items-center gap-2 text-[#FFD166] mb-2"><Flame size={16} /><span className="text-xs uppercase tracking-widest">Streak</span></div>
          <div className="text-3xl font-black">{summary?.streak ?? 0}</div>
          <div className="text-xs text-[#8D829B] mt-1">days in a row</div>
        </div>
        <div className="ff-card p-6" data-testid="stat-sessions">
          <div className="flex items-center gap-2 text-[#45B69C] mb-2"><TrendingUp size={16} /><span className="text-xs uppercase tracking-widest">This week</span></div>
          <div className="text-3xl font-black">{summary?.week_sessions ?? 0}</div>
          <div className="text-xs text-[#8D829B] mt-1">focus sessions</div>
        </div>
        <div className="ff-card p-6" data-testid="stat-tasks">
          <div className="flex items-center gap-2 text-[#B19CD9] mb-2"><Award size={16} /><span className="text-xs uppercase tracking-widest">Total wins</span></div>
          <div className="text-3xl font-black">{summary?.tasks_completed_total ?? 0}</div>
          <div className="text-xs text-[#8D829B] mt-1">tasks completed</div>
        </div>
      </div>

      {/* Mood chart */}
      <div className="ff-card p-6 mb-8">
        <h2 className="font-extrabold text-xl mb-4">Mood & energy</h2>
        {moods.length === 0 ? (
          <div className="text-[#8D829B] text-sm">Log a mood to see your wave grow.</div>
        ) : (
          <div className="flex items-end gap-2 h-40" data-testid="mood-chart">
            {moods.map((m) => (
              <div key={m.id} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-0.5">
                  <div
                    className="bg-[#FFD166] rounded-t-md"
                    style={{ height: `${m.mood * 14}px` }}
                    title={`mood ${m.mood}`}
                  />
                  <div
                    className="bg-[#B19CD9]"
                    style={{ height: `${m.energy * 10}px` }}
                    title={`energy ${m.energy}`}
                  />
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

      {/* Badges */}
      <div className="ff-card p-6 mb-8">
        <h2 className="font-extrabold text-xl mb-4">Badges</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="badges-grid">
          {allBadges.map((b) => {
            const earned = earnedSlugs.has(b.slug);
            return (
              <div
                key={b.slug}
                className={`p-4 rounded-2xl text-center ${earned ? "bg-[#FFD166]/15 ring-1 ring-[#FFD166]" : "bg-[#1A1625]/60 opacity-50"}`}
              >
                <div className="text-3xl mb-1">{b.emoji}</div>
                <div className="text-sm font-bold">{b.name}</div>
                <div className="text-xs text-[#8D829B] mt-1">{earned ? "earned" : "locked"}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly wrapped */}
      <div className="ff-card p-6 bg-gradient-to-br from-[#352D47] to-[#2A2438]">
        <div className="text-xs uppercase tracking-widest text-[#FFD166] mb-2">This week wrapped</div>
        <h2 className="text-2xl font-black mb-3">A soft summary</h2>
        <p className="text-[#D0C7DB] leading-relaxed">
          You completed <span className="text-[#FFD166] font-bold">{summary?.week_sessions || 0}</span> focus sessions
          {summary?.avg_mood ? <>, with average mood <span className="text-[#FFD166] font-bold">{summary.avg_mood}/5</span></> : ""}
          {summary?.avg_energy ? <> and energy <span className="text-[#FFD166] font-bold">{summary.avg_energy}/5</span></> : ""}.
          That's a beautiful week, no matter what your brain says.
        </p>
      </div>
    </div>
  );
}
