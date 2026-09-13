import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Fuel,
  Gauge,
  Search,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useVehicle } from "../features/vehicles/VehicleContext";

type FuelEntry = {
  id: string;
  vehicle_id: string;

  odometer_entry_id: string | null;

  fuel_date: string;

  fuel_type: string | null;

  amount: number | null;
  price_per_liter: number | null;
  liters: number | null;

  is_full_tank: boolean;

  notes: string | null;

  created_at?: string;
};

type OdometerEntry = {
  id: string;
  odometer_km: number;
};

type FuelRow = FuelEntry & {
  odometer_km: number | null;
  consumption_l_100km: number | null;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "el-GR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

function fuelTypeLabel(
  value: string | null
) {
  switch (value) {
    case "petrol":
      return "Βενζίνη";

    case "diesel":
      return "Diesel";

    case "lpg":
      return "LPG";

    case "cng":
      return "CNG";

    case "electric":
      return "Ηλεκτρικό";

    case "other":
      return "Άλλο";

    default:
      return value ?? "—";
  }
}

export default function FuelPage() {
  const { selectedVehicle } =
    useVehicle();

  const [rows, setRows] =
    useState<FuelRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [search, setSearch] =
    useState("");

  async function loadFuelData() {
    if (!selectedVehicle) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const [
      fuelResult,
      odometerResult,
    ] = await Promise.all([
      supabase
        .from("fuel_entries")
        .select("*")
        .eq(
          "vehicle_id",
          selectedVehicle.id
        )
        .order(
          "fuel_date",
          {
            ascending: true,
          }
        ),

      supabase
        .from("odometer_entries")
        .select(
          "id, odometer_km"
        )
        .eq(
          "vehicle_id",
          selectedVehicle.id
        ),
    ]);

    if (fuelResult.error) {
      setErrorMessage(
        fuelResult.error.message
      );
      setLoading(false);
      return;
    }

    if (odometerResult.error) {
      setErrorMessage(
        odometerResult.error.message
      );
      setLoading(false);
      return;
    }

    const odometerMap =
      new Map<string, number>();

    for (
      const row of
        (odometerResult.data ??
          []) as OdometerEntry[]
    ) {
      odometerMap.set(
        row.id,
        row.odometer_km
      );
    }

    const fuelRows: FuelRow[] =
      (
        (fuelResult.data ??
          []) as FuelEntry[]
      ).map((entry) => ({
        ...entry,

        odometer_km:
          entry.odometer_entry_id
            ? odometerMap.get(
                entry.odometer_entry_id
              ) ?? null
            : null,

        consumption_l_100km:
          null,
      }));

    /*
     * Κατανάλωση:
     *
     * Υπολογίζεται μόνο όταν
     * έχουμε δύο διαδοχικούς
     * FULL TANK ανεφοδιασμούς.
     *
     * Τα λίτρα του δεύτερου
     * full tank θεωρούνται τα
     * λίτρα που καταναλώθηκαν
     * από τον προηγούμενο
     * full tank.
     */
    let previousFullTank:
      | FuelRow
      | null = null;

    for (
      const row of fuelRows
    ) {
      if (!row.is_full_tank) {
        continue;
      }

      if (
        previousFullTank &&
        previousFullTank.odometer_km !==
          null &&
        row.odometer_km !==
          null &&
        row.liters !== null
      ) {
        const distance =
          row.odometer_km -
          previousFullTank.odometer_km;

        if (distance > 0) {
          row.consumption_l_100km =
            (
              row.liters /
              distance
            ) *
            100;
        }
      }

      previousFullTank =
        row;
    }

    /*
     * Στην οθόνη θέλουμε
     * νεότερο -> παλαιότερο.
     */
    fuelRows.sort(
      (a, b) =>
        new Date(
          b.fuel_date
        ).getTime() -
        new Date(
          a.fuel_date
        ).getTime()
    );

    setRows(fuelRows);
    setLoading(false);
  }

  useEffect(() => {
    void loadFuelData();
  }, [selectedVehicle?.id]);

  const summary =
    useMemo(() => {
      const totalCost =
        rows.reduce(
          (sum, row) =>
            sum +
            Number(
              row.amount ?? 0
            ),
          0
        );

      const totalLiters =
        rows.reduce(
          (sum, row) =>
            sum +
            Number(
              row.liters ?? 0
            ),
          0
        );

      const priceRows =
        rows.filter(
          (row) =>
            row.price_per_liter !==
            null
        );

      const averagePrice =
        priceRows.length > 0
          ? priceRows.reduce(
              (sum, row) =>
                sum +
                Number(
                  row.price_per_liter ??
                    0
                ),
              0
            ) /
            priceRows.length
          : null;

      const consumptionRows =
        rows.filter(
          (row) =>
            row.consumption_l_100km !==
            null
        );

      const averageConsumption =
        consumptionRows.length >
        0
          ? consumptionRows.reduce(
              (sum, row) =>
                sum +
                Number(
                  row.consumption_l_100km
                ),
              0
            ) /
            consumptionRows.length
          : null;

      return {
        count:
          rows.length,

        totalCost,

        totalLiters,

        averagePrice,

        averageConsumption,
      };
    }, [rows]);

  const filteredRows =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLocaleLowerCase(
            "el-GR"
          );

      if (!query) {
        return rows;
      }

      return rows.filter(
        (row) => {
          const haystack = [
            fuelTypeLabel(
              row.fuel_type
            ),
            row.notes,
            row.odometer_km !==
            null
              ? String(
                  row.odometer_km
                )
              : "",
            row.amount !== null
              ? String(
                  row.amount
                )
              : "",
            row.price_per_liter !==
            null
              ? String(
                  row.price_per_liter
                )
              : "",
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase(
              "el-GR"
            );

          return haystack.includes(
            query
          );
        }
      );
    }, [rows, search]);

  if (!selectedVehicle) {
    return (
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1>
              Καύσιμα
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
            Καύσιμα
          </h1>

          <p>
            Ανεφοδιασμοί,
            κόστος,
            τιμή καυσίμου και
            πραγματική
            κατανάλωση.
          </p>
        </div>
      </div>


      <div className="fuel-summary-grid">

        <div className="fuel-summary-card">
          <span>
            Ανεφοδιασμοί
          </span>

          <strong>
            {summary.count}
          </strong>
        </div>


        <div className="fuel-summary-card">
          <span>
            Συνολικό κόστος
          </span>

          <strong>
            {formatMoney(
              summary.totalCost
            )}
          </strong>
        </div>


        <div className="fuel-summary-card">
          <span>
            Συνολικά λίτρα
          </span>

          <strong>
            {formatNumber(
              summary.totalLiters,
              2
            )}{" "}
            L
          </strong>
        </div>


        <div className="fuel-summary-card">
          <span>
            Μέση τιμή
          </span>

          <strong>
            {summary.averagePrice !==
            null
              ? `${formatNumber(
                  summary.averagePrice,
                  3
                )} €/L`
              : "—"}
          </strong>
        </div>


        <div className="fuel-summary-card fuel-summary-consumption">
          <span>
            Μέση κατανάλωση
          </span>

          <strong>
            {summary.averageConsumption !==
            null
              ? `${formatNumber(
                  summary.averageConsumption,
                  2
                )} L/100 km`
              : "—"}
          </strong>
        </div>

      </div>


      <div className="fuel-toolbar">

        <div className="fuel-search">
          <Search size={18} />

          <input
            type="search"
            value={search}
            placeholder="Αναζήτηση ανεφοδιασμών..."
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />
        </div>

      </div>


      {errorMessage && (
        <div className="form-error">
          {errorMessage}
        </div>
      )}


      {loading ? (
        <div className="fuel-empty">
          Φόρτωση ανεφοδιασμών...
        </div>
      ) : filteredRows.length ===
        0 ? (
        <div className="fuel-empty">
          Δεν υπάρχουν
          ανεφοδιασμοί.
        </div>
      ) : (
        <div className="fuel-table-wrapper">

          <table className="fuel-table">

            <thead>
              <tr>
                <th>
                  Ημερομηνία
                </th>

                <th>
                  Χιλιόμετρα
                </th>

                <th>
                  Καύσιμο
                </th>

                <th>
                  Λίτρα
                </th>

                <th>
                  €/L
                </th>

                <th>
                  Κόστος
                </th>

                <th>
                  Full tank
                </th>

                <th>
                  Κατανάλωση
                </th>
              </tr>
            </thead>


            <tbody>

              {filteredRows.map(
                (row) => (
                  <tr key={row.id}>

                    <td>
                      {formatDate(
                        row.fuel_date
                      )}
                    </td>


                    <td>
                      {row.odometer_km !==
                      null ? (
                        <span className="fuel-km">
                          <Gauge
                            size={
                              14
                            }
                          />

                          {formatKm(
                            row.odometer_km
                          )}{" "}
                          km
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>


                    <td>
                      <span className="fuel-type-cell">
                        <Fuel
                          size={15}
                        />

                        {fuelTypeLabel(
                          row.fuel_type
                        )}
                      </span>
                    </td>


                    <td>
                      {row.liters !==
                      null
                        ? `${formatNumber(
                            row.liters,
                            2
                          )} L`
                        : "—"}
                    </td>


                    <td>
                      {row.price_per_liter !==
                      null
                        ? `${formatNumber(
                            row.price_per_liter,
                            3
                          )} €`
                        : "—"}
                    </td>


                    <td>
                      <strong>
                        {row.amount !==
                        null
                          ? formatMoney(
                              row.amount
                            )
                          : "—"}
                      </strong>
                    </td>


                    <td>
                      {row.is_full_tank ? (
                        <span className="fuel-full-badge">
                          Ναι
                        </span>
                      ) : (
                        <span className="fuel-partial-badge">
                          Όχι
                        </span>
                      )}
                    </td>


                    <td>
                      {row.consumption_l_100km !==
                      null ? (
                        <strong className="fuel-consumption">
                          {formatNumber(
                            row.consumption_l_100km,
                            2
                          )}{" "}
                          L/100 km
                        </strong>
                      ) : (
                        "—"
                      )}
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>
      )}

    </div>
  );
}