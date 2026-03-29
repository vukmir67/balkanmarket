// src/pages/Admin.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuthStore } from "../store/authStore";
import { useNotifStore } from "../store/notifStore";
import api from "../lib/api";

const CATEGORIES = ["POLITIKA","SPORT","EKONOMIJA","TEHNOLOGIJA","KULTURA","OSTALO"];

export default function Admin() {
  const { user } = useAuthStore();
  const notif    = useNotifStore();
  const navigate = useNavigate();

  const [tab,     setTab]     = useState("stats");
  const [stats,   setStats]   = useState(null);
  const [markets, setMarkets] = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  // New market form
  const [mForm, setMForm] = useState({
    question: "", description: "", category: "POLITIKA",
    icon: "🎯", endDate: "", lmsrB: 100, liquidity: 1000,
  });
  const [mLoading, setMLoading] = useState(false);

  // Resolve form
  const [resolveId,  setResolveId]  = useState("");
  const [resolveOut, setResolveOut] = useState("YES");
  const [resolveUrl, setResolveUrl] = useState("");
  const [rLoading,   setRLoading]   = useState(false);

  useEffect(() => {
    if (!user?.isAdmin) { navigate("/"); return; }
    loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, m, u] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/markets?status=OPEN&limit=50"),
        api.get("/admin/users"),
      ]);
      setStats(s.data);
      setMarkets(m.data.markets);
      setUsers(u.data);
    } catch (err) {
      notif.error("Greška pri učitavanju admin podataka");
    } finally {
      setLoading(false);
    }
  }

  async function createMarket(e) {
    e.preventDefault();
    if (!mForm.question || !mForm.endDate) return notif.error("Popuni sva obavezna polja");
    setMLoading(true);
    try {
      await api.post("/admin/markets", {
        ...mForm,
        endDate: new Date(mForm.endDate).toISOString(),
        lmsrB:   Number(mForm.lmsrB),
        liquidity: Number(mForm.liquidity),
      });
      notif.success("✓ Tržište kreirano!");
      setMForm({ question: "", description: "", category: "POLITIKA", icon: "🎯", endDate: "", lmsrB: 100, liquidity: 1000 });
      await loadAll();
    } catch (err) {
      notif.error(err.response?.data?.error || "Greška");
    } finally {
      setMLoading(false);
    }
  }

  async function resolveMarket(e) {
    e.preventDefault();
    if (!resolveId || !resolveUrl) return notif.error("Odaberi tržište i unesi URL izvora");
    setRLoading(true);
    try {
      await api.put(`/admin/markets/${resolveId}/resolve`, {
        outcome: resolveOut, sourceUrl: resolveUrl,
      });
      notif.success(`✓ Tržište Rešeno: ${resolveOut}`);
      setResolveId(""); setResolveUrl("");
      await loadAll();
    } catch (err) {
      notif.error(err.response?.data?.error || "Greška");
    } finally {
      setRLoading(false);
    }
  }

  async function updateKyc(userId, kycStatus) {
    try {
      await api.put(`/admin/users/${userId}/kyc`, { kycStatus });
      notif.success(`✓ KYC ažuriran: ${kycStatus}`);
      setUsers((us) => us.map((u) => u.id === userId ? { ...u, kycStatus } : u));
    } catch (err) {
      notif.error(err.response?.data?.error || "Greška");
    }
  }

  if (!user?.isAdmin) return null;

  const TABS = [
    ["stats",   "📊 Statistike"],
    ["create",  "➕ Novo tržište"],
    ["resolve", "✅ Reši"],
    ["users",   "👥 Korisnici"],
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-extrabold">Admin Panel</h1>
        <span className="badge" style={{ background: "rgba(99,102,241,0.15)", color: "var(--accent)" }}>
          Admin
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-none px-4 py-2 rounded-xl text-sm font-semibold transition-all border"
            style={{
              background:  tab === t ? "rgba(99,102,241,0.15)" : "var(--surface)",
              borderColor: tab === t ? "var(--accent)"         : "var(--border)",
              color:       tab === t ? "var(--accent)"         : "var(--muted)",
            }}>
            {l}
          </button>
        ))}
      </div>

      {/* Stats */}
      {tab === "stats" && (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="card h-24 animate-pulse-soft" />)}
            </div>
          ) : stats && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  ["Korisnici", stats.users, "👥"],
                  ["Ukupan vol.", `€${(Number(stats.totalVolume || 0)/1000).toFixed(1)}k`, "💰"],
                  ["Open markets", markets.length, "🟢"],
                  ["Transakcije", (stats.payments || []).reduce((a, p) => a + (p._count || 0), 0), "💳"],
                ].map(([label, val, icon]) => (
                  <div key={label} className="card text-center py-5">
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className="text-xl font-extrabold">{val}</div>
                    <div className="text-xs text-[var(--muted)]">{label}</div>
                  </div>
                ))}
              </div>

              {/* Markets table */}
              <div className="card">
                <h3 className="font-bold mb-4">Aktivna tržišta</h3>
                <div className="divide-y divide-[var(--border)] text-sm">
                  {markets.slice(0, 10).map((m) => (
                    <div key={m.id} className="flex items-center gap-3 py-2.5">
                      <span className="text-xl flex-none">{m.icon}</span>
                      <span className="flex-1 font-medium truncate">{m.question}</span>
                      <span className="text-green font-bold flex-none">{m.yesPrice}¢</span>
                      <span className="text-[var(--muted)] flex-none text-xs">
                        Vol: €{(Number(m.volume)/1000).toFixed(1)}k
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Create market */}
      {tab === "create" && (
        <form onSubmit={createMarket} className="card space-y-4">
          <h2 className="font-bold text-lg">Kreiraj novo tržište</h2>

          <div>
            <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">
              Pitanje tržišta *
            </label>
            <textarea value={mForm.question}
              onChange={(e) => setMForm((f) => ({ ...f, question: e.target.value }))}
              className="input resize-none" rows={3}
              placeholder="Da li će...? (mora biti jasno da/ne pitanje)" required />
          </div>

          <div>
            <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">
              Opis / Kriteriji razrješenja
            </label>
            <textarea value={mForm.description}
              onChange={(e) => setMForm((f) => ({ ...f, description: e.target.value }))}
              className="input resize-none" rows={2}
              placeholder="Tržište se resolvuje na YES ako..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">Kategorija</label>
              <select value={mForm.category}
                onChange={(e) => setMForm((f) => ({ ...f, category: e.target.value }))}
                className="input cursor-pointer">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">Ikona (emoji)</label>
              <input value={mForm.icon}
                onChange={(e) => setMForm((f) => ({ ...f, icon: e.target.value }))}
                className="input text-2xl" maxLength={4} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">
                Datum isteka *
              </label>
              <input type="datetime-local" value={mForm.endDate}
                onChange={(e) => setMForm((f) => ({ ...f, endDate: e.target.value }))}
                className="input" required />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">
                LMSR b (likvidnost)
              </label>
              <input type="number" value={mForm.lmsrB}
                onChange={(e) => setMForm((f) => ({ ...f, lmsrB: e.target.value }))}
                className="input" min="10" max="10000" />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">
                Seed likvidnost (€)
              </label>
              <input type="number" value={mForm.liquidity}
                onChange={(e) => setMForm((f) => ({ ...f, liquidity: e.target.value }))}
                className="input" min="100" />
            </div>
          </div>

          <button type="submit" disabled={mLoading} className="btn-primary w-full">
            {mLoading ? "Kreiram..." : "Kreiraj tržište"}
          </button>
        </form>
      )}

      {/* Resolve */}
      {tab === "resolve" && (
        <form onSubmit={resolveMarket} className="card space-y-4">
          <h2 className="font-bold text-lg">Reši tržište</h2>

          <div>
            <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">
              Odaberi tržište *
            </label>
            <select value={resolveId} onChange={(e) => setResolveId(e.target.value)}
              className="input cursor-pointer" required>
              <option value="">— Odaberi —</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.icon} {m.question.slice(0, 70)}...
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">Ishod *</label>
            <div className="grid grid-cols-3 gap-3">
              {[["YES","✓ DA","var(--green)"],["NO","✗ NE","var(--red)"],["CANCELLED","Otkazano","var(--muted)"]].map(([val, label, clr]) => (
                <button type="button" key={val} onClick={() => setResolveOut(val)}
                  className="py-3 rounded-xl font-bold transition-all text-sm"
                  style={{
                    border:     `2px solid ${resolveOut === val ? clr : "var(--border)"}`,
                    background: resolveOut === val ? `${clr}22` : "transparent",
                    color:      resolveOut === val ? clr : "var(--muted)",
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">
              URL izvora * (novinski članak, zvanična objava...)
            </label>
            <input value={resolveUrl} onChange={(e) => setResolveUrl(e.target.value)}
              className="input font-mono text-sm" placeholder="https://..." type="url" required />
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-400">
            ⚠ Ova akcija je Nepovratna. Korisnici koji su kladili na pobjednički ishod dobivaju automatsku isplatu.
          </div>

          <button type="submit" disabled={rLoading} className="btn-primary w-full"
            style={{ background: resolveOut === "YES" ? "var(--green)" : resolveOut === "NO" ? "var(--red)" : "var(--muted)" }}>
            {rLoading ? "Razrješavam..." : `Reši kao ${resolveOut}`}
          </button>
        </form>
      )}

      {/* Users */}
      {tab === "users" && (
        <div className="card">
          <h2 className="font-bold mb-4">Korisnici ({users.length})</h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-[var(--bg)] rounded-xl animate-pulse-soft" />)}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)] text-sm">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{u.displayName || u.email}</div>
                    <div className="text-xs text-[var(--muted)]">{u.email}</div>
                  </div>
                  <div className="text-xs text-green font-bold flex-none">
                    €{Number(u.balanceEur).toFixed(2)}
                  </div>
                  <div className="text-xs text-[var(--muted)] flex-none hidden sm:block">
                    {u._count.trades} trades
                  </div>
                  <select value={u.kycStatus}
                    onChange={(e) => updateKyc(u.id, e.target.value)}
                    className="text-xs bg-[var(--bg)] border border-[var(--border)] rounded-lg
                               px-2 py-1 cursor-pointer text-[var(--text)] flex-none"
                    disabled={u.isAdmin}>
                    {["PENDING","BASIC","VERIFIED","PREMIUM"].map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                  {u.isAdmin && (
                    <span className="badge flex-none" style={{ background: "rgba(99,102,241,0.15)", color: "var(--accent)" }}>
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
