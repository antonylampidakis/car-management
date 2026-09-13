import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BarChart3,
  Fuel,
  Gauge,
  Wallet,
  Wrench,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useVehicle } from "../features/vehicles/VehicleContext";

type FuelEntry = {
  id: string;
  vehicle_id: string;
  odometer_entry_id: string | null;
  fuel_date: string;
  amount: number | null;
  liters: number | null;
  price_per_liter: number | null;
  is_full_tank: boolean;
};

type ServiceRecord = {
  id: string;
  vehicle_id: string;
  service_date: string;
  total_cost: number | null;
  labor_cost: number | null;
  parts_cost: number | null;
  other_cost: number | null;
};

type Expense = {
  id: string;
  vehicle_id: string;
  amount: number | null;
  expense_date: string;
};

type OdometerEntry = {
  id: string;
  vehicle_id: string;
  odometer_km: number;
  recorded_at: string;
};

type CostEntry = {
  id: string;
  type: "fuel" | "service" | "expense";
  date: string;
  amount: number;
};

type MonthlySummary = {
  key: string;
  label: string;
  fuel: number;
  service: number;
  expenses: number;
  total: number;
};

type YearSummary = {
  year: number;
  fuel: number;
  service: number;
  expenses: number;
  total: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat(
    "el-GR",
    {
      style: "currency",
      currency: "EUR",
    }
  ).format(value);
}

function formatNumber(
  value: number,
  digits = 2
) {
  return new Intl.NumberFormat(
    "el-GR",
    {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }
  ).format(value);
}

function formatKm(value: number) {
  return new Intl.NumberFormat(
    "el-GR"
  ).format(value);
}

function serviceTotal(
  row: ServiceRecord
) {
  if (row.total_cost !== null) {
    return Number(
      row.total_cost
    );
  }

  return (
    Number(
      row.labor_cost ?? 0
    ) +
    Number(
      row.parts_cost ?? 0
    ) +
    Number(
      row.other_cost ?? 0
    )
  );
}

export default function AnalyticsPage() {
  const { selectedVehicle } =
    useVehicle();

  const [
    fuelEntries,
    setFuelEntries,
  ] = useState<FuelEntry[]>([]);

  const [
    serviceRecords,
    setServiceRecords,
  ] = useState<
    ServiceRecord[]
  >([]);

  const [
    expenses,
    setExpenses,
  ] = useState<Expense[]>([]);

  const [
    odometerEntries,
    setOdometerEntries,
  ] = useState<
    OdometerEntry[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    selectedYear,
    setSelectedYear,
  ] = useState<string>("all");

  async function loadAnalytics() {
    if (!selectedVehicle) {
      setFuelEntries([]);
      setServiceRecords([]);
      setExpenses([]);
      setOdometerEntries([]);
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
        .select("*")
        .eq(
          "vehicle_id",
          selectedVehicle.id
        ),

      supabase
        .from("service_records")
        .select("*")
        .eq(
          "vehicle_id",
          selectedVehicle.id
        ),

      supabase
        .from("expenses")
        .select("*")
        .eq(
          "vehicle_id",
          selectedVehicle.id
        ),

      supabase
        .from("odometer_entries")
        .select("*")
        .eq(
          "vehicle_id",
          selectedVehicle.id
        )
        .order(
          "recorded_at",
          {
            ascending: true,
          }
        ),
    ]);

    const errors = [
      fuelResult.error,
      serviceResult.error,
      expenseResult.error,
      odometerResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      setErrorMessage(
        errors
          .map(
            (error) =>
              error?.message
          )
          .filter(Boolean)
          .join(" | ")
      );

      setLoading(false);
      return;
    }

    setFuelEntries(
      (fuelResult.data ??
        []) as FuelEntry[]
    );

    setServiceRecords(
      (serviceResult.data ??
        []) as ServiceRecord[]
    );

    setExpenses(
      (expenseResult.data ??
        []) as Expense[]
    );

    setOdometerEntries(
      (odometerResult.data ??
        []) as OdometerEntry[]
    );

    setLoading(false);
  }

  useEffect(() => {
    void loadAnalytics();
  }, [selectedVehicle?.id]);

  const availableYears =
    useMemo(() => {
      const years =
        new Set<number>();

      for (
        const row of
          fuelEntries
      ) {
        years.add(
          new Date(
            row.fuel_date
          ).getFullYear()
        );
      }

      for (
        const row of
          serviceRecords
      ) {
        years.add(
          new Date(
            row.service_date
          ).getFullYear()
        );
      }

      for (
        const row of expenses
      ) {
        years.add(
          new Date(
            row.expense_date
          ).getFullYear()
        );
      }

      return [
        ...years,
      ].sort(
        (a, b) => b - a
      );
    }, [
      fuelEntries,
      serviceRecords,
      expenses,
    ]);

  const costEntries =
    useMemo(() => {
      const rows: CostEntry[] = [];

      for (
        const row of
          fuelEntries
      ) {
        const amount =
          Number(
            row.amount ?? 0
          );

        if (amount > 0) {
          rows.push({
            id:
              `fuel-${row.id}`,

            type: "fuel",

            date:
              row.fuel_date,

            amount,
          });
        }
      }

      for (
        const row of
          serviceRecords
      ) {
        const amount =
          serviceTotal(row);

        if (amount > 0) {
          rows.push({
            id:
              `service-${row.id}`,

            type: "service",

            date:
              row.service_date,

            amount,
          });
        }
      }

      for (
        const row of
          expenses
      ) {
        const amount =
          Number(
            row.amount ?? 0
          );

        if (amount > 0) {
          rows.push({
            id:
              `expense-${row.id}`,

            type: "expense",

            date:
              row.expense_date,

            amount,
          });
        }
      }

      return rows;
    }, [
      fuelEntries,
      serviceRecords,
      expenses,
    ]);

  const filteredCosts =
    useMemo(() => {
      if (
        selectedYear === "all"
      ) {
        return costEntries;
      }

      const year =
        Number(selectedYear);

      return costEntries.filter(
        (row) =>
          new Date(
            row.date
          ).getFullYear() ===
          year
      );
    }, [
      costEntries,
      selectedYear,
    ]);

  const filteredFuel =
    useMemo(() => {
      if (
        selectedYear === "all"
      ) {
        return fuelEntries;
      }

      const year =
        Number(selectedYear);

      return fuelEntries.filter(
        (row) =>
          new Date(
            row.fuel_date
          ).getFullYear() ===
          year
      );
    }, [
      fuelEntries,
      selectedYear,
    ]);

  const filteredOdometer =
    useMemo(() => {
      if (
        selectedYear === "all"
      ) {
        return odometerEntries;
      }

      const year =
        Number(selectedYear);

      return odometerEntries.filter(
        (row) =>
          new Date(
            row.recorded_at
          ).getFullYear() ===
          year
      );
    }, [
      odometerEntries,
      selectedYear,
    ]);

  const summary =
    useMemo(() => {
      let fuelCost = 0;
      let serviceCost = 0;
      let otherCost = 0;

      for (
        const row of
          filteredCosts
      ) {
        if (
          row.type ===
          "fuel"
        ) {
          fuelCost +=
            row.amount;
        }

        if (
          row.type ===
          "service"
        ) {
          serviceCost +=
            row.amount;
        }

        if (
          row.type ===
          "expense"
        ) {
          otherCost +=
            row.amount;
        }
      }

      const totalCost =
        fuelCost +
        serviceCost +
        otherCost;

      const totalLiters =
        filteredFuel.reduce(
          (sum, row) =>
            sum +
            Number(
              row.liters ?? 0
            ),
          0
        );

      let distance = 0;

      if (
        filteredOdometer.length >= 2
      ) {
        const first =
          filteredOdometer[0]
            .odometer_km;

        const last =
          filteredOdometer[
            filteredOdometer.length -
              1
          ].odometer_km;

        distance =
          Math.max(
            0,
            last - first
          );
      }

      const costPerKm =
        distance > 0
          ? totalCost /
            distance
          : null;

      return {
        fuelCost,
        serviceCost,
        otherCost,
        totalCost,
        totalLiters,
        distance,
        costPerKm,
      };
    }, [
      filteredCosts,
      filteredFuel,
      filteredOdometer,
    ]);

  const averageConsumption =
    useMemo(() => {
      const odometerMap =
        new Map<
          string,
          number
        >();

      for (
        const row of
          odometerEntries
      ) {
        odometerMap.set(
          row.id,
          row.odometer_km
        );
      }

      const fuelRows =
        [...filteredFuel]
          .map((row) => ({
            ...row,

            odometer_km:
              row.odometer_entry_id
                ? odometerMap.get(
                    row.odometer_entry_id
                  ) ?? null
                : null,
          }))
          .sort(
            (a, b) =>
              new Date(
                a.fuel_date
              ).getTime() -
              new Date(
                b.fuel_date
              ).getTime()
          );

      const consumptions:
        number[] = [];

      let previousFull:
        | typeof fuelRows[number]
        | null = null;

      let accumulatedLiters =
        0;

      for (
        const row of fuelRows
      ) {
        accumulatedLiters +=
          Number(
            row.liters ?? 0
          );

        if (
          !row.is_full_tank
        ) {
          continue;
        }

        if (
          previousFull &&
          previousFull.odometer_km !==
            null &&
          row.odometer_km !==
            null
        ) {
          const distance =
            row.odometer_km -
            previousFull.odometer_km;

          if (
            distance > 0 &&
            accumulatedLiters > 0
          ) {
            consumptions.push(
              (
                accumulatedLiters /
                distance
              ) * 100
            );
          }
        }

        previousFull = row;
        accumulatedLiters = 0;
      }

      if (
        consumptions.length === 0
      ) {
        return null;
      }

      return (
        consumptions.reduce(
          (sum, value) =>
            sum + value,
          0
        ) /
        consumptions.length
      );
    }, [
      filteredFuel,
      odometerEntries,
    ]);

  const monthlySummary =
    useMemo(() => {
      const map =
        new Map<
          string,
          MonthlySummary
        >();

      for (
        const row of
          filteredCosts
      ) {
        const date =
          new Date(row.date);

        const key =
          `${date.getFullYear()}-` +
          `${String(
            date.getMonth() + 1
          ).padStart(
            2,
            "0"
          )}`;

        const label =
          new Intl.DateTimeFormat(
            "el-GR",
            {
              month: "short",
              year: "numeric",
            }
          ).format(date);

        const current =
          map.get(key) ?? {
            key,
            label,

            fuel: 0,
            service: 0,
            expenses: 0,
            total: 0,
          };

        if (
          row.type ===
          "fuel"
        ) {
          current.fuel +=
            row.amount;
        }

        if (
          row.type ===
          "service"
        ) {
          current.service +=
            row.amount;
        }

        if (
          row.type ===
          "expense"
        ) {
          current.expenses +=
            row.amount;
        }

        current.total +=
          row.amount;

        map.set(
          key,
          current
        );
      }

      return [
        ...map.values(),
      ].sort(
        (a, b) =>
          a.key.localeCompare(
            b.key
          )
      );
    }, [filteredCosts]);

  const yearSummary =
    useMemo(() => {
      const map =
        new Map<
          number,
          YearSummary
        >();

      for (
        const row of
          costEntries
      ) {
        const year =
          new Date(
            row.date
          ).getFullYear();

        const current =
          map.get(year) ?? {
            year,
            fuel: 0,
            service: 0,
            expenses: 0,
            total: 0,
          };

        if (
          row.type ===
          "fuel"
        ) {
          current.fuel +=
            row.amount;
        }

        if (
          row.type ===
          "service"
        ) {
          current.service +=
            row.amount;
        }

        if (
          row.type ===
          "expense"
        ) {
          current.expenses +=
            row.amount;
        }

        current.total +=
          row.amount;

        map.set(
          year,
          current
        );
      }

      return [
        ...map.values(),
      ].sort(
        (a, b) =>
          b.year - a.year
      );
    }, [costEntries]);

  const maxMonthlyCost =
    useMemo(() => {
      return Math.max(
        1,
        ...monthlySummary.map(
          (row) =>
            row.total
        )
      );
    }, [monthlySummary]);

  if (!selectedVehicle) {
    return (
      <div className="page-content">

        <div className="page-header">
          <div>
            <h1>
              Analytics
            </h1>

            <p>
              Επίλεξε πρώτα
              όχημα.
            </p>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="page-content">

      <div className="page-header">

        <div>
          <h1>
            Analytics
          </h1>

          <p>
            Οικονομικά,
            κατανάλωση,
            χιλιόμετρα και
            συνολική εικόνα
            χρήσης του οχήματος.
          </p>
        </div>


        <select
          className="analytics-year-filter"
          value={
            selectedYear
          }
          onChange={(
            event
          ) =>
            setSelectedYear(
              event.target.value
            )
          }
        >
          <option value="all">
            Όλα τα έτη
          </option>

          {availableYears.map(
            (year) => (
              <option
                key={year}
                value={year}
              >
                {year}
              </option>
            )
          )}
        </select>

      </div>


      {errorMessage && (
        <div className="form-error">
          {errorMessage}
        </div>
      )}


      {loading ? (
        <div className="analytics-empty">
          Φόρτωση
          analytics...
        </div>
      ) : (
        <>

          <div className="analytics-summary-grid">

            <div className="analytics-summary-card">

              <div className="analytics-summary-icon">
                <Wallet
                  size={19}
                />
              </div>

              <span>
                Συνολικό κόστος
              </span>

              <strong>
                {formatMoney(
                  summary.totalCost
                )}
              </strong>

            </div>


            <div className="analytics-summary-card">

              <div className="analytics-summary-icon">
                <Gauge
                  size={19}
                />
              </div>

              <span>
                Χιλιόμετρα
              </span>

              <strong>
                {formatKm(
                  summary.distance
                )}{" "}
                km
              </strong>

            </div>


            <div className="analytics-summary-card">

              <div className="analytics-summary-icon">
                <BarChart3
                  size={19}
                />
              </div>

              <span>
                Κόστος / km
              </span>

              <strong>
                {summary.costPerKm !==
                null
                  ? `${formatNumber(
                      summary.costPerKm,
                      3
                    )} €/km`
                  : "—"}
              </strong>

            </div>


            <div className="analytics-summary-card">

              <div className="analytics-summary-icon">
                <Fuel
                  size={19}
                />
              </div>

              <span>
                Μέση κατανάλωση
              </span>

              <strong>
                {averageConsumption !==
                null
                  ? `${formatNumber(
                      averageConsumption,
                      2
                    )} L/100 km`
                  : "—"}
              </strong>

            </div>

          </div>


          <div className="analytics-cost-grid">

            <div className="analytics-cost-card">

              <div className="analytics-cost-heading">

                <Fuel
                  size={18}
                />

                <span>
                  Καύσιμα
                </span>

              </div>

              <strong>
                {formatMoney(
                  summary.fuelCost
                )}
              </strong>

              <small>
                {summary.totalLiters >
                0
                  ? `${formatNumber(
                      summary.totalLiters,
                      1
                    )} L συνολικά`
                  : "Χωρίς δεδομένα λίτρων"}
              </small>

            </div>


            <div className="analytics-cost-card">

              <div className="analytics-cost-heading">

                <Wrench
                  size={18}
                />

                <span>
                  Service /
                  Επισκευές
                </span>

              </div>

              <strong>
                {formatMoney(
                  summary.serviceCost
                )}
              </strong>

            </div>


            <div className="analytics-cost-card">

              <div className="analytics-cost-heading">

                <Wallet
                  size={18}
                />

                <span>
                  Λοιπά έξοδα
                </span>

              </div>

              <strong>
                {formatMoney(
                  summary.otherCost
                )}
              </strong>

            </div>

          </div>


          <div className="analytics-section">

            <div className="analytics-section-header">

              <div>
                <h2>
                  Κόστος ανά μήνα
                </h2>

                <p>
                  Σύνολο
                  οικονομικών
                  κινήσεων ανά
                  μήνα.
                </p>
              </div>

            </div>


            {monthlySummary.length ===
            0 ? (
              <div className="analytics-empty-inline">
                Δεν υπάρχουν
                δεδομένα για την
                επιλεγμένη
                περίοδο.
              </div>
            ) : (
              <div className="analytics-month-list">

                {monthlySummary.map(
                  (month) => {
                    const width =
                      (
                        month.total /
                        maxMonthlyCost
                      ) * 100;

                    return (
                      <div
                        key={
                          month.key
                        }
                        className="analytics-month-row"
                      >

                        <div className="analytics-month-info">

                          <strong>
                            {
                              month.label
                            }
                          </strong>

                          <span>
                            {formatMoney(
                              month.total
                            )}
                          </span>

                        </div>


                        <div className="analytics-month-bar">

                          <div
                            className="analytics-month-bar-fill"
                            style={{
                              width: `${width}%`,
                            }}
                          />

                        </div>


                        <div className="analytics-month-breakdown">

                          <span>
                            Καύσιμα{" "}
                            {formatMoney(
                              month.fuel
                            )}
                          </span>

                          <span>
                            Service{" "}
                            {formatMoney(
                              month.service
                            )}
                          </span>

                          <span>
                            Λοιπά{" "}
                            {formatMoney(
                              month.expenses
                            )}
                          </span>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>


          <div className="analytics-section">

            <div className="analytics-section-header">

              <div>
                <h2>
                  Σύγκριση ανά έτος
                </h2>

                <p>
                  Ετήσια ανάλυση
                  κόστους του
                  οχήματος.
                </p>
              </div>

            </div>


            {yearSummary.length ===
            0 ? (
              <div className="analytics-empty-inline">
                Δεν υπάρχουν
                οικονομικά
                δεδομένα.
              </div>
            ) : (
              <div className="analytics-year-table-wrapper">

                <table className="analytics-year-table">

                  <thead>
                    <tr>
                      <th>
                        Έτος
                      </th>

                      <th>
                        Καύσιμα
                      </th>

                      <th>
                        Service
                      </th>

                      <th>
                        Λοιπά
                      </th>

                      <th>
                        Σύνολο
                      </th>
                    </tr>
                  </thead>


                  <tbody>

                    {yearSummary.map(
                      (year) => (
                        <tr
                          key={
                            year.year
                          }
                        >
                          <td>
                            <strong>
                              {
                                year.year
                              }
                            </strong>
                          </td>

                          <td>
                            {formatMoney(
                              year.fuel
                            )}
                          </td>

                          <td>
                            {formatMoney(
                              year.service
                            )}
                          </td>

                          <td>
                            {formatMoney(
                              year.expenses
                            )}
                          </td>

                          <td>
                            <strong>
                              {formatMoney(
                                year.total
                              )}
                            </strong>
                          </td>
                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </div>

        </>
      )}

    </div>
  );
}