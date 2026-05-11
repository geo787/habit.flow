import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { celebrate } from "../components/Confetti";
import { Sparkles, Zap, X } from "lucide-react";

const PACK_STYLES = {
  yellow: { ring: "ring-[#FFD166]", bg: "from-[#FFD166]/15", icon: "text-[#FFD166]" },
  teal:   { ring: "ring-[#45B69C]", bg: "from-[#45B69C]/15", icon: "text-[#45B69C]" },
  purple: { ring: "ring-[#B19CD9]", bg: "from-[#B19CD9]/15", icon: "text-[#B19CD9]" },
};

export default function Shop() {
  const [items, setItems] = useState([]);
  const [boosters, setBoosters] = useState([]);
  const [modalPack, setModalPack] = useState(null);
  const [busy, setBusy] = useState(false);
  const { user, refresh } = useAuth();

  const load = async () => {
    const [a, b] = await Promise.all([
      api.get("/shop/items"),
      api.get("/shop/boosters"),
    ]);
    setItems(a.data);
    setBoosters(b.data);
  };
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

  const confirmBooster = async () => {
    if (!modalPack) return;
    setBusy(true);
    try {
      const { data } = await api.post("/shop/booster/checkout", {
        pack_id: modalPack.id,
        origin_url: window.location.origin,
      });
      celebrate();
      toast.success(`+${data.xp_granted} XP — You're unstoppable today! 🚀`);
      await refresh();
      setModalPack(null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not purchase");
    } finally {
      setBusy(false);
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

      {/* Booster Packs */}
      <section className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="text-[#FFD166]" size={20} />
          <h2 className="text-2xl font-extrabold">Booster Packs</h2>
          <span className="text-xs text-[#8D829B] uppercase tracking-widest ml-2">instant XP</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-4" data-testid="booster-grid">
          {boosters.map((p) => {
            const s = PACK_STYLES[p.color] || PACK_STYLES.yellow;
            const popular = p.id === "focus_surge";
            return (
              <button
                key={p.id}
                data-testid={`booster-${p.id}`}
                onClick={() => setModalPack(p)}
                className={`ff-card p-6 text-left relative overflow-hidden ring-1 ${s.ring} bg-gradient-to-br ${s.bg} to-transparent hover:bg-[#352D47] transition-all`}
              >
                {popular && (
                  <div className="absolute top-3 right-3 text-[10px] px-2.5 py-1 rounded-full bg-[#FFD166] text-[#1A1625] font-extrabold flex items-center gap-1">
                    <Zap size={10} /> Popular
                  </div>
                )}
                <Sparkles className={`${s.icon} mb-3`} size={32} />
                <div className="font-extrabold text-xl">{p.name}</div>
                <div className="text-3xl font-black mt-2">+{p.xp} <span className="text-sm text-[#D0C7DB]">XP</span></div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-2xl font-black">${p.amount}</span>
                  <span className="text-xs text-[#8D829B]">one-time</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Themes / accessories */}
      <section className="mt-12">
        <h2 className="text-2xl font-extrabold mb-4">Themes & treats</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  >Buy</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Booster confirm modal */}
      {modalPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1625]/80 backdrop-blur-sm p-4" data-testid="booster-modal">
          <div className="ff-card max-w-sm w-full p-7 relative">
            <button onClick={() => setModalPack(null)} className="absolute top-4 right-4 text-[#8D829B]" aria-label="close">
              <X size={18} />
            </button>
            <Sparkles className="text-[#FFD166] mb-2" size={28} />
            <h3 className="text-xl font-extrabold mb-2">{modalPack.name}</h3>
            <p className="text-[#D0C7DB] mb-6">
              Add <span className="text-[#FFD166] font-bold">+{modalPack.xp} XP</span> to your account?
              <span className="block text-sm text-[#8D829B] mt-1">${modalPack.amount} · test mode (no real charge)</span>
            </p>
            <div className="flex gap-3">
              <button
                data-testid="booster-confirm"
                onClick={confirmBooster}
                disabled={busy}
                className="ff-btn-primary flex-1 disabled:opacity-50"
              >
                {busy ? "Adding…" : "Confirm"}
              </button>
              <button onClick={() => setModalPack(null)} className="ff-btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
