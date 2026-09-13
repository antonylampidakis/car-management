import { useEffect, useState } from "react";
import { WalletCards } from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useVehicle } from "../vehicles/VehicleContext";

export default function YearCostCard() {
  const { selectedVehicle } = useVehicle();

  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCosts() {
      if (!selectedVehicle) {
        setTotalCost(0);
        setLoading(false);
        return;
      }

      setLoading(true);

      const year = new Date().getFullYear();

      const start = `${year}-01-01T00:00:00`;
      const end = `${year + 1}-01-01T00:00:00`;

      const { data, error } = await supabase
        .from("vehicle_cost_entries")
        .select("amount")
        .eq("vehicle_id", selectedVehicle.id)
        .gte("entry_date", start)
        .lt("entry_date", end);

      if (error) {
        console.error(error);
        setTotalCost(0);
      } else {
        const total = (data ?? []).reduce(
          (sum, row) => sum + Number(row.amount ?? 0),
          0
        );

        setTotalCost(total);
      }

      setLoading(false);
    }

    void loadCosts();
  }, [selectedVehicle?.id]);

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  }

  return (
    <section className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-card-icon">
          <WalletCards size={21} />
        </div>

        <span>Έξοδα έτους</span>
      </div>

      {loading ? (
        <div className="dashboard-card-loading">Φόρτωση...</div>
      ) : (
        <>
          <div className="dashboard-big-value">
            {formatCurrency(totalCost)}
          </div>

          <div className="dashboard-card-subtext">
            Συνολικό κόστος για {new Date().getFullYear()}
          </div>
        </>
      )}
    </section>
  );
}