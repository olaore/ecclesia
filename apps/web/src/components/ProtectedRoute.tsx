import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

/**
 * ProtectedRoute component handles authentication and role-based access control.
 * It redirects to /login if the user is not authenticated.
 * If roles are provided, it checks if the user's role matches any of the required roles.
 */
interface ProtectedRouteProps {
  allowedRoles?: Array<"sysadmin" | "superadmin" | "admin" | "user">;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { token, user } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to a forbidden page or back to dashboard if role is unauthorized
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
