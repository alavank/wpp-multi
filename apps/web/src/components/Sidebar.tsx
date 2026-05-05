import { ThemeToggle } from "./ThemeProvider";
import { useAuthStore } from "../stores/authStore";
import { supabase } from "../lib/supabaseClient";

export function Sidebar() {
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="w-16 bg-base-200 border-r border-base-300 flex flex-col items-center py-4 gap-2">
      <div className="avatar placeholder mb-4">
        <div className="bg-primary text-primary-content rounded-full w-10">
          <span className="text-sm font-semibold">W</span>
        </div>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        <SidebarButton label="Filas" icon="📥" active />
        <SidebarButton label="Contatos" icon="👤" />
        <SidebarButton label="Grupos" icon="👥" />
        <SidebarButton label="Agendamentos" icon="📅" />
        <SidebarButton label="Departamentos" icon="🏢" />
        <SidebarButton label="Usuários" icon="⚙️" />
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

function SidebarButton({
  label,
  icon,
  active,
}: {
  label: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      className={`btn btn-ghost btn-square ${active ? "btn-active" : ""}`}
    >
      <span aria-hidden>{icon}</span>
    </button>
  );
}
