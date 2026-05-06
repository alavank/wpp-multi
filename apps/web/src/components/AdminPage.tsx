import type { PropsWithChildren, ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  maxWidth?: string;
}>;

export function AdminPage({
  title,
  subtitle,
  actions,
  maxWidth = "max-w-6xl",
  children,
}: Props) {
  return (
    <div className="min-h-screen p-3 sm:p-5 lg:p-6">
      <div className="surface-card min-h-[calc(100vh-3rem)] flex flex-col">
        <header className="flex items-center justify-between gap-4 px-6 py-5 border-b divider-hair">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/"
              className="btn-icon"
              aria-label="Voltar"
              title="Voltar para conversas"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight truncate">{title}</h1>
              {subtitle && (
                <p className="text-sm text-base-content/55 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          {actions}
        </header>

        <main className={`flex-1 overflow-y-auto scrollbar-soft px-6 py-6`}>
          <div className={`${maxWidth} mx-auto space-y-6`}>{children}</div>
        </main>
      </div>
    </div>
  );
}
