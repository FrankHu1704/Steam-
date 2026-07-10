import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, type Role } from "../context/AuthContext";

export function ProtectedRoute({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: Role;
}) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">A carregar…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (requireRole && role !== requireRole) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
