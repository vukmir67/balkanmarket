// src/pages/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Register() {
  const { register, loading, error, setError } = useAuthStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "", displayName: "", confirm: "" });
  const [localErr, setLocalErr] = useState("");

  function change(e) {
    setError(null);
    setLocalErr("");
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setLocalErr("Lozinke se ne poklapaju");
      return;
    }
    if (form.password.length < 8) {
      setLocalErr("Lozinka mora imati najmanje 8 znakova");
      return;
    }
    try {
      await register(form.email, form.password, form.displayName);
      navigate("/");
    } catch (_) {}
  }

  const displayErr = localErr || error;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">

        <div className="text-center mb-8">
          <span className="text-5xl">🎯</span>
          <h1 className="text-2xl font-extrabold mt-3">
            Balkan<span className="text-accent">Market</span>
          </h1>
          <p className="text-[var(--muted)] text-sm mt-1">Kreiraj novi nalog</p>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          {displayErr && (
            <div className="bg-red/10 border border-red/30 text-red text-sm rounded-xl px-4 py-3">
              {displayErr}
            </div>
          )}

          <div>
            <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">
              Korisničko ime
            </label>
            <input name="displayName" value={form.displayName} onChange={change}
              className="input" placeholder="Npr. MarkoV" minLength={2} maxLength={30} />
          </div>

          <div>
            <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">Email</label>
            <input name="email" type="email" value={form.email} onChange={change}
              className="input" placeholder="tvoj@email.com" required autoFocus />
          </div>

          <div>
            <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">Lozinka</label>
            <input name="password" type="password" value={form.password} onChange={change}
              className="input" placeholder="Min. 8 znakova" required />
          </div>

          <div>
            <label className="text-xs text-[var(--muted)] block mb-1.5 font-semibold">
              Potvrdi lozinku
            </label>
            <input name="confirm" type="password" value={form.confirm} onChange={change}
              className="input" placeholder="Ponovi lozinku" required />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full text-base mt-2">
            {loading ? "Registracija..." : "Registruj se"}
          </button>

          <p className="text-xs text-[var(--muted)] text-center">
            Registracijom prihvataš naše Uslove korištenja i Politiku privatnosti.
          </p>
        </form>

        <p className="text-center text-sm text-[var(--muted)] mt-6">
          Već imaš nalog?{" "}
          <Link to="/login" className="text-accent hover:underline font-semibold">
            Prijavi se
          </Link>
        </p>
      </div>
    </div>
  );
}
