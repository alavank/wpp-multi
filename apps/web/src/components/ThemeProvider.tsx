import { useEffect, type PropsWithChildren } from "react";
import { useThemeStore } from "../stores/themeStore";
import { IconMoon, IconSun } from "./Icon";

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
  const isLight = theme === "light";
  return (
    <div
      role="group"
      aria-label="Alternar tema"
      className="inline-flex items-center bg-base-200 rounded-full p-1"
    >
      <button
        type="button"
        onClick={() => !isLight && toggle()}
        className={`w-7 h-7 rounded-full grid place-items-center transition ${
          isLight ? "bg-primary text-primary-content shadow" : "text-base-content/60"
        }`}
        aria-label="Tema claro"
      >
        <IconSun size={14} />
      </button>
      <button
        type="button"
        onClick={() => isLight && toggle()}
        className={`w-7 h-7 rounded-full grid place-items-center transition ${
          !isLight ? "bg-primary text-primary-content shadow" : "text-base-content/60"
        }`}
        aria-label="Tema escuro"
      >
        <IconMoon size={14} />
      </button>
    </div>
  );
}
