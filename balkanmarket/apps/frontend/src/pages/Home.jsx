// src/pages/Home.jsx
import { useState } from "react";
import MarketCard from "../components/market/MarketCard";
import { useMarkets } from "../hooks/useMarkets";

const CATEGORIES = ["Sve", "POLITIKA", "SPORT", "EKONOMIJA", "TEHNOLOGIJA", "KULTURA"];
const CAT_LABELS  = { Sve: "Sve", POLITIKA: "Politika", SPORT: "Sport",
                      EKONOMIJA: "Ekonomija", TEHNOLOGIJA: "Tehnologija", KULTURA: "Kultura" };
const SORTS = [
  { value: "volume",  label: "Popularnost" },
  { value: "endDate", label: "Uskoro ističe" },
  { value: "createdAt", label: "Najnovije" },
];

export default function Home() {
  const [category, setCategory] = useState("Sve");
  const [sortBy,   setSortBy]   = useState("volume");
  const [search,   setSearch]   = useState("");

  const filters = {
    ...(category !== "Sve" && { category }),
    sortBy,
    ...(search && { search }),
  };

  const { markets, loading, error } = useMarkets(filters);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">
          Balkanska <span className="text-accent">Prediktivna</span> Tržišta
        </h1>
        <p className="text-[var(--muted)] text-lg max-w-xl mx-auto">
          Kupi i prodaj udjele u ishodima realnih događaja. Tržišna cijena = kolektivna vjerovatnoća.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          ["📊", "Aktivna tržišta", markets.length],
          ["💰", "Ukupni volumen", "€" + (markets.reduce((a, m) => a + Number(m.volume), 0) / 1000).toFixed(0) + "k"],
          ["👥", "Trgovci", "1,240+"],
        ].map(([icon, label, val]) => (
          <div key={label} className="card text-center py-4">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xl font-extrabold">{val}</div>
            <div className="text-xs text-[var(--muted)]">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Pretraži tržišta..."
          className="input flex-1" />

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          className="input sm:w-44 cursor-pointer">
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className="flex-none px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background:  category === c ? "rgba(99,102,241,0.15)" : "var(--surface)",
              borderColor: category === c ? "var(--accent)"         : "var(--border)",
              border:      "1px solid",
              color:       category === c ? "var(--accent)"         : "var(--muted)",
            }}>
            {CAT_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-52 animate-pulse-soft bg-[var(--surface)]" />
          ))}
        </div>
      )}

      {error && (
        <div className="card text-center py-16 text-red">{error}</div>
      )}

      {!loading && !error && (
        <>
          {markets.length === 0 ? (
            <div className="card text-center py-16">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-[var(--muted)]">Nema tržišta za ove filtere.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
              {markets.map((m) => <MarketCard key={m.id} market={m} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
