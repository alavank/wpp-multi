import { ThemeProvider } from "./components/ThemeProvider";
import { Router } from "./app/router";
import { useBootstrapSession } from "./features/auth/useSession";

export default function App() {
  const { loading } = useBootstrapSession();
  return (
    <ThemeProvider>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-base-100 text-base-content">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <Router />
      )}
    </ThemeProvider>
  );
}
