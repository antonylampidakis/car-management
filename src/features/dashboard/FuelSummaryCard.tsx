import { useEffect, useMemo, useState } from "react";
import { Fuel } from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useVehicle } from "../vehicles/VehicleContext";

type FuelEntry = {
  id: string;
  fuel_date: string;
  amount: number | null;
  price_per_liter: number | null;
  liters: number | null;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("el-GR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function FuelSummaryCard() {
  const { selectedVehicle } = useVehicle();

  const [entries, setEntries] =
    useState<FuelEntry[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadFuelSummary() {
      if (!selectedVehicle) {
        setEntries([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("fuel_entries")
        .select(
          `
          id,
          fuel_date,
          amount,
          price_per_liter,
          liters
        `
        )
        .eq(
          "vehicle_id",
          selectedVehicle.id
        )
        .order("fuel_date", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Fuel summary error:",
          error
        );

        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setEntries(
        (data ?? []).map((row) => ({
          id: row.id,
          fuel_date: row.fuel_date,
          amount:
            row.amount !== null
              ? Number(row.amount)
              : null,
          price_per_liter:
            row.price_per_liter !== null
              ? Number(
                  row.price_per_liter
                )
              : null,
          liters:
            row.liters !== null
              ? Number(row.liters)
              : null,
        }))
      );

      setLoading(false);
    }

    void loadFuelSummary();
  }, [selectedVehicle?.id]);

  const summary = useMemo(() => {
    const latest =
      entries.length > 0
        ? entries[0]
        : null;

    const validPrices = entries
      .map(
        (entry) =>
          entry.price_per_liter
      )
      .filter(
        (value): value is number =>
          value !== null &&
          Number.isFinite(value)
      );

    const averagePrice =
      validPrices.length > 0
        ? validPrices.reduce(
            (sum, value) =>
              sum + value,
            0
          ) / validPrices.length
        : null;

    const currentYear =
      new Date().getFullYear();

    const yearCost = entries.reduce(
      (sum, entry) => {
        const entryYear =
          new Date(
            entry.fuel_date
          ).getFullYear();

        if (
          entryYear !== currentYear
        ) {
          return sum;
        }

        return (
          sum +
          (entry.amount ?? 0)
        );
      },
      0
    );

    return {
      latest,
      averagePrice,
      yearCost,
    };
  }, [entries]);

  return (
    <section className="dashboard-card fuel-summary-card">
      <div className="dashboard-card-header">
        <div>
          <span className="dashboard-card-label">
            Καύσιμα
          </span>

          <h2>
            Σύνοψη ανεφοδιασμών
          </h2>
        </div>

        <Fuel size={20} />
      </div>

      {loading ? (
        <div className="dashboard-card-state">
          Φόρτωση...
        </div>
      ) : errorMessage ? (
        <div className="dashboard-card-state error">
          {errorMessage}
        </div>
      ) : !summary.latest ? (
        <div className="dashboard-card-state">
          Δεν υπάρχουν ακόμη
          ανεφοδιασμοί.
        </div>
      ) : (
        <div className="fuel-summary-content">
          <div className="fuel-summary-main">
            <span>
              Τελευταίος ανεφοδιασμός
            </span>

            <strong>
              {formatMoney(
                summary.latest.amount ?? 0
              )}
            </strong>

            <small>
              {formatDate(
                summary.latest.fuel_date
              )}
            </small>
          </div>

          <div className="fuel-summary-stats">
            <div>
              <span>
                Τελευταία τιμή
              </span>

              <strong>
                {summary.latest.price_per_liter !== null
                  ? `${formatPrice(
                      summary.latest.price_per_liter
                    )} €/L`
                  : "—"}
              </strong>
            </div>

            <div>
              <span>
                Μέση τιμή
              </span>

              <strong>
                {summary.averagePrice !== null
                  ? `${formatPrice(
                      summary.averagePrice
                    )} €/L`
                  : "—"}
              </strong>
            </div>

            <div>
              <span>
                Καύσιμα έτους
              </span>

              <strong>
                {formatMoney(
                  summary.yearCost
                )}
              </strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}