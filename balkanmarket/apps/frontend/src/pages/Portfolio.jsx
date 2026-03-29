// src/pages/Portfolio.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuthStore } from "../store/authStore";
import api from "../lib/api";

export default function Portfolio() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const [positions, setPositions] = useState([]);
  const [history,   setHistory]   = useState([]);
  const [tab,       setTab]       = useState("open");
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    Promise.all([
      api.get("/trades/positions"),
      api.get("/trades/history"),
    ]).then(([p, h]) => {
      setPositions(p.data);
      setHistory(h.data);
    }).finally(() => setLoading(false));
  }, [user]);

  const totalInvested = positions.reduce((a, p) => a + Number(p.shares) * p.avgPrice / 100, 0);
  const totalValue    = positions.reduce((a, p) => {
    const cur = p.side === "YES" ? p.market.yesPrice : p.market.noPrice;
    return a + Number(p.shares) * cur / 100;
  }, 0);
  const totalPnL = totalValue - totalInvested;

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <h1 className="text-2xl font-extrabold">Moj Portfolio</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          ["Stanje",      `€${Number(user.balanceEur).toFixed(2)}`, "text-green"],
          ["Uloženo",     `€${totalInvested.toFixed(2)}`,           "text-[var(--text)]"],
          ["Tren. vrijed.", `€${totalValue.toFixed(2)}`,            "text-accent"],
          ["P&L",         `${totalPnL >= 0 ? "+" : ""}€${totalPnL.toFixed(2)}`,
                           totalPnL >= 0 ? "text-green" : "text-red"],
        ].map(([label, val, cls]) => (
          <div key={label} className="card text-center py-4">
            <div className={`text-xl font-extrabold ${cls}`}>{val}</div>
            <div className="text-xs text-[var(--muted)] mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[["open", `Otvorene (${positions.length})`], ["history", `Historija (${history.length})`]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border
              ${tab === t ? "bg-[var(--border)] text-[var(--text)] border-[var(--border)]"
                          : "bg-transparent text-[var(--muted)] border-[var(--border)]"}`}>
            {l}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-20 animate-pulse-soft" />)}
        </div>
      )}

      {/* Open positions */}
      {!loading && tab === "open" && (
        <div className="space-y-3">
          {positions.length === 0 ? (
            <div className="card text-center py-16">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-[var(--muted)] mb-4">Nemaš otvorenih pozicija.</p>
              <Link to="/" className="btn-primary inline-block">Idi na tržišta</Link>
            </div>
          ) : positions.map((pos) => {
            const cur    = pos.side === "YES" ? pos.market.yesPrice : pos.market.noPrice;
            const cost   = Number(pos.shares) * pos.avgPrice / 100;
            const value  = Number(pos.shares) * cur / 100;
            const pnl    = value - cost;
            const pnlPct = ((pnl / cost) * 100).toFixed(1);
            return (
              <Link key={pos.id} to={`/market/${pos.marketId}`}
                className="card flex gap-4 hover:border-[var(--accent)] transition-colors block">
                <span className="text-2xl flex-none">{pos.market.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{pos.market.question}</p>
                  <div className="flex gap-4 mt-1 text-xs text-[var(--muted)]">
                    <span className={pos.side === "YES" ? "text-green font-bold" : "text-red font-bold"}>
                      {pos.side === "YES" ? "✓ DA" : "✗ NE"}
                    </span>
                    <span>{Number(pos.shares).toFixed(4)} dionica × {pos.avgPrice}¢</span>
                  </div>
                </div>
                <div className="text-right flex-none">
                  <div className="font-bold">€{value.toFixed(2)}</div>
                  <div className={`text-xs font-semibold ${pnl >= 0 ? "text-green" : "text-red"}`}>
                    {pnl >= 0 ? "+" : ""}€{pnl.toFixed(2)} ({pnlPct}%)
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Trade history */}
      {!loading && tab === "history" && (
        <div className="card">
          {history.length === 0 ? (
            <p className="text-center text-[var(--muted)] py-12">Nema historije transakcija.</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {history.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-3">
                  <span className="text-xl flex-none">{t.market.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{t.market.question}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {format(new Date(t.createdAt), "dd.MM.yyyy HH:mm")}
                    </p>
                  </div>
                  <div className="text-right flex-none">
                    <div className={`text-xs font-bold ${t.side === "YES" ? "text-green" : "text-red"}`}>
                      {t.action} {t.side}
                    </div>
                    <div className="font-semibold text-sm">€{Number(t.amountEur).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
