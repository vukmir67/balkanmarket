// src/App.jsx — Glavni router BalkanMarket aplikacije
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "./store/authStore";

// Layout
import Navbar        from "./components/layout/Navbar";
import Notifications from "./components/ui/Notifications";

// Pages
import Home         from "./pages/Home";
import MarketDetail from "./pages/MarketDetail";
import Portfolio    from "./pages/Portfolio";
import Wallet       from "./pages/Wallet";
import Login        from "./pages/Login";
import Register     from "./pages/Register";
import Admin        from "./pages/Admin";

// ── Protected route wrapper ───────────────────────────────────────────────────
function Protected({ children }) {
  const { user } = useAuthStore();
  const location  = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user } = useAuthStore();
  if (!user?.isAdmin) return <Navigate to="/" replace />;
  return children;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { logout } = useAuthStore();

  // Globalni logout event (iz API interceptora)
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, [logout]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <Notifications />

      <Routes>
        {/* Public */}
        <Route path="/"           element={<Home />} />
        <Route path="/market/:id" element={<MarketDetail />} />
        <Route path="/login"      element={<Login />} />
        <Route path="/register"   element={<Register />} />

        {/* Protected */}
        <Route path="/portfolio" element={<Protected><Portfolio /></Protected>} />
        <Route path="/wallet"    element={<Protected><Wallet /></Protected>} />

        {/* Admin */}
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

        {/* 404 */}
        <Route path="*" element={
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="text-6xl">🎯</div>
            <h2 className="text-2xl font-extrabold">404 — Stranica nije pronađena</h2>
            <a href="/" className="btn-primary">Nazad na početnu</a>
          </div>
        } />
      </Routes>
    </div>
  );
}
