// src/components/layout/Navbar.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate  = useNavigate();

  const links = [
    { to: "/",         label: "Tržišta" },
    { to: "/portfolio", label: "Portfolio" },
    ...(user?.isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)]"
            style={{ background: "rgba(13,15,20,0.92)", backdropFilter: "blur(14px)" }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-none">
          <span className="text-2xl">🎯</span>
          <span className="font-extrabold text-lg tracking-tight">
            Balkan<span className="text-accent">Market</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex gap-1 flex-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors
                ${location.pathname === l.to
                  ? "bg-[var(--border)] text-[var(--text)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"}`}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/wallet"
                className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)]
                           rounded-xl px-3 py-2 hover:border-[var(--accent)] transition-colors">
                <span className="text-[var(--muted)] text-xs">Stanje</span>
                <span className="text-green font-extrabold">
                  €{Number(user.balanceEur || 0).toFixed(2)}
                </span>
              </Link>
              <button onClick={handleLogout}
                className="text-[var(--muted)] text-sm hover:text-[var(--text)] transition-colors">
                Odjava
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link to="/login"  className="btn-ghost text-sm py-1.5 px-4">Prijava</Link>
              <Link to="/register" className="btn-primary text-sm py-1.5 px-4">Registracija</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
