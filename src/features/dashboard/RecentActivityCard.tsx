import { useEffect, useState } from "react";
import {
  Banknote,
  Fuel,
  Gauge,
  Wrench,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useVehicle } from "../vehicles/VehicleContext";

type ActivityType =
  | "fuel"
  | "service"
  | "expense"
  | "odometer";

type ActivityItem = {
  id: string;
  type: ActivityType;
  date: string;
  title: string;
  amount: number | null;
  odometerKm: number | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatKm(value: number) {
  return new Intl.NumberFormat("el-GR").format(
    value
  );
}

function ActivityIcon({
  type,
}: {
  type: ActivityType;
}) {
  switch (type) {
    case "fuel":
      return <Fuel size={17} />;

    case "service":
      return <Wrench size={17} />;

    case "expense":
      return <Banknote size={17} />;

    case "odometer":
      return <Gauge size={17} />;
  }
}

export default function RecentActivityCard() {
  const { selectedVehicle } = useVehicle();

  const [activities, setActivities] =
    useState<ActivityItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadRecentActivity() {
      if (!selectedVehicle) {
        setActivities([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const [
        fuelResult,
        serviceResult,
        expenseResult,
        odometerResult,
      ] = await Promise.all([
        supabase
          .from("fuel_entries")
          .select(
            "id, fuel_date, amount, created_at"
          )
          .eq(
            "vehicle_id",
            selectedVehicle.id
          )
          .order("fuel_date", {
            ascending: false,
          })
          .limit(5),

        supabase
          .from("service_records")
          .select(
            `
            id,
            service_date,
            description,
            total_cost,
            labor_cost,
            parts_cost,
            other_cost,
            created_at
          `
          )
          .eq(
            "vehicle_id",
            selectedVehicle.id
          )
          .order("service_date", {
            ascending: false,
          })
          .limit(5),

        supabase
          .from("expenses")
          .select(
            `
            id,
            expense_date,
            description,
            amount,
            created_at
          `
          )
          .eq(
            "vehicle_id",
            selectedVehicle.id
          )
          .order("expense_date", {
            ascending: false,
          })
          .limit(5),

        supabase
          .from("odometer_entries")
          .select(
            `
            id,
            odometer_km,
            recorded_at,
            source_type,
            created_at
          `
          )
          .eq(
            "vehicle_id",
            selectedVehicle.id
          )
          .order("recorded_at", {
            ascending: false,
          })
          .limit(10),
      ]);

      const firstError =
        fuelResult.error ??
        serviceResult.error ??
        expenseResult.error ??
        odometerResult.error;

      if (firstError) {
        console.error(
          "Recent activity error:",
          firstError
        );

        setErrorMessage(
          firstError.message
        );

        setLoading(false);
        return;
      }

      const result: ActivityItem[] = [];

      for (
        const row of fuelResult.data ?? []
      ) {
        result.push({
          id: `fuel-${row.id}`,
          type: "fuel",
          date:
            row.fuel_date ??
            row.created_at,
          title: "Ανεφοδιασμός",
          amount:
            row.amount !== null
              ? Number(row.amount)
              : null,
          odometerKm: null,
        });
      }

      for (
        const row of
          serviceResult.data ?? []
      ) {
        const calculatedTotal =
          Number(row.labor_cost ?? 0) +
          Number(row.parts_cost ?? 0) +
          Number(row.other_cost ?? 0);

        const amount =
          row.total_cost !== null
            ? Number(row.total_cost)
            : calculatedTotal > 0
              ? calculatedTotal
              : null;

        result.push({
          id: `service-${row.id}`,
          type: "service",
          date:
            row.service_date ??
            row.created_at,
          title:
            row.description ||
            "Service / Επισκευή",
          amount,
          odometerKm: null,
        });
      }

      for (
        const row of
          expenseResult.data ?? []
      ) {
        result.push({
          id: `expense-${row.id}`,
          type: "expense",
          date:
            row.expense_date ??
            row.created_at,
          title:
            row.description ||
            "Έξοδο",
          amount:
            row.amount !== null
              ? Number(row.amount)
              : null,
          odometerKm: null,
        });
      }

      for (
        const row of
          odometerResult.data ?? []
      ) {
        /*
         * Fuel και Service δημιουργούν
         * ήδη odometer entries.
         *
         * Τα αγνοούμε εδώ για να μην
         * εμφανίζεται η ίδια ενέργεια
         * δύο φορές.
         */
        if (
          row.source_type === "fuel" ||
          row.source_type === "service"
        ) {
          continue;
        }

        result.push({
          id: `odometer-${row.id}`,
          type: "odometer",
          date:
            row.recorded_at ??
            row.created_at,
          title:
            "Καταχώρηση χιλιομέτρων",
          amount: null,
          odometerKm:
            row.odometer_km !== null
              ? Number(
                  row.odometer_km
                )
              : null,
        });
      }

      result.sort(
        (a, b) =>
          new Date(b.date).getTime() -
          new Date(a.date).getTime()
      );

      setActivities(
        result.slice(0, 5)
      );

      setLoading(false);
    }

    void loadRecentActivity();
  }, [selectedVehicle?.id]);

  return (
    <section className="dashboard-card recent-activity-card">
      <div className="dashboard-card-header">
        <div>
          <span className="dashboard-card-label">
            Πρόσφατη δραστηριότητα
          </span>

          <h2>
            Τελευταίες καταχωρήσεις
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-card-state">
          Φόρτωση...
        </div>
      ) : errorMessage ? (
        <div className="dashboard-card-state error">
          {errorMessage}
        </div>
      ) : activities.length === 0 ? (
        <div className="dashboard-card-state">
          Δεν υπάρχουν ακόμη
          καταχωρήσεις.
        </div>
      ) : (
        <div className="recent-activity-list">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="recent-activity-item"
            >
              <div className="recent-activity-icon">
                <ActivityIcon
                  type={activity.type}
                />
              </div>

              <div className="recent-activity-main">
                <strong>
                  {activity.title}
                </strong>

                <span>
                  {formatDate(activity.date)}
                </span>
              </div>

              <div className="recent-activity-value">
                {activity.amount !== null ? (
                  <strong>
                    {formatMoney(
                      activity.amount
                    )}
                  </strong>
                ) : activity.odometerKm !==
                  null ? (
                  <strong>
                    {formatKm(
                      activity.odometerKm
                    )}{" "}
                    km
                  </strong>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}