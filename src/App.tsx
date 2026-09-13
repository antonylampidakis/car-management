import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { supabase } from "./lib/supabase";
import AnalyticsPage from "./pages/AnalyticsPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import HistoryPage from "./pages/HistoryPage";
import FuelPage from "./pages/FuelPage";
import ServicePage from "./pages/ServicePage";
import VehicleHealthPage from "./pages/VehicleHealthPage";
import ExpensesPage from "./pages/ExpensesPage";
import RemindersPage from "./pages/RemindersPage";
import DocumentsPage from "./pages/DocumentsPage";
import VehiclePage from "./pages/VehiclePage";
import SettingsPage from "./pages/SettingsPage";
import { VehicleProvider } from "./features/vehicles/VehicleContext";
import AppLayout from "./layouts/AppLayout";

import "./App.css";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(session);
        setAuthLoading(false);
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (authLoading) {
    return <div className="app-loading">Φόρτωση...</div>;
  }

  if (!session) {
    return (
      <LoginPage
        onAuthenticated={() => {
          // handled through onAuthStateChange
        }}
      />
    );
  }

  return (
  <VehicleProvider>
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          index
          element={<Navigate to="/dashboard" replace />}
        />

        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        <Route
          path="/history"
          element={<HistoryPage />}
        />

        <Route
          path="/fuel"
          element={<FuelPage />}
        />

        <Route
          path="/service"
          element={<ServicePage />}
        />

        <Route
          path="/health"
          element={<VehicleHealthPage />}
        />

        <Route
          path="/expenses"
          element={<ExpensesPage />}
        />

        <Route
          path="/reminders"
          element={<RemindersPage />}
        />

        <Route
          path="/analytics"
          element={<AnalyticsPage />}
        />

        <Route
          path="/documents"
          element={<DocumentsPage />}
        />

        <Route
          path="/vehicle"
          element={<VehiclePage />}
        />

        <Route
          path="/settings"
          element={<SettingsPage />}
        />

        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />
      </Route>
    </Routes>
  </VehicleProvider>
);
}