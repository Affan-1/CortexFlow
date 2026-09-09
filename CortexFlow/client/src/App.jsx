import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import {
  ProtectedRoute,
  GuestRoute,
} from "./components/ProtectedRoute";

import DashboardLayout from "./layouts/DashboardLayout";

import Dashboard from "./pages/Dashboard";
import Workflows from "./pages/Workflows";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import Templates from "./pages/Templates";
import Executions from "./pages/Executions";
import ExecutionDetail from "./pages/ExecutionDetail";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UpgradePlan from "./pages/UpgradePlan";
import SearchPage from "./pages/SearchPage";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* =========================
            AUTH ROUTES
        ========================== */}

        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />

        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />

        {/* =========================
            PROTECTED APPLICATION
        ========================== */}

        <Route element={<ProtectedRoute />}>
          {/* Main dashboard layout */}
          <Route element={<DashboardLayout />}>
            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            {/* Workflows */}
            <Route
              path="/workflows"
              element={<Workflows />}
            />

            {/* Templates */}
            <Route
              path="/templates"
              element={<Templates />}
            />

            {/* Executions */}
            <Route
              path="/executions"
              element={<Executions />}
            />

            {/* Execution detail */}
            <Route
              path="/executions/:id"
              element={<ExecutionDetail />}
            />

            {/* Integrations */}
            <Route
              path="/integrations"
              element={<Integrations />}
            />

            {/* Settings */}
            <Route
              path="/settings"
              element={<Settings />}
            />

            {/* Search */}
            <Route
              path="/search"
              element={<SearchPage />}
            />

            {/* Upgrade */}
            <Route
              path="/upgrade"
              element={<UpgradePlan />}
            />
          </Route>

          {/* =========================
              WORKFLOW BUILDER
          ========================== */}

          {/* New workflow */}
          <Route
            path="/workflows/new"
            element={<WorkflowBuilder />}
          />

          {/* Edit workflow */}
          <Route
            path="/workflows/:id"
            element={<WorkflowBuilder />}
          />
        </Route>

        {/* =========================
            DEFAULT ROUTE
        ========================== */}

        <Route
          path="/"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

        {/* =========================
            UNKNOWN ROUTES
        ========================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;