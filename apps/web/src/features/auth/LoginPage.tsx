import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { apiFetch } from "../../lib/apiClient";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    apiFetch("/users/login-event", { method: "POST" }).catch(() => undefined);
    navigate(from, { replace: true });
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="surface-card w-full max-w-md p-8 sm:p-10 animate-scale-in">
        <div className="flex items-center gap-2 mb-8">
          <span className="grid place-items-center w-10 h-10 rounded-2xl bg-primary text-primary-content font-bold">
            W
          </span>
          <span className="font-extrabold text-xl tracking-tight">
            wpp<span className="text-primary">·</span>multi
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight">Bem-vindo de volta</h1>
        <p className="text-sm text-base-content/60 mt-1">
          Acesse com seu e-mail corporativo para continuar.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-xs font-semibold text-base-content/70 mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              className="input-flat"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="voce@empresa.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-base-content/70 mb-1.5">
              Senha
            </label>
            <input
              type="password"
              className="input-flat"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="text-sm text-error bg-error/10 rounded-2xl px-4 py-3"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-flat-primary w-full mt-2 py-3"
            disabled={loading}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
