// src/components/trade/BetModal.jsx
import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { useNotifStore } from "../../store/notifStore";
import { getQuote } from "../../lib/lmsr";
import api from "../../lib/api";

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

export default function BetModal({ market, onClose, onSuccess }) {
  const { user, refreshUser } = useAuthStore();
  const notif = useNotifStore();

  const [side,     setSide]     = useState("YES");
  const [amount,   setAmount]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [quote,    setQuote]    = useState(null);
  const [sellMode, setSellMode] = useState(false);
  const [sellShares, setSellShares] = useState("");

  const balance = Number(user?.balanceEur || 0);

  // Instant quote preview
  useEffect(() => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !market) { setQuote(null); return; }
    const q = getQuote(side, amt, Number(market.qYes), Number(market.qNo), Number(market.lmsrB));
    setQuote(q);
  }, [amount, side, market]);

  async function handleBuy() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return notif.error("Unesite iznos");
    if (amt > balance)    return notif.error("Nedovoljno sredstava");

    setLoading(true);
    try {
      await api.post("/trades/buy", { marketId: market.id, side, amountEur: amt });
      await refreshUser();
      notif.success(`✓ Kupljeno! ${quote?.shares} dionica na ${side}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      notif.error(err.response?.data?.error || "Greška pri kupovini");
    } finally {
      setLoading(false);
    }
  }

  async function handleSell() {
    const shares = parseFloat(sellShares);
    if (!shares || shares <= 0) return notif.error("Unesite broj dionica");
    setLoading(true);
    try {
      const { data } = await api.post("/trades/sell", { marketId: market.id, side, shares });
      await refreshUser();
      notif.success(`✓ Prodano! Primljeno €${Number(data.returnEur).toFixed(2)}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      notif.error(err.response?.data?.error || "Greška pri prodaji");
    } finally {
      setLoading(false);
    }
  }

  // Korisnički position za ovaj market
  const userPos = market.userPosition?.find((p) => p.side === side);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
         style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
         onClick={onClose}>
      <div className="w-full max-w-md card animate-slide-up"
           onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{market.icon}</span>
              <span className="text-xs text-[var(--muted)] uppercase font-bold tracking-wide">
                {market.category}
              </span>
            </div>
            <p className="text-sm font-semibold leading-snug text-[var(--text)] max-w-xs">
              {market.question}
            </p>
          </div>
          <button onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--text)] text-xl leading-none ml-3 flex-none">
            ✕
          </button>
        </div>

        {/* Buy / Sell tabs */}
        <div className="flex gap-2 mb-5">
          {[["Kupi", false], ["Prodaj", true]].map(([label, mode]) => (
            <button key={label} onClick={() => setSellMode(mode)}
              className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
              style={{
                background: sellMode === mode ? "var(--border)" : "transparent",
                color:      sellMode === mode ? "var(--text)"   : "var(--muted)",
                border:     "1px solid var(--border)",
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* YES / NO buttons */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[["YES", "DA", "var(--green)", "rgba(16,185,129,0.12)"],
            ["NO",  "NE", "var(--red)",   "rgba(239,68,68,0.12)"]].map(([val, label, clr, bg]) => (
            <button key={val} onClick={() => setSide(val)}
              className="py-3 rounded-xl font-bold transition-all"
              style={{
                border:     `2px solid ${side === val ? clr : "var(--border)"}`,
                background: side === val ? bg : "transparent",
                color:      side === val ? clr : "var(--muted)",
              }}>
              {val === "YES" ? "✓" : "✗"} {label}
              <span className="block text-xl mt-0.5">
                {val === "YES" ? market.yesPrice : market.noPrice}¢
              </span>
            </button>
          ))}
        </div>

        {/* Input */}
        {!sellMode ? (
          <>
            <div className="mb-2">
              <label className="text-xs text-[var(--muted)] block mb-1.5">Iznos (EUR)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[var(--muted)]">€</span>
                <input
                  type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00" className="input pl-8 text-xl font-bold"
                  min="1" max={balance} />
              </div>
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 mb-5">
              {QUICK_AMOUNTS.map((v) => (
                <button key={v} onClick={() => setAmount(v)}
                  className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all
                             border border-[var(--border)] text-[var(--muted)]
                             hover:border-[var(--accent)] hover:text-[var(--text)]">
                  €{v}
                </button>
              ))}
              <button onClick={() => setAmount(Math.floor(balance))}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all
                           border border-[var(--border)] text-[var(--muted)]
                           hover:border-[var(--accent)] hover:text-[var(--text)]">
                Max
              </button>
            </div>

            {/* Quote preview */}
            {quote && (
              <div className="bg-[var(--bg)] rounded-xl p-4 mb-5 space-y-2 text-sm">
                {[
                  ["Dionice", quote.shares],
                  ["Fee (2%)", `€${quote.feeEur}`],
                  ["Ukupno", `€${quote.totalEur}`],
                  ["Maks. dobit", `€${quote.potentialReturn}`],
                  ["Utjecaj na cijenu", `${quote.priceImpact}¢`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-[var(--muted)]">{k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-[var(--border)]">
                  <span className="text-[var(--muted)]">Nova cijena</span>
                  <span className="font-bold">
                    <span className="text-green">DA {quote.newYesPrice}¢</span>
                    {" / "}
                    <span className="text-red">NE {quote.newNoPrice}¢</span>
                  </span>
                </div>
              </div>
            )}

            {/* Balance */}
            <div className="flex justify-between text-xs text-[var(--muted)] mb-4">
              <span>Stanje</span>
              <span className="text-green font-bold">€{balance.toFixed(2)}</span>
            </div>

            <button onClick={handleBuy} disabled={!amount || loading || !user}
              className="btn-primary w-full text-base"
              style={{ background: side === "YES" ? "var(--green)" : "var(--red)" }}>
              {loading ? "Procesiranje..." : !user ? "Prijavi se za kladjenje" : `Kupi ${side === "YES" ? "DA" : "NE"}`}
            </button>
          </>
        ) : (
          <>
            {userPos ? (
              <>
                <div className="bg-[var(--bg)] rounded-xl p-4 mb-4 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Tvoje dionice</span>
                    <span className="font-bold">{Number(userPos.shares).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Prosj. cijena</span>
                    <span className="font-bold">{userPos.avgPrice}¢</span>
                  </div>
                </div>
                <input type="number" value={sellShares}
                  onChange={(e) => setSellShares(e.target.value)}
                  placeholder="Broj dionica za prodaju"
                  className="input mb-4" max={userPos.shares} />
                <button onClick={handleSell} disabled={!sellShares || loading}
                  className="btn-primary w-full" style={{ background: "var(--red)" }}>
                  {loading ? "Prodajem..." : "Prodaj dionice"}
                </button>
              </>
            ) : (
              <p className="text-[var(--muted)] text-center py-6 text-sm">
                Nemaš {side} dionica na ovom tržištu.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
