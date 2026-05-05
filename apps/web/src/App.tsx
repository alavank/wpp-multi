import { ThemeProvider } from "./components/ThemeProvider";
import { AppShell } from "./app/AppShell";

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
