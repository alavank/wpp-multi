import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppShell } from "./AppShell";
import { LoginPage } from "../features/auth/LoginPage";
import { RequireAuth } from "./RequireAuth";
import { DepartmentsPage } from "../features/departments/DepartmentsPage";
import { SecretariasPage } from "../features/secretarias/SecretariasPage";
import { UsersPage } from "../features/users/UsersPage";
import { PermissionsPage } from "../features/permissions/PermissionsPage";
import { AuditPage } from "../features/audit/AuditPage";
import { MonitorTimeline } from "../features/monitor/MonitorTimeline";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
  },
  {
    path: "/admin/secretarias",
    element: <RequireAuth><SecretariasPage /></RequireAuth>,
  },
  {
    path: "/admin/departments",
    element: <RequireAuth><DepartmentsPage /></RequireAuth>,
  },
  {
    path: "/admin/users",
    element: <RequireAuth><UsersPage /></RequireAuth>,
  },
  {
    path: "/admin/permissions",
    element: <RequireAuth><PermissionsPage /></RequireAuth>,
  },
  {
    path: "/admin/audit",
    element: <RequireAuth><AuditPage /></RequireAuth>,
  },
  {
    path: "/admin/monitor",
    element: <RequireAuth><MonitorTimeline /></RequireAuth>,
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
