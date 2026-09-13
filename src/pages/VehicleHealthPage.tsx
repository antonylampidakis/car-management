import { useState } from "react";

import VehicleHealthDashboard from "../features/maintenance/VehicleHealthDashboard";
import MaintenanceItemsManager from "../features/maintenance/MaintenanceItemsManager";

export default function VehicleHealthPage() {
  const [healthRefreshKey, setHealthRefreshKey] =
    useState(0);

  function handleMaintenanceChanged() {
    setHealthRefreshKey((value) => value + 1);
  }

  return (
    <div className="vehicle-health-page">

      <div className="page-header">
        <div>
          <h1>
            Vehicle Health
          </h1>

          <p>
            Κατάσταση συντήρησης,
            επόμενα service και
            maintenance intervals.
          </p>
        </div>
      </div>

      <VehicleHealthDashboard
        key={healthRefreshKey}
      />

      <div className="health-management-section">
        <div className="section-heading">
          <div>
            <h2>
              Ρυθμίσεις συντήρησης
            </h2>

            <p>
              Διαχείριση των
              maintenance items και
              των intervals του
              οχήματος.
            </p>
          </div>
        </div>

        <MaintenanceItemsManager
          onChanged={
            handleMaintenanceChanged
          }
        />
      </div>

    </div>
  );
}