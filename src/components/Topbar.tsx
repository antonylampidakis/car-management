import { useState } from "react";

import {
  LogOut,
  Plus,
} from "lucide-react";

import { supabase } from "../lib/supabase";

import { useVehicle } from "../features/vehicles/VehicleContext";

import QuickAddModal from "./QuickAddModal";

import NotificationCenter from "../features/notifications/NotificationCenter";

export default function Topbar() {
  const {
    vehicles,
    selectedVehicle,
    loading,
    selectVehicle,
  } = useVehicle();

  const [quickAddOpen, setQuickAddOpen] =
    useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-vehicle">
          <span className="topbar-label">
            Όχημα
          </span>

          {loading ? (
            <button
              type="button"
              className="vehicle-selector"
              disabled
            >
              Φόρτωση...
            </button>
          ) : vehicles.length === 0 ? (
            <button
              type="button"
              className="vehicle-selector"
              disabled
            >
              Δεν υπάρχει όχημα
            </button>
          ) : (
            <select
              className="vehicle-selector"
              value={selectedVehicle?.id ?? ""}
              onChange={(event) =>
                selectVehicle(event.target.value)
              }
            >
              {vehicles.map((vehicle) => (
                <option
                  key={vehicle.id}
                  value={vehicle.id}
                >
                  {vehicle.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="quick-add-button"
            disabled={!selectedVehicle}
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus size={18} />

            <span>
              Νέα καταχώρηση
            </span>
          </button>

          <NotificationCenter />

          <button
            type="button"
            className="icon-button"
            aria-label="Αποσύνδεση"
            onClick={() =>
              void handleLogout()
            }
          >
            <LogOut size={19} />
          </button>
        </div>
      </header>

      <QuickAddModal
        open={quickAddOpen}
        onClose={() =>
          setQuickAddOpen(false)
        }
      />
    </>
  );
}