import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { toast } from "sonner";

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function weekDates() {
  const today = new Date();
  const dayIdx = (today.getDay() + 6) % 7; // 0=Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayIdx);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export default function Planner() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const dates = weekDates();
  const todayIso = new Date().toISOString().slice(0, 10);
  const yesterdayIso = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();

  const load = async () => {
    const { data } = await api.get("/planner/week");
    setTasks(data.tasks);
  };
  useEffect(() => { load(); }, []);

  const onDragStart = (e, taskId) => {
    e.dataTransfer.setData("text/plain", taskId);
  };

  const onDrop = async (e, date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    try {
      await api.patch(`/tasks/${taskId}`, { scheduled_date: date });
      toast.success("Moved 💛");
      load();
    } catch {
      toast.error("Could not move");
    }
  };

  const onDropUnschedule = async (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    try {
      await api.patch(`/tasks/${taskId}`, { scheduled_date: null });
      load();
    } catch {}
  };

  const allow = (e) => e.preventDefault();

  const unscheduled = tasks.filter((t) => !t.scheduled_date && !t.completed);

  const tasksForDay = (date) => {
    let inDay = tasks.filter((t) => t.scheduled_date === date && !t.completed);
    // Rollover: if today, also show yesterday's uncompleted
    if (date === todayIso) {
      const rolled = tasks
        .filter((t) => t.scheduled_date === yesterdayIso && !t.completed)
        .map((t) => ({ ...t, rolled: true }));
      inDay = [...rolled, ...inDay];
    }
    return inDay.slice(0, 3);
  };

  return (
    <div className="p-6 md:p-12">
      <h1 className="text-3xl sm:text-4xl font-black mb-2">{t("planner.title")}</h1>
      <p className="text-[#D0C7DB] mb-8">{t("planner.subtitle")}</p>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Unscheduled */}
        <div
          className="ff-card p-4"
          onDrop={onDropUnschedule}
          onDragOver={allow}
          data-testid="planner-unscheduled"
        >
          <div className="font-extrabold mb-3 text-[#B19CD9]">{t("planner.unscheduled")}</div>
          {unscheduled.length === 0 && <div className="text-xs text-[#8D829B]">—</div>}
          <ul className="space-y-2">
            {unscheduled.map((task) => (
              <li
                key={task.id}
                draggable
                onDragStart={(e) => onDragStart(e, task.id)}
                data-testid={`u-task-${task.id}`}
                className="bg-[#1A1625]/60 border border-[#3A3249]/50 rounded-2xl p-3 cursor-grab text-sm flex items-center gap-2"
              >
                <span>{task.emoji_tag || "📝"}</span>
                <span className="truncate">{task.title}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Days */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {DAY_KEYS.map((dayKey, i) => {
            const date = dates[i];
            const items = tasksForDay(date);
            const isToday = date === todayIso;
            return (
              <div
                key={dayKey}
                onDrop={(e) => onDrop(e, date)}
                onDragOver={allow}
                data-testid={`planner-day-${dayKey}`}
                className={`ff-card p-3 min-h-[180px] ${isToday ? "ring-1 ring-[#FFD166]/60" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs uppercase tracking-widest text-[#8D829B]">{t(`planner.${dayKey}`)}</div>
                  {isToday && <div className="text-[10px] text-[#FFD166] font-bold">{t("planner.today")}</div>}
                </div>
                {items.length === 0 ? (
                  <div className="text-[10px] text-[#8D829B] italic mt-2">{t("planner.noTasks")}</div>
                ) : (
                  <ul className="space-y-2">
                    {items.map((task) => (
                      <li
                        key={task.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, task.id)}
                        className={`bg-[#1A1625]/60 border rounded-xl p-2 text-xs cursor-grab ${task.rolled ? "border-[#E07A5F]/40" : "border-[#3A3249]/50"}`}
                      >
                        <div className="flex items-center gap-1">
                          <span>{task.emoji_tag || "📝"}</span>
                          <span className="truncate">{task.title}</span>
                        </div>
                        {task.rolled && (
                          <div className="text-[9px] text-[#E07A5F] mt-1">{t("planner.rolledOver")}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
