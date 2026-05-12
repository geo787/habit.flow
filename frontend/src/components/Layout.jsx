import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import LanguageSwitcher from "./LanguageSwitcher";
import { Home, Timer, ListTodo, Users, Trophy, ShoppingBag, Settings, LogOut, Sparkles, UserCheck, Calendar } from "lucide-react";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const links = [
    { to: "/dashboard", labelKey: "nav.home", Icon: Home, testid: "nav-dashboard" },
    { to: "/focus", labelKey: "nav.focus", Icon: Timer, testid: "nav-focus" },
    { to: "/tasks", labelKey: "nav.tasks", Icon: ListTodo, testid: "nav-tasks" },
    { to: "/body-double", labelKey: "nav.bodyDouble", Icon: Users, testid: "nav-body-double" },
    { to: "/coaches", labelKey: "nav.coaches", Icon: UserCheck, testid: "nav-coaches" },
    { to: "/progress", labelKey: "nav.progress", Icon: Trophy, testid: "nav-progress" },
    { to: "/shop", labelKey: "nav.shop", Icon: ShoppingBag, testid: "nav-shop" },
    { to: "/planner", labelKey: "nav.planner", Icon: Calendar, testid: "nav-planner" },
    { to: "/settings", labelKey: "nav.settings", Icon: Settings, testid: "nav-settings" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="hidden md:flex md:w-64 flex-col gap-1 p-6 sticky top-0 h-screen border-r border-[#3A3249]/40 bg-[#1A1625]/60 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2" data-testid="logo">
            <div className="h-10 w-10 rounded-2xl bg-[#FFD166] flex items-center justify-center shadow-lg shadow-[#FFD166]/30">
              <Sparkles className="text-[#1A1625]" size={22} />
            </div>
            <div>
              <div className="font-extrabold text-lg leading-none">FocusFlow</div>
              <div className="text-xs text-[#8D829B]">a warm hug</div>
            </div>
          </div>
          <LanguageSwitcher compact />
        </div>
        <nav className="flex flex-col gap-1 overflow-y-auto">
          {links.map(({ to, labelKey, Icon, testid }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all ${
                  isActive ? "bg-[#2A2438] text-[#FFD166] font-bold" : "text-[#D0C7DB] hover:bg-[#2A2438]/60"
                }`
              }
            >
              <Icon size={18} />
              <span className="text-sm">{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-3">
          <div className="ff-card p-4 mb-3">
            <div className="text-xs text-[#8D829B] mb-1">Hello,</div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-bold truncate" data-testid="user-name">{user?.name}</div>
              {user?.is_pro && (
                <span data-testid="pro-badge" className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFD166] text-[#1A1625] font-extrabold">PRO</span>
              )}
            </div>
            <div className="text-xs text-[#D0C7DB]">Lvl {user?.level_info?.level} · {user?.xp} XP</div>
          </div>
          <button
            data-testid="logout-btn"
            onClick={() => { logout(); navigate("/"); }}
            className="ff-btn-ghost flex items-center gap-2 text-sm w-full justify-center"
          >
            <LogOut size={16} /> {t("nav.signOut")}
          </button>
        </div>
      </aside>

      {/* Mobile top bar with lang switch */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#1A1625]/90 backdrop-blur-xl border-b border-[#3A3249]/40">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-[#FFD166] flex items-center justify-center">
            <Sparkles className="text-[#1A1625]" size={16} />
          </div>
          <div className="font-extrabold">FocusFlow</div>
          {user?.is_pro && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FFD166] text-[#1A1625] font-extrabold">PRO</span>}
        </div>
        <LanguageSwitcher compact />
      </div>

      <main className="flex-1 min-w-0 pb-24 md:pb-12">{children}</main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#1A1625]/90 backdrop-blur-xl border-t border-[#3A3249]/60 px-2 py-2 flex justify-around">
        {links.slice(0, 5).map(({ to, labelKey, Icon, testid }) => (
          <NavLink
            key={to}
            to={to}
            data-testid={`m-${testid}`}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-2 rounded-2xl text-[10px] ${isActive ? "text-[#FFD166]" : "text-[#8D829B]"}`
            }
          >
            <Icon size={18} />
            <span>{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
