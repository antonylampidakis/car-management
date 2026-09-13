import { useEffect, useState } from "react";
import { HeartPulse } from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useVehicle } from "../vehicles/VehicleContext";

type HealthSummary = {
  vehicle_id: string;
  total_items: number;
  ok_count: number;
  approaching_count: number;
  soon_count: number;
  needs_action_count: number;
  unknown_count: number;
};

export default function VehicleHealthCard() {
  const { selectedVehicle } = useVehicle();

  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      if (!selectedVehicle) {
        setSummary(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("vehicle_health_summary")
        .select("*")
        .eq("vehicle_id", selectedVehicle.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setSummary(null);
      } else {
        setSummary(data as HealthSummary | null);
      }

      setLoading(false);
    }

    void loadSummary();
  }, [selectedVehicle?.id]);

  return (
    <section className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-card-icon">
          <HeartPulse size={21} />
        </div>

        <span>Vehicle Health</span>
      </div>

      {loading ? (
        <div className="dashboard-card-loading">Φόρτωση...</div>
      ) : !summary ? (
        <>
          <div className="dashboard-big-value">—</div>
          <div className="dashboard-card-subtext">
            Δεν υπάρχουν ακόμη maintenance items.
          </div>
        </>
      ) : (
        <>
          <div className="dashboard-big-value">
            {summary.needs_action_count}
          </div>

          <div className="dashboard-card-subtext">
            χρειάζονται ενέργεια
          </div>

          <div className="health-mini-stats">
            <span>OK: {summary.ok_count}</span>
            <span>Πλησιάζουν: {summary.approaching_count}</span>
            <span>Σύντομα: {summary.soon_count}</span>
          </div>
        </>
      )}
    </section>
  );
}