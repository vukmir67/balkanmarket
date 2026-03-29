// src/components/market/MarketCard.jsx
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { bs } from "date-fns/locale";

const CAT_COLORS = {
  POLITIKA:    { bg: "rgba(99,102,241,0.12)", text: "#818cf8" },
  SPORT:       { bg: "rgba(16,185,129,0.12)", text: "#34d399" },
  EKONOMIJA:   { bg: "rgba(245,158,11,0.12)", text: "#fbbf24" },
  TEHNOLOGIJA: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa" },
  KULTURA:     { bg: "rgba(236,72,153,0.12)", text: "#f472b6" },
  OSTALO:      { bg: "rgba(107,114,128,0.12)", text: "#9ca3af" },
};

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

export default function MarketCard({ market }) {
  const cat    = CAT_COLORS[market.category] || CAT_COLORS.OSTALO;
  const isHot  = market._count?.trades > 100 || Number(market.volume) > 100_000;
  const endStr = formatDistanceToNow(new Date(market.endDate), { addSuffix: true, locale: bs });

  return (
    <Link to={`/market/${market.id}`} className="block group">
      <div className="card h-full flex flex-col gap-4 cursor-pointer
                      group-hover:border-[var(--accent)] transition-all duration-200
                      group-hover:shadow-[0_0_24px_rgba(99,102,241,0.08)]">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{market.icon}</span>
            <span className="badge" style={{ background: cat.bg, color: cat.text }}>
              {market.category.toLowerCase()}
            </span>
          </div>
          {isHot && (
            <span className="badge"
              style={{ background: "rgba(251,146,60,0.15)", color: "#fb923c" }}>
              🔥 Hot
            </span>
          )}
        </div>

        {/* Question */}
        <p className="text-sm font-semibold leading-snug flex-1 text-[var(--text)]">
          {market.question}
        </p>

        {/* Price bar */}
        <div className="space-y-2">
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            <div className="bg-green rounded-l-full transition-all duration-500"
                 style={{ width: `${market.yesPrice}%` }} />
            <div className="bg-red rounded-r-full transition-all duration-500"
                 style={{ width: `${market.noPrice}%` }} />
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span className="text-green">DA {market.yesPrice}¢</span>
            <span className="text-red">NE {market.noPrice}¢</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between text-xs text-[var(--muted)] pt-1
                        border-t border-[var(--border)]">
          <span>Vol: <b className="text-[var(--text)]">€{fmt(Number(market.volume))}</b></span>
          <span>{endStr}</span>
        </div>
      </div>
    </Link>
  );
}
