// Two small route guards used in App.jsx:
//
// - ProtectedRoute: wraps pages that require login (Dashboard, Workflows, etc).
//   If there's no logged-in user, it redirects to /login.
//
// - GuestRoute: wraps the Login/Register pages.
//   If the user is already logged in, it redirects to /dashboard
//   (so a logged-in user can't see the login form again).

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export const ProtectedRoute = () => {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export const GuestRoute = ({ children }) => {
  const token = useAuthStore((state) => state.token);

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
