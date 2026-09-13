import {
  Car,
  CircleAlert,
} from "lucide-react";

import { useVehicle } from "../features/vehicles/VehicleContext";
import AddVehicleForm from "../features/vehicles/AddVehicleForm";
import OdometerCard from "../features/vehicles/OdometerCard";
import VehicleHealthCard from "../features/maintenance/VehicleHealthCard";
import YearCostCard from "../features/expenses/YearCostCard";
import RemindersCard from "../features/reminders/RemindersCard";
import RecentActivityCard from "../features/dashboard/RecentActivityCard";
import FuelSummaryCard from "../features/dashboard/FuelSummaryCard";
import AlertsCard from "../features/dashboard/AlertsCard";

export default function DashboardPage() {
  const {
    selectedVehicle,
    loading,
    error,
  } = useVehicle();

  if (loading) {
    return (
      <div className="page-state">
        Φόρτωση οχημάτων...
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-state error">
        <CircleAlert size={22} />

        <div>
          <strong>
            Αποτυχία φόρτωσης οχημάτων
          </strong>

          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!selectedVehicle) {
    return (
      <div className="dashboard-empty">
        <div className="empty-state">
          <div className="empty-state-icon">
            <Car size={28} />
          </div>

          <h1>
            Καλώς ήρθες στο Car Management
          </h1>

          <p>
            Δεν υπάρχει ακόμη καταχωρημένο
            όχημα. Πρόσθεσε το πρώτο σου
            όχημα για να ξεκινήσεις.
          </p>
        </div>

        <AddVehicleForm />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>

          <p>
            Σύνοψη για{" "}
            <strong>
              {selectedVehicle.name}
            </strong>
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        <OdometerCard />
        <YearCostCard />
        <VehicleHealthCard />
        <RemindersCard />
        <RecentActivityCard />
        <FuelSummaryCard />
        <AlertsCard />
      </div>
    </div>
  );
}