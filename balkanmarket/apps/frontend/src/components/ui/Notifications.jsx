// src/components/ui/Notifications.jsx
import { useNotifStore } from "../../store/notifStore";

export default function Notifications() {
  const { notifs, remove } = useNotifStore();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {notifs.map((n) => (
        <div
          key={n.id}
          onClick={() => remove(n.id)}
          className="pointer-events-auto animate-slide-up cursor-pointer
                     flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl
                     border backdrop-blur-sm text-sm font-semibold"
          style={{
            background: n.type === "success" ? "rgba(16,185,129,0.15)"
                      : n.type === "error"   ? "rgba(239,68,68,0.15)"
                      : "rgba(99,102,241,0.15)",
            borderColor: n.type === "success" ? "#10b981"
                       : n.type === "error"   ? "#ef4444"
                       : "#6366f1",
            color: n.type === "success" ? "#10b981"
                 : n.type === "error"   ? "#ef4444"
                 : "#818cf8",
          }}
        >
          <span>{n.type === "success" ? "✓" : n.type === "error" ? "✕" : "ℹ"}</span>
          {n.message}
        </div>
      ))}
    </div>
  );
}
