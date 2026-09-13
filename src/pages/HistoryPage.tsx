import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Banknote,
  Fuel,
  Gauge,
  Search,
  Wrench,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useVehicle } from "../features/vehicles/VehicleContext";
import { useSettings } from "../features/settings/SettingsContext";
type HistoryType =
  | "fuel"
  | "service"
  | "expense"
  | "odometer";

type HistoryEntry = {
  id: string;
  type: HistoryType;

  date: string;

  title: string;
  description: string | null;

  odometerKm: number | null;
  amount: number | null;

  secondary: string | null;
};

type FilterType =
  | "all"
  | HistoryType;


function convertDistance(
  km: number,
  unit: "km" | "mi"
) {
  return unit === "mi"
    ? km * 0.621371
    : km;
}

function distanceUnitLabel(
  unit: "km" | "mi"
) {
  return unit === "mi"
    ? "mi"
    : "km";
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

function formatMoney(
  value: number,
  currency: string
) {
  return new Intl.NumberFormat(
    "el-GR",
    {
      style: "currency",
      currency,
    }
  ).format(value);
}

function formatKm(value: number) {
  return new Intl.NumberFormat(
    "el-GR"
  ).format(value);
}

function typeLabel(type: HistoryType) {
  switch (type) {
    case "fuel":
      return "Καύσιμα";

    case "service":
      return "Service";

    case "expense":
      return "Έξοδο";

    case "odometer":
      return "Χιλιόμετρα";
  }
}

function HistoryIcon({
  type,
}: {
  type: HistoryType;
}) {
  switch (type) {
    case "fuel":
      return <Fuel size={19} />;

    case "service":
      return <Wrench size={19} />;

    case "expense":
      return <Banknote size={19} />;

    case "odometer":
      return <Gauge size={19} />;
  }
}

export default function HistoryPage() {
  const { selectedVehicle } =
    useVehicle();

  const { settings } =
  useSettings();

  const [
    entries,
    setEntries,
  ] = useState<HistoryEntry[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<FilterType>("all");

  const [viewMode, setViewMode] =
  useState<"timeline" | "table">(
    settings.default_history_view
  );

  useEffect(() => {
  setViewMode(
    settings.default_history_view
  );
}, [settings.default_history_view]);

  async function loadHistory() {
    if (!selectedVehicle) {
      setEntries([]);
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
        ),
    ]);

    const errors = [
      fuelResult.error,
      serviceResult.error,
      expenseResult.error,
      odometerResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error(
        "History loading errors:",
        errors
      );

      setErrorMessage(
        errors
          .map(
            (error) =>
              error?.message
          )
          .filter(Boolean)
          .join(" | ")
      );
    }

    const history:
      HistoryEntry[] = [];

    /*
     * FUEL
     */
    for (
      const row of
        fuelResult.data ?? []
    ) {
      const amount =
        typeof row.amount ===
        "number"
          ? row.amount
          : null;

      const liters =
        typeof row.liters ===
        "number"
          ? row.liters
          : null;

      const price =
        typeof row.price_per_liter ===
        "number"
          ? row.price_per_liter
          : null;

      const details: string[] =
        [];

      if (liters !== null) {
        details.push(
          `${liters.toFixed(
            2
          )} L`
        );
      }

      if (price !== null) {
        details.push(
          `${price.toFixed(
            3
          )} €/L`
        );
      }

      history.push({
        id: `fuel-${row.id}`,
        type: "fuel",

        date:
          row.fuel_date ??
          row.created_at,

        title:
          "Ανεφοδιασμός",

        description:
          row.notes ?? null,

        odometerKm: null,

        amount,

        secondary:
          details.length > 0
            ? details.join(
                " • "
              )
            : null,
      });
    }

    /*
     * SERVICE
     */
    for (
      const row of
        serviceResult.data ?? []
    ) {
      let amount: number | null =
        null;

      if (
        typeof row.total_cost ===
        "number"
      ) {
        amount =
          row.total_cost;
      } else {
        const labor =
          Number(
            row.labor_cost ?? 0
          );

        const parts =
          Number(
            row.parts_cost ?? 0
          );

        const other =
          Number(
            row.other_cost ?? 0
          );

        const total =
          labor +
          parts +
          other;

        amount =
          total > 0
            ? total
            : null;
      }

      history.push({
        id: `service-${row.id}`,
        type: "service",

        date:
          row.service_date ??
          row.created_at,

        title:
          row.description ||
          "Service / Επισκευή",

        description:
          row.notes ?? null,

        odometerKm: null,

        amount,

        secondary:
          row.service_type
            ? String(
                row.service_type
              )
            : null,
      });
    }

    /*
     * EXPENSES
     *
     * Χρησιμοποιούμε select("*")
     * ώστε να μη δεσμευόμαστε
     * σε συγκεκριμένο expense UI.
     */
    for (
      const row of
        expenseResult.data ?? []
    ) {
      const date =
        row.expense_date ??
        row.date ??
        row.paid_at ??
        row.created_at;

      const amount =
        typeof row.amount ===
        "number"
          ? row.amount
          : row.total_amount !==
              undefined
            ? Number(
                row.total_amount
              )
            : null;

      const title =
        row.title ??
        row.description ??
        "Έξοδο";

      history.push({
        id: `expense-${row.id}`,
        type: "expense",

        date,

        title,

        description:
          row.notes ?? null,

        odometerKm:
          typeof row.odometer_km ===
          "number"
            ? row.odometer_km
            : null,

        amount:
          amount !== null &&
          Number.isFinite(amount)
            ? amount
            : null,

        secondary:
          row.vendor ??
          row.payee ??
          null,
      });
    }

    /*
     * ODOMETER
     *
     * Fuel και service δημιουργούν
     * δικά τους odometer entries.
     *
     * Δεν τα εμφανίζουμε ξανά,
     * γιατί διαφορετικά το History
     * θα είχε διπλές εγγραφές.
     */
    for (
      const row of
        odometerResult.data ?? []
    ) {
      if (
        row.source_type ===
          "fuel" ||
        row.source_type ===
          "service"
      ) {
        continue;
      }

      history.push({
        id: `odometer-${row.id}`,
        type: "odometer",

        date:
          row.recorded_at ??
          row.created_at,

        title:
          "Καταχώρηση χιλιομέτρων",

        description:
          row.notes ?? null,

        odometerKm:
          typeof row.odometer_km ===
          "number"
            ? row.odometer_km
            : Number(
                row.odometer_km
              ),

        amount: null,

        secondary:
          null,
      });
    }

    history.sort(
      (a, b) =>
        new Date(
          b.date
        ).getTime() -
        new Date(
          a.date
        ).getTime()
    );

    setEntries(history);
    setLoading(false);
  }

  useEffect(() => {
    void loadHistory();
  }, [selectedVehicle?.id]);

  const filteredEntries =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLocaleLowerCase(
            "el-GR"
          );

      return entries.filter(
        (entry) => {
          if (
            filter !== "all" &&
            entry.type !== filter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const haystack = [
            entry.title,
            entry.description,
            entry.secondary,
            entry.odometerKm !==
            null
              ? String(
                  entry.odometerKm
                )
              : "",
            entry.amount !== null
              ? String(
                  entry.amount
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
    }, [
      entries,
      filter,
      search,
    ]);

  const summary = useMemo(() => {
    const totalSpent =
      entries.reduce(
        (sum, entry) =>
          sum +
          (entry.amount ?? 0),
        0
      );

    return {
      total:
        entries.length,

      fuel:
        entries.filter(
          (entry) =>
            entry.type === "fuel"
        ).length,

      service:
        entries.filter(
          (entry) =>
            entry.type ===
            "service"
        ).length,

      spent:
        totalSpent,
    };
  }, [entries]);

  if (!selectedVehicle) {
    return (
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1>
              Ιστορικό
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
            Ιστορικό
          </h1>

          <p>
            Όλες οι
            καταχωρήσεις του
            οχήματος σε ένα
            χρονολόγιο.
          </p>
        </div>
      </div>


      <div className="history-summary-grid">

        <div className="history-summary-card">
          <span>
            Καταχωρήσεις
          </span>

          <strong>
            {summary.total}
          </strong>
        </div>


        <div className="history-summary-card">
          <span>
            Ανεφοδιασμοί
          </span>

          <strong>
            {summary.fuel}
          </strong>
        </div>


        <div className="history-summary-card">
          <span>
            Service
          </span>

          <strong>
            {summary.service}
          </strong>
        </div>


        <div className="history-summary-card">
          <span>
            Συνολικό κόστος
          </span>

          <strong>
           { formatMoney(
  summary.spent,
  settings.currency
)}
          </strong>
        </div>

      </div>


      <div className="history-toolbar">

        <div className="history-search">
          <Search size={18} />

          <input
            type="search"
            value={search}
            placeholder="Αναζήτηση στο ιστορικό..."
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />
        </div>
<div className="history-view-switcher">
  <button
    type="button"
    className={
      viewMode === "timeline"
        ? "history-view-button active"
        : "history-view-button"
    }
    onClick={() =>
      setViewMode("timeline")
    }
  >
    Timeline
  </button>

  <button
    type="button"
    className={
      viewMode === "table"
        ? "history-view-button active"
        : "history-view-button"
    }
    onClick={() =>
      setViewMode("table")
    }
  >
    Πίνακας
  </button>
</div>

        <div className="history-filters">

          {(
            [
              [
                "all",
                "Όλα",
              ],
              [
                "fuel",
                "Καύσιμα",
              ],
              [
                "service",
                "Service",
              ],
              [
                "expense",
                "Έξοδα",
              ],
              [
                "odometer",
                "Χιλιόμετρα",
              ],
            ] as [
              FilterType,
              string,
            ][]
          ).map(
            ([
              value,
              label,
            ]) => (
              <button
                key={value}
                type="button"
                className={
                  filter === value
                    ? "history-filter active"
                    : "history-filter"
                }
                onClick={() =>
                  setFilter(
                    value
                  )
                }
              >
                {label}
              </button>
            )
          )}

        </div>

      </div>


      {errorMessage && (
        <div className="form-error">
          {errorMessage}
        </div>
      )}

{loading ? (
  <div className="history-empty">
    Φόρτωση ιστορικού...
  </div>
) : filteredEntries.length === 0 ? (
  <div className="history-empty">
    Δεν βρέθηκαν καταχωρήσεις.
  </div>
) : viewMode === "table" ? (
  <div className="history-table-wrapper">
    <table className="history-table">
      <thead>
        <tr>
          <th>Ημερομηνία</th>
          <th>Τύπος</th>
          <th>Περιγραφή</th>
          <th>Χιλιόμετρα</th>
          <th>Κόστος</th>
        </tr>
      </thead>

      <tbody>
        {filteredEntries.map((entry) => (
          <tr key={entry.id}>
            <td>
              {formatDate(entry.date)}
            </td>

            <td>
              {typeLabel(entry.type)}
            </td>

            <td>
              <strong>
                {entry.title}
              </strong>

              {entry.description && (
                <div>
                  {entry.description}
                </div>
              )}

              {entry.secondary && (
                <div>
                  {entry.secondary}
                </div>
              )}
            </td>

            <td>
  {entry.odometerKm !== null ? (
    <>
      {formatKm(
        convertDistance(
          entry.odometerKm,
          settings.distance_unit
        )
      )}{" "}
      {distanceUnitLabel(
        settings.distance_unit
      )}
    </>
  ) : (
    "—"
  )}
</td>

            <td>
              {entry.amount !== null
                ? formatMoney(
  entry.amount,
  settings.currency
)
                : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
) : (
  <div className="history-timeline">
    {filteredEntries.map((entry) => (
      <article
        key={entry.id}
        className={`history-entry history-entry-${entry.type}`}
      >
        <div className="history-entry-icon">
          <HistoryIcon type={entry.type} />
        </div>

        <div className="history-entry-body">
          <div className="history-entry-top">
            <div>
              <span className="history-entry-type">
                {typeLabel(entry.type)}
              </span>

              <h3>{entry.title}</h3>
            </div>

            <div className="history-entry-right">
              {entry.amount !== null && (
                <strong className="history-entry-amount">
                  {formatMoney(
  entry.amount,
  settings.currency
)}
                </strong>
              )}

              <time>
                {formatDate(entry.date)}
              </time>
            </div>
          </div>

          {entry.description && (
            <p>{entry.description}</p>
          )}

          <div className="history-entry-meta">
            {entry.odometerKm !== null && (
              <span>
                <Gauge size={14} />
                {formatKm(
  convertDistance(
    entry.odometerKm,
    settings.distance_unit
  )
)}{" "}
{distanceUnitLabel(
  settings.distance_unit
)}
              </span>
            )}

            {entry.secondary && (
              <span>
                {entry.secondary}
              </span>
            )}
          </div>
        </div>
      </article>
    ))}
  </div>
)}
     

    </div>
  );
}