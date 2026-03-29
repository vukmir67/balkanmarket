// src/pages/MarketDetail.jsx
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { useMarket } from "../hooks/useMarkets";
import { useMarketSocket } from "../hooks/useSocket";
import { useAuthStore } from "../store/authStore";
import PriceChart from "../components/market/PriceChart";
import BetModal   from "../components/trade/BetModal";

const STATUS_LABEL = {
  OPEN:      { label: "🟢 Otvoreno",   color: "var(--green)" },
  CLOSED:    { label: "🟡 Zatvoreno",  color: "#fbbf24" },
  RESOLVED:  { label: "✅ Razriješeno", color: "var(--muted)" },
  CANCELLED: { label: "❌ Otkazano",   color: "var(--red)" },
};

export default function MarketDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const { market, history, trades, loading, error, refetch, updatePrice } = useMarket(id);
  const [showBet, setShowBet] = useState(false);

  // Live price updates
  useMarketSocket(id, updatePrice);

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card h-32 animate-pulse-soft" />
      ))}
    </div>
  );

  if (error) return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="card text-center py-16 text-red">{error}</div>
    </div>
  );

  if (!market) return null;

  const status = STATUS_LABEL[market.status] || STATUS_LABEL.OPEN;
  const userPositions = market.userPosition || [];
  const isOpen = market.status === "OPEN";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fade-in">

      {/* Back */}
      <Link to="/" className="text-[var(--muted)] hover:text-[var(--text)] text-sm flex items-center gap-1 transition-colors">
        ← Nazad na tržišta
      </Link>

      {/* Header card */}
      <div className="card space-y-4">
        <div className="flex items-start gap-4">
          <span className="text-4xl flex-none">{market.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="badge" style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>
                {market.category}
              </span>
              <span className="text-xs font-bold" style={{ color: status.color }}>
                {status.label}
              </span>
              <span className="text-xs text-[var(--muted)]">
                Ističe: {format(new Date(market.endDate), "dd.MM.yyyy")}
              </span>
            </div>
            <h1 className="text-xl font-bold leading-snug">{market.question}</h1>
            {market.description && (
              <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">{market.description}</p>
            )}
          </div>
        </div>

        {/* Price bar */}
        <div className="space-y-2">
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            <div className="bg-green rounded-l-full transition-all duration-700"
                 style={{ width: `${market.yesPrice}%` }} />
            <div className="bg-red rounded-r-full transition-all duration-700"
                 style={{ width: `${market.noPrice}%` }} />
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span className="text-green">DA {market.yesPrice}¢</span>
            <span className="text-red">NE {market.noPrice}¢</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-[var(--border)]">
          {[
            ["Volumen", `€${(Number(market.volume)/1000).toFixed(1)}k`],
            ["Likvidnost", `€${(Number(market.liquidity)/1000).toFixed(1)}k`],
            ["Trgovci", market._count?.positions || 0],
          ].map(([k, v]) => (
            <div key={k} className="text-center">
              <div className="text-lg font-extrabold">{v}</div>
              <div className="text-xs text-[var(--muted)]">{k}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        {isOpen && (
          <button onClick={() => setShowBet(true)}
            className="btn-primary w-full text-base">
            {user ? "Kladi se" : "Prijavi se za kladjenje"}
          </button>
        )}

        {market.resolution && (
          <div className="bg-[var(--bg)] rounded-xl p-4 text-sm">
            <p className="font-bold mb-1">
              Ishod: <span className={market.resolution.outcome === "YES" ? "text-green" : "text-red"}>
                {market.resolution.outcome === "YES" ? "✓ DA" : "✗ NE"}
              </span>
            </p>
            {market.resolution.sourceUrl && (
              <a href={market.resolution.sourceUrl} target="_blank" rel="noopener noreferrer"
                 className="text-accent hover:underline text-xs">
                Izvor →
              </a>
            )}
          </div>
        )}
      </div>

      {/* User positions */}
      {userPositions.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-3 text-sm">Tvoje pozicije</h3>
          <div className="space-y-2">
            {userPositions.map((pos) => {
              const curPrice = pos.side === "YES" ? market.yesPrice : market.noPrice;
              const pnlPct   = ((curPrice - pos.avgPrice) / pos.avgPrice * 100).toFixed(1);
              const isProfit = curPrice >= pos.avgPrice;
              return (
                <div key={pos.id} className="flex justify-between items-center py-2
                                             border-b border-[var(--border)] last:border-0 text-sm">
                  <div>
                    <span className={`font-bold ${pos.side === "YES" ? "text-green" : "text-red"}`}>
                      {pos.side === "YES" ? "✓ DA" : "✗ NE"}
                    </span>
                    <span className="text-[var(--muted)] ml-2">{Number(pos.shares).toFixed(4)} dionica</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">@{pos.avgPrice}¢</div>
                    <div className={`text-xs ${isProfit ? "text-green" : "text-red"}`}>
                      {isProfit ? "+" : ""}{pnlPct}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="card">
        <h3 className="font-bold mb-4 text-sm text-[var(--muted)] uppercase tracking-wide">
          Historija cijena
        </h3>
        <PriceChart history={history} />
      </div>

      {/* Recent trades */}
      {trades.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-4 text-sm text-[var(--muted)] uppercase tracking-wide">
            Nedavne transakcije
          </h3>
          <div className="space-y-1">
            {trades.slice(0, 15).map((t) => (
              <div key={t.id} className="flex justify-between text-xs py-1.5
                                         border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-2">
                  <span className={t.side === "YES" ? "text-green font-bold" : "text-red font-bold"}>
                    {t.action} {t.side}
                  </span>
                  <span className="text-[var(--muted)]">
                    {t.user?.displayName || "Anonimno"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold">€{Number(t.amountEur).toFixed(2)}</span>
                  <span className="text-[var(--muted)] ml-2">@{t.price}¢</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bet modal */}
      {showBet && (
        <BetModal market={market} onClose={() => setShowBet(false)} onSuccess={refetch} />
      )}
    </div>
  );
}
