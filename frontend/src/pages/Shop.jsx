import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { celebrate } from "../components/Confetti";

export default function Shop() {
  const [items, setItems] = useState([]);
  const { user, refresh } = useAuth();

  const load = () => api.get("/shop/items").then(({ data }) => setItems(data));
  useEffect(() => { load(); }, []);

  const buy = async (id) => {
    try {
      await api.post("/shop/purchase", { item_id: id });
      celebrate();
      toast.success("Treat yourself! 🎁");
      await refresh();
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not purchase");
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-5xl">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black">Reward shop</h1>
          <p className="text-[#D0C7DB] mt-1">Spend XP on tiny treats. You earned them.</p>
        </div>
        <div className="ff-card px-5 py-3" data-testid="shop-balance">
          <div className="text-xs text-[#8D829B]">Your balance</div>
          <div className="font-extrabold text-[#FFD166] text-xl">{user?.xp || 0} XP</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {items.map((it) => (
          <div key={it.id} data-testid={`shop-${it.id}`} className="ff-card p-6">
            <div className="text-5xl mb-3">{it.icon}</div>
            <div className="font-extrabold text-lg">{it.name}</div>
            <div className="text-xs text-[#8D829B] capitalize mt-0.5">{it.kind}</div>
            <div className="flex items-center justify-between mt-5">
              <div className="text-[#FFD166] font-extrabold">{it.cost} XP</div>
              {it.owned ? (
                <span className="text-xs px-3 py-1.5 rounded-full bg-[#45B69C]/20 text-[#45B69C]">owned</span>
              ) : (
                <button
                  data-testid={`buy-${it.id}`}
                  onClick={() => buy(it.id)}
                  disabled={(user?.xp || 0) < it.cost}
                  className="ff-btn-primary text-xs disabled:opacity-40"
                >
                  Buy
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
