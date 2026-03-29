// src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Login() {
  const { login, loading, error, setError } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from || "/";

  const [form, setForm] = useState({ email: "", password: "" });

  function change(e) {
    setError(null);
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (_) {}
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl">🎯</span>
          <h1 className="text-2xl font-extrabold mt-3">
            Balkan<span className="text-accent">Market</span>
          </h1>
          <p className="text-[var(--muted)] text-sm mt-1">Prijavi se na svoj nalog</p>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          {error && (
            <div className="bg-red/10 border border-red/30 text-red text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">Email</label>
            <input name="email" type="email" value={form.email} onChange={change}
              className="input" placeholder="tvoj@email.com" required autoFocus />
          </div>

          <div>
            <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">Lozinka</label>
            <input name="password" type="password" value={form.password} onChange={change}
              className="input" placeholder="••••••••" required />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full text-base mt-2">
            {loading ? "Prijava..." : "Prijavi se"}
          </button>

          {/* Demo credentials */}
          <div className="bg-[var(--bg)] rounded-xl p-3 text-xs text-[var(--muted)] space-y-1">
            <p className="font-semibold text-[var(--text)]">Test nalozi:</p>
            <p>Admin: admin@balkanmarket.ba / admin123!</p>
            <p>User: test@balkanmarket.ba / test1234</p>
          </div>
        </form>

        <p className="text-center text-sm text-[var(--muted)] mt-6">
          Nemaš nalog?{" "}
          <Link to="/register" className="text-accent hover:underline font-semibold">
            Registruj se
          </Link>
        </p>
      </div>
    </div>
  );
}
