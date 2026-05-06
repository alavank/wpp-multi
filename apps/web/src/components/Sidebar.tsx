import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeProvider";
import { useAuthStore } from "../stores/authStore";
import { supabase } from "../lib/supabaseClient";
import { Avatar } from "./Avatar";
import {
  IconActivity,
  IconBuilding,
  IconChat,
  IconLock,
  IconLogout,
  IconShield,
  IconUsers,
} from "./Icon";

type NavItem = { to: string; label: string; icon: ReactNode; match: (p: string) => boolean };

const NAV: NavItem[] = [
  { to: "/", label: "Conversas", icon: <IconChat />, match: (p) => p === "/" },
  {
    to: "/admin/monitor",
    label: "Monitor em tempo real",
    icon: <IconActivity />,
    match: (p) => p.startsWith("/admin/monitor"),
  },
  {
    to: "/admin/audit",
    label: "Auditoria",
    icon: <IconShield />,
    match: (p) => p.startsWith("/admin/audit"),
  },
  {
    to: "/admin/permissions",
    label: "Permissões",
    icon: <IconLock />,
    match: (p) => p.startsWith("/admin/permissions"),
  },
  {
    to: "/admin/departments",
    label: "Departamentos",
    icon: <IconBuilding />,
    match: (p) => p.startsWith("/admin/departments"),
  },
  {
    to: "/admin/users",
    label: "Usuários",
    icon: <IconUsers />,
    match: (p) => p.startsWith("/admin/users"),
  },
];

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  return (
    <aside className="w-60 shrink-0 flex flex-col gap-4 p-3">
      {/* Brand */}
      <div className="surface-soft px-4 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary text-primary-content font-bold">
            W
          </span>
          <span className="font-extrabold tracking-tight text-base-content">
            wpp<span className="text-primary">·</span>multi
          </span>
        </Link>
      </div>

      {/* Nav principal */}
      <nav className="surface-soft p-2 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = item.match(location.pathname);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-pill ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="grid place-items-center w-5 h-5 shrink-0">
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme + logout */}
      <div className="surface-soft p-3 flex items-center justify-between">
        <ThemeToggle />
        {user && (
          <button
            type="button"
            className="btn-icon"
            title={`Sair (${user.fullName})`}
            onClick={() => supabase.auth.signOut()}
            aria-label="Sair"
          >
            <IconLogout />
          </button>
        )}
      </div>

      {/* User card */}
      {user && (
        <div className="surface-soft p-3 flex items-center gap-3 mt-auto">
          <Avatar name={user.fullName} src={user.photoUrl ?? undefined} sizeClass="w-9" />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-base-content/50">
              Conectado
            </div>
            <div className="text-sm font-semibold truncate">{user.fullName}</div>
          </div>
        </div>
      )}
    </aside>
  );
}
