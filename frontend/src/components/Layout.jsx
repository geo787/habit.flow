import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Home, Timer, ListTodo, Users, Trophy, ShoppingBag, Settings, LogOut, Sparkles } from "lucide-react";

const links = [
  { to: "/dashboard", label: "Home", Icon: Home, testid: "nav-dashboard" },
  { to: "/focus", label: "Focus", Icon: Timer, testid: "nav-focus" },
  { to: "/tasks", label: "Tasks", Icon: ListTodo, testid: "nav-tasks" },
  { to: "/body-double", label: "Body Double", Icon: Users, testid: "nav-body-double" },
  { to: "/progress", label: "Progress", Icon: Trophy, testid: "nav-progress" },
  { to: "/shop", label: "Shop", Icon: ShoppingBag, testid: "nav-shop" },
  { to: "/settings", label: "Settings", Icon: Settings, testid: "nav-settings" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col gap-1 p-6 sticky top-0 h-screen border-r border-[#3A3249]/40 bg-[#1A1625]/60 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-8" data-testid="logo">
          <div className="h-10 w-10 rounded-2xl bg-[#FFD166] flex items-center justify-center shadow-lg shadow-[#FFD166]/30">
            <Sparkles className="text-[#1A1625]" size={22} />
          </div>
          <div>
            <div className="font-extrabold text-lg leading-none">FocusFlow</div>
            <div className="text-xs text-[#8D829B]">a warm hug</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map(({ to, label, Icon, testid }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  isActive
                    ? "bg-[#2A2438] text-[#FFD166] font-bold"
                    : "text-[#D0C7DB] hover:bg-[#2A2438]/60"
                }`
              }
            >
              <Icon size={18} />
              <span className="text-sm">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <div className="ff-card p-4 mb-3">
            <div className="text-xs text-[#8D829B] mb-1">Hello,</div>
            <div className="flex items-center gap-2">
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
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 pb-24 md:pb-12">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#1A1625]/90 backdrop-blur-xl border-t border-[#3A3249]/60 px-2 py-2 flex justify-around">
        {links.slice(0, 5).map(({ to, label, Icon, testid }) => (
          <NavLink
            key={to}
            to={to}
            data-testid={`m-${testid}`}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl text-[10px] ${
                isActive ? "text-[#FFD166]" : "text-[#8D829B]"
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
