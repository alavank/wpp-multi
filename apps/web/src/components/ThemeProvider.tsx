import { useEffect, type PropsWithChildren } from "react";
import { useThemeStore } from "../stores/themeStore";

export function ThemeProvider({ children }: PropsWithChildren) {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return <>{children}</>;
}

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={toggle}
      aria-label="Alternar tema"
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
