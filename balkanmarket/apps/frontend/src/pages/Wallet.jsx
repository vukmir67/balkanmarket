// src/pages/Wallet.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuthStore } from "../store/authStore";
import { useNotifStore } from "../store/notifStore";
import api from "../lib/api";

const KYC_INFO = {
  PENDING:  { label: "Nepotvrđen",  color: "var(--muted)", desc: "Verifikuj email za kladjenje" },
  BASIC:    { label: "Osnovan",     color: "#fbbf24",       desc: "Limit €100/dan" },
  VERIFIED: { label: "Verifikovan", color: "var(--green)",  desc: "Limit €1,000/dan" },
  PREMIUM:  { label: "Premium",     color: "var(--accent)", desc: "Limit €10,000/dan" },
};

export default function Wallet() {
  const { user, refreshUser } = useAuthStore();
  const notif    = useNotifStore();
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("deposit");

  // Deposit form
  const [depAmount, setDepAmount] = useState("");
  const [depLoading, setDepLoading] = useState(false);

  // Withdraw form
  const [witAmount,  setWitAmount]  = useState("");
  const [witIban,    setWitIban]    = useState("");
  const [witLoading, setWitLoading] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    api.get("/payments/history")
      .then((r) => setPayments(r.data))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleDeposit(e) {
    e.preventDefault();
    const amt = parseFloat(depAmount);
    if (!amt || amt < 5) return notif.error("Minimalni depozit je €5");
    setDepLoading(true);
    try {
      const { data } = await api.post("/payments/deposit/fiat", { amount: amt });
      if (data.dev) {
        notif.success(`✓ ${data.message}`);
        await refreshUser();
        setDepAmount("");
      } else {
        // U produkciji: otvori Stripe checkout sa data.clientSecret
        notif.info("Stripe checkout bi se otvorio ovdje (test mode)");
      }
    } catch (err) {
      notif.error(err.response?.data?.error || "Greška pri uplati");
    } finally {
      setDepLoading(false);
    }
  }

  async function handleWithdraw(e) {
    e.preventDefault();
    const amt = parseFloat(witAmount);
    if (!amt || amt < 10) return notif.error("Minimalna isplata je €10");
    if (!witIban || witIban.length < 15) return notif.error("Unesite validan IBAN");
    if (amt > Number(user.balanceEur)) return notif.error("Nedovoljno sredstava");
    setWitLoading(true);
    try {
      await api.post("/payments/withdraw/fiat", { amount: amt, iban: witIban });
      notif.success("✓ Zahtjev za isplatu poslan! Obradit ćemo ga u roku 1-3 radna dana.");
      await refreshUser();
      setWitAmount(""); setWitIban("");
    } catch (err) {
      notif.error(err.response?.data?.error || "Greška pri isplati");
    } finally {
      setWitLoading(false);
    }
  }

  if (!user) return null;
  const kyc = KYC_INFO[user.kycStatus] || KYC_INFO.PENDING;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <h1 className="text-2xl font-extrabold">Novčanik</h1>

      {/* Balance + KYC */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center py-6">
          <div className="text-3xl font-extrabold text-green mb-1">
            €{Number(user.balanceEur).toFixed(2)}
          </div>
          <div className="text-xs text-[var(--muted)]">Dostupno stanje</div>
        </div>
        <div className="card text-center py-6">
          <div className="text-lg font-extrabold mb-1" style={{ color: kyc.color }}>
            ● {kyc.label}
          </div>
          <div className="text-xs text-[var(--muted)]">{kyc.desc}</div>
        </div>
      </div>

      {/* KYC upgrade banner */}
      {user.kycStatus === "PENDING" && (
        <div className="card border-yellow-500/30 bg-yellow-500/5">
          <p className="text-sm font-semibold text-yellow-400 mb-1">⚠ Verifikacija potrebna</p>
          <p className="text-xs text-[var(--muted)]">
            Da bi mogao/la uplačivati i kladiti se, potrebno je verificirati nalog.
            U produkciji bi ovde bio KYC proces (Sumsub/Veriff).
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {[["deposit", "💳 Uplata"], ["withdraw", "🏦 Isplata"], ["history", "📋 Historija"]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all border"
            style={{
              background:  tab === t ? "rgba(99,102,241,0.15)" : "var(--surface)",
              borderColor: tab === t ? "var(--accent)"         : "var(--border)",
              color:       tab === t ? "var(--accent)"         : "var(--muted)",
            }}>
            {l}
          </button>
        ))}
      </div>

      {/* Deposit */}
      {tab === "deposit" && (
        <form onSubmit={handleDeposit} className="card space-y-4">
          <h2 className="font-bold">Uplata (EUR)</h2>

          <div>
            <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">Iznos</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[var(--muted)]">€</span>
              <input type="number" value={depAmount} onChange={(e) => setDepAmount(e.target.value)}
                className="input pl-8 text-xl font-bold" placeholder="0.00" min="5" max="10000" />
            </div>
          </div>

          <div className="flex gap-2">
            {[10, 25, 50, 100, 250].map((v) => (
              <button type="button" key={v} onClick={() => setDepAmount(v)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg border border-[var(--border)]
                           text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)] transition-all">
                €{v}
              </button>
            ))}
          </div>

          {/* Payment methods */}
          <div className="space-y-2">
            <label className="text-xs text-[var(--muted)] font-semibold">Metoda plaćanja</label>
            {[
              ["💳 Visa / Mastercard", "Instant • 2.9% + €0.30"],
              ["🏦 SEPA Transfer",     "1-2 dana • €0.80"],
            ].map(([name, info]) => (
              <div key={name} className="flex items-center justify-between p-3 rounded-xl border
                                         border-[var(--border)] bg-[var(--bg)] text-sm">
                <span className="font-semibold">{name}</span>
                <span className="text-[var(--muted)] text-xs">{info}</span>
              </div>
            ))}
          </div>

          <button type="submit" disabled={depLoading || !depAmount} className="btn-primary w-full">
            {depLoading ? "Procesiranje..." : `Uplati €${depAmount || "0"}`}
          </button>

          <p className="text-xs text-[var(--muted)] text-center">
            🔒 Plaćanja su zaštićena Stripe-om. BalkanMarket ne čuva podatke kartice.
          </p>
        </form>
      )}

      {/* Withdraw */}
      {tab === "withdraw" && (
        <form onSubmit={handleWithdraw} className="card space-y-4">
          <h2 className="font-bold">Isplata na bankovni račun</h2>

          {user.kycStatus === "PENDING" || user.kycStatus === "BASIC" ? (
            <div className="bg-red/10 border border-red/30 rounded-xl p-4 text-sm text-red">
              Za isplate je potrebna VERIFIED verifikacija. Kontaktiraj nas na support@balkanmarket.ba.
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">
                  Iznos (min. €10)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[var(--muted)]">€</span>
                  <input type="number" value={witAmount} onChange={(e) => setWitAmount(e.target.value)}
                    className="input pl-8 text-xl font-bold" placeholder="0.00"
                    min="10" max={user.balanceEur} />
                </div>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Dostupno: €{Number(user.balanceEur).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">IBAN</label>
                <input value={witIban} onChange={(e) => setWitIban(e.target.value)}
                  className="input font-mono" placeholder="BA39 1234 5678 9012 3456" />
              </div>

              <button type="submit" disabled={witLoading} className="btn-primary w-full"
                style={{ background: "var(--red)" }}>
                {witLoading ? "Šaljem zahtjev..." : "Zatraži isplatu"}
              </button>
              <p className="text-xs text-[var(--muted)] text-center">
                Isplate se obrađuju u roku 1-3 radna dana. Fee: 0.25%
              </p>
            </>
          )}
        </form>
      )}

      {/* History */}
      {tab === "history" && (
        <div className="card">
          <h2 className="font-bold mb-4">Historija transakcija</h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-[var(--bg)] rounded-xl animate-pulse-soft" />)}
            </div>
          ) : payments.length === 0 ? (
            <p className="text-center text-[var(--muted)] py-10 text-sm">Nema transakcija.</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between items-center py-3 text-sm">
                  <div>
                    <span className={`font-bold ${p.type === "DEPOSIT" ? "text-green" : "text-red"}`}>
                      {p.type === "DEPOSIT" ? "↓ Uplata" : "↑ Isplata"}
                    </span>
                    <span className="text-[var(--muted)] ml-2 text-xs">
                      {p.provider} • {format(new Date(p.createdAt), "dd.MM.yyyy")}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${p.type === "DEPOSIT" ? "text-green" : "text-[var(--text)]"}`}>
                      {p.type === "DEPOSIT" ? "+" : "-"}€{Number(p.amountEur).toFixed(2)}
                    </div>
                    <div className={`text-xs font-semibold ${
                      p.status === "COMPLETED" ? "text-green"
                    : p.status === "PENDING"   ? "text-yellow-400"
                    : "text-red"}`}>
                      {p.status}
                    </div>
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
