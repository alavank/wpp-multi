import { Navigate, useLocation } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { useAuthStore } from "../stores/authStore";

export function RequireAuth({ children }: PropsWithChildren) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
