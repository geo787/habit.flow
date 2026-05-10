import { Check } from "lucide-react";

const tiers = [
  {
    name: "Free",
    price: "$0",
    desc: "for getting started softly",
    features: ["3 focus sessions/day", "Brain dump (10 tasks)", "Basic gamification", "1 body doubling room/day"],
    cta: "Current plan",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$7.99",
    sub: "/month",
    desc: "unlock everything, gently",
    features: ["Unlimited sessions + tasks", "AI task breakdown", "All sounds + themes", "Mood analytics", "Unlimited body doubling", "Weekly wrapped reports"],
    cta: "Upgrade — coming soon",
    highlight: true,
  },
  {
    name: "Teams",
    price: "$12",
    sub: "/user/month",
    desc: "for ADHD coaches & teams",
    features: ["Shared workspaces", "Coach dashboard", "Custom templates", "Slack integration", "Billing dashboard"],
    cta: "Talk to us",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-black mb-3">Simple, kind pricing</h1>
        <p className="text-[#D0C7DB] max-w-xl mx-auto">No dark patterns, no aggressive upsells. Just honest tools that respect your brain.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {tiers.map((t) => (
          <div
            key={t.name}
            data-testid={`pricing-${t.name.toLowerCase()}`}
            className={`ff-card p-7 ${t.highlight ? "ring-2 ring-[#FFD166] relative overflow-hidden" : ""}`}
          >
            {t.highlight && <div className="absolute top-3 right-3 text-xs px-3 py-1 rounded-full bg-[#FFD166] text-[#1A1625] font-extrabold">popular</div>}
            <div className="text-sm uppercase tracking-widest text-[#8D829B]">{t.name}</div>
            <div className="flex items-baseline gap-1 mt-3">
              <span className="text-4xl font-black">{t.price}</span>
              {t.sub && <span className="text-sm text-[#8D829B]">{t.sub}</span>}
            </div>
            <div className="text-sm text-[#D0C7DB] mt-1">{t.desc}</div>
            <ul className="space-y-2.5 mt-6 mb-7">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check size={16} className="text-[#45B69C] mt-0.5 flex-shrink-0" />
                  <span className="text-[#D0C7DB]">{f}</span>
                </li>
              ))}
            </ul>
            <button
              disabled
              className={`w-full py-3 rounded-full font-extrabold text-sm ${t.highlight ? "bg-[#FFD166] text-[#1A1625]" : "border border-[#3A3249] text-[#D0C7DB]"} opacity-80`}
            >
              {t.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="text-center mt-12 text-sm text-[#8D829B]">
        Stripe checkout coming in phase 2. We'll email you when Pro is ready.
      </div>
    </div>
  );
}
