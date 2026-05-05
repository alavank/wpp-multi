import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeProvider";
import { useAuthStore } from "../stores/authStore";
import { supabase } from "../lib/supabaseClient";

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  return (
    <aside className="w-16 bg-base-200 border-r border-base-300 flex flex-col items-center py-4 gap-2">
      <Link to="/" className="avatar placeholder mb-4">
        <div className="bg-primary text-primary-content rounded-full w-10">
          <span className="text-sm font-semibold">W</span>
        </div>
      </Link>
      <nav className="flex flex-col gap-1 flex-1">
        <NavBtn to="/" label="Filas" icon="📥" active={location.pathname === "/"} />
        <NavBtn
          to="/admin/departments"
          label="Departamentos"
          icon="🏢"
          active={location.pathname.startsWith("/admin/departments")}
        />
        <NavBtn
          to="/admin/users"
          label="Usuários"
          icon="⚙️"
          active={location.pathname.startsWith("/admin/users")}
        />
      </nav>
      <ThemeToggle />
      {user && (
        <button
          type="button"
          className="btn btn-ghost btn-square btn-sm"
          title={`Sair (${user.fullName})`}
          onClick={() => supabase.auth.signOut()}
        >
          ⎋
        </button>
      )}
    </aside>
  );
}

function NavBtn({
  to,
  label,
  icon,
  active,
}: {
  to: string;
  label: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      title={label}
      className={`btn btn-ghost btn-square ${active ? "btn-active" : ""}`}
      aria-label={label}
    >
      <span aria-hidden>{icon}</span>
    </Link>
  );
}
