// src/components/market/PriceChart.jsx
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card text-xs py-2 px-3 shadow-xl">
      <p className="text-[var(--muted)] mb-1">{label}</p>
      <p className="text-green font-bold">DA: {payload[0]?.value}¢</p>
      <p className="text-red  font-bold">NE: {payload[1]?.value}¢</p>
    </div>
  );
}

export default function PriceChart({ history }) {
  if (!history?.length) return (
    <div className="h-48 flex items-center justify-center text-[var(--muted)] text-sm">
      Nema podataka za prikaz
    </div>
  );

  const data = history.map((h) => ({
    time: format(new Date(h.timestamp), "dd.MM HH:mm"),
    DA:   h.yesPrice,
    NE:   h.noPrice,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gYes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
          </linearGradient>
          <linearGradient id="gNo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#252a38" strokeDasharray="3 3" />
        <XAxis dataKey="time" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="DA" stroke="#10b981" strokeWidth={2} fill="url(#gYes)" dot={false} />
        <Area type="monotone" dataKey="NE" stroke="#ef4444" strokeWidth={2} fill="url(#gNo)"  dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
