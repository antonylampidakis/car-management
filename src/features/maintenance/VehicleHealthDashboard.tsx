import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gauge,
  HelpCircle,
  Wrench,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useVehicle } from "../vehicles/VehicleContext";

type MaintenanceItem = {
  id: string;
  vehicle_id: string;
  name: string;
  category: string;
  tracking_type: string;

  interval_km: number | null;
  interval_months: number | null;

  warning_threshold_pct: number | null;
  urgent_threshold_pct: number | null;

  is_active: boolean;
};

type MaintenanceEvent = {
  id: string;
  maintenance_item_id: string;
  event_date: string;
  odometer_km: number | null;
  event_type: string | null;
};

type HealthStatus =
  | "ok"
  | "approaching"
  | "soon"
  | "overdue"
  | "unknown";

type HealthRow = {
  item: MaintenanceItem;

  lastEvent: MaintenanceEvent | null;

  status: HealthStatus;

  progress: number;

  remainingKm: number | null;

  dueKm: number | null;

  dueDate: Date | null;

  daysRemaining: number | null;
};

function addMonths(
  date: Date,
  months: number
) {
  const result = new Date(date);

  result.setMonth(
    result.getMonth() + months
  );

  return result;
}

function differenceInDays(
  from: Date,
  to: Date
) {
  const milliseconds =
    to.getTime() - from.getTime();

  return Math.ceil(
    milliseconds /
      (1000 * 60 * 60 * 24)
  );
}

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    Math.max(value, min),
    max
  );
}

function formatDate(
  value: Date | string
) {
  const date =
    typeof value === "string"
      ? new Date(value)
      : value;

  return new Intl.DateTimeFormat(
    "el-GR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
}

function formatKm(value: number) {
  return new Intl.NumberFormat(
    "el-GR"
  ).format(value);
}

function getStatusLabel(
  status: HealthStatus
) {
  switch (status) {
    case "ok":
      return "OK";

    case "approaching":
      return "Πλησιάζει";

    case "soon":
      return "Σύντομα";

    case "overdue":
      return "Χρειάζεται ενέργεια";

    default:
      return "Χωρίς ιστορικό";
  }
}

function StatusIcon({
  status,
}: {
  status: HealthStatus;
}) {
  if (status === "ok") {
    return <CheckCircle2 size={19} />;
  }

  if (
    status === "approaching" ||
    status === "soon"
  ) {
    return <Clock3 size={19} />;
  }

  if (status === "overdue") {
    return <AlertTriangle size={19} />;
  }

  return <HelpCircle size={19} />;
}

export default function VehicleHealthDashboard() {
  const { selectedVehicle } =
    useVehicle();

  const [items, setItems] =
    useState<MaintenanceItem[]>([]);

  const [events, setEvents] =
    useState<MaintenanceEvent[]>([]);

  const [
    currentOdometer,
    setCurrentOdometer,
  ] = useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadData() {
      if (!selectedVehicle) {
        setItems([]);
        setEvents([]);
        setCurrentOdometer(null);
        setLoading(false);

        return;
      }

      setLoading(true);
      setErrorMessage("");

      const [
        itemResult,
        eventResult,
        odometerResult,
      ] = await Promise.all([
        supabase
          .from("maintenance_items")
          .select(
            `
              id,
              vehicle_id,
              name,
              category,
              tracking_type,
              interval_km,
              interval_months,
              warning_threshold_pct,
              urgent_threshold_pct,
              is_active
            `
          )
          .eq(
            "vehicle_id",
            selectedVehicle.id
          )
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("maintenance_events")
          .select(
            `
              id,
              maintenance_item_id,
              event_date,
              odometer_km,
              event_type
            `
          )
          .eq(
            "vehicle_id",
            selectedVehicle.id
          )
          .order(
            "event_date",
            {
              ascending: false,
            }
          ),

        supabase
          .from(
            "current_vehicle_odometer"
          )
          .select("odometer_km")
          .eq(
            "vehicle_id",
            selectedVehicle.id
          )
          .maybeSingle(),
      ]);

      if (itemResult.error) {
        setErrorMessage(
          itemResult.error.message
        );

        setLoading(false);
        return;
      }

      if (eventResult.error) {
        setErrorMessage(
          eventResult.error.message
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

      setItems(
        (itemResult.data ??
          []) as MaintenanceItem[]
      );

      setEvents(
        (eventResult.data ??
          []) as MaintenanceEvent[]
      );

      setCurrentOdometer(
        odometerResult.data
          ?.odometer_km ?? null
      );

      setLoading(false);
    }

    void loadData();
  }, [selectedVehicle?.id]);

  const rows = useMemo<HealthRow[]>(
    () => {
      const now = new Date();

      return items.map((item) => {
        const lastEvent =
          events.find(
            (event) =>
              event.maintenance_item_id ===
              item.id
          ) ?? null;

        if (!lastEvent) {
          return {
            item,
            lastEvent: null,
            status: "unknown",
            progress: 0,
            remainingKm: null,
            dueKm: null,
            dueDate: null,
            daysRemaining: null,
          };
        }

        let distanceProgress:
          | number
          | null = null;

        let timeProgress:
          | number
          | null = null;

        let remainingKm:
          | number
          | null = null;

        let dueKm:
          | number
          | null = null;

        let dueDate:
          | Date
          | null = null;

        let daysRemaining:
          | number
          | null = null;

        /*
         * KM tracking
         */
        if (
          item.interval_km &&
          currentOdometer !== null &&
          lastEvent.odometer_km !== null
        ) {
          const travelled =
            currentOdometer -
            lastEvent.odometer_km;

          dueKm =
            lastEvent.odometer_km +
            item.interval_km;

          remainingKm =
            dueKm -
            currentOdometer;

          distanceProgress =
            (travelled /
              item.interval_km) *
            100;
        }

        /*
         * Time tracking
         */
        if (
          item.interval_months &&
          lastEvent.event_date
        ) {
          const lastDate =
            new Date(
              lastEvent.event_date
            );

          dueDate =
            addMonths(
              lastDate,
              item.interval_months
            );

          const totalDays =
            differenceInDays(
              lastDate,
              dueDate
            );

          const elapsedDays =
            differenceInDays(
              lastDate,
              now
            );

          daysRemaining =
            differenceInDays(
              now,
              dueDate
            );

          if (totalDays > 0) {
            timeProgress =
              (elapsedDays /
                totalDays) *
              100;
          }
        }

        let progress = 0;

        switch (
          item.tracking_type
        ) {
          case "distance":
            progress =
              distanceProgress ?? 0;
            break;

          case "time":
            progress =
              timeProgress ?? 0;
            break;

          case "distance_or_time":
            progress = Math.max(
              distanceProgress ?? 0,
              timeProgress ?? 0
            );
            break;

          case "manual_condition":
          case "event_only":
            progress = 0;
            break;

          default:
            progress = Math.max(
              distanceProgress ?? 0,
              timeProgress ?? 0
            );
        }

        const warningThreshold =
          item.warning_threshold_pct ??
          75;

        const urgentThreshold =
          item.urgent_threshold_pct ??
          90;

        let status: HealthStatus =
          "ok";

        if (
          item.tracking_type ===
            "manual_condition" ||
          item.tracking_type ===
            "event_only"
        ) {
          status = "ok";
        } else if (
          progress >= 100 ||
          (remainingKm !== null &&
            remainingKm <= 0) ||
          (daysRemaining !== null &&
            daysRemaining <= 0)
        ) {
          status = "overdue";
        } else if (
          progress >=
          urgentThreshold
        ) {
          status = "soon";
        } else if (
          progress >=
          warningThreshold
        ) {
          status =
            "approaching";
        }

        return {
          item,
          lastEvent,
          status,
          progress: clamp(
            progress,
            0,
            100
          ),
          remainingKm,
          dueKm,
          dueDate,
          daysRemaining,
        };
      });
    },
    [
      items,
      events,
      currentOdometer,
    ]
  );

  const summary = useMemo(() => {
    return {
      total: rows.length,

      ok: rows.filter(
        (row) =>
          row.status === "ok"
      ).length,

      attention: rows.filter(
        (row) =>
          row.status ===
            "approaching" ||
          row.status === "soon"
      ).length,

      overdue: rows.filter(
        (row) =>
          row.status ===
          "overdue"
      ).length,

      unknown: rows.filter(
        (row) =>
          row.status ===
          "unknown"
      ).length,
    };
  }, [rows]);

  if (!selectedVehicle) {
    return (
      <div className="health-empty">
        Επίλεξε όχημα.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="health-empty">
        Φόρτωση Vehicle Health...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="form-error">
        {errorMessage}
      </div>
    );
  }

  return (
    <div className="vehicle-health-dashboard">
      <div className="health-summary-grid">

        <div className="health-summary-card">
          <div className="health-summary-icon">
            <Wrench size={20} />
          </div>

          <div>
            <span>
              Maintenance items
            </span>

            <strong>
              {summary.total}
            </strong>
          </div>
        </div>


        <div className="health-summary-card health-summary-ok">
          <div className="health-summary-icon">
            <CheckCircle2
              size={20}
            />
          </div>

          <div>
            <span>OK</span>

            <strong>
              {summary.ok}
            </strong>
          </div>
        </div>


        <div className="health-summary-card health-summary-warning">
          <div className="health-summary-icon">
            <Clock3 size={20} />
          </div>

          <div>
            <span>
              Προσοχή
            </span>

            <strong>
              {summary.attention}
            </strong>
          </div>
        </div>


        <div className="health-summary-card health-summary-danger">
          <div className="health-summary-icon">
            <AlertTriangle
              size={20}
            />
          </div>

          <div>
            <span>
              Ενέργεια
            </span>

            <strong>
              {summary.overdue}
            </strong>
          </div>
        </div>

      </div>


      {currentOdometer !== null && (
        <div className="health-current-km">
          <Gauge size={18} />

          Τρέχουσα ένδειξη:

          <strong>
            {formatKm(
              currentOdometer
            )}{" "}
            km
          </strong>
        </div>
      )}


      {rows.length === 0 ? (
        <div className="health-empty">
          Δεν υπάρχουν ακόμη
          maintenance items.
        </div>
      ) : (
        <div className="health-items-grid">

          {rows.map((row) => (
            <article
              key={row.item.id}
              className={`health-item-card health-status-${row.status}`}
            >
              <div className="health-item-header">

                <div>
                  <span className="health-item-category">
                    {
                      row.item
                        .category
                    }
                  </span>

                  <h3>
                    {
                      row.item
                        .name
                    }
                  </h3>
                </div>


                <div
                  className={`health-status-badge health-status-badge-${row.status}`}
                >
                  <StatusIcon
                    status={
                      row.status
                    }
                  />

                  {getStatusLabel(
                    row.status
                  )}
                </div>

              </div>


              {row.status !==
                "unknown" &&
                ![
                  "manual_condition",
                  "event_only",
                ].includes(
                  row.item
                    .tracking_type
                ) && (
                  <>
                    <div className="health-progress-top">
                      <span>
                        Χρήση interval
                      </span>

                      <strong>
                        {Math.round(
                          row.progress
                        )}
                        %
                      </strong>
                    </div>

                    <div className="health-progress">
                      <div
                        className="health-progress-value"
                        style={{
                          width: `${row.progress}%`,
                        }}
                      />
                    </div>
                  </>
                )}


              <div className="health-details">

                {row.lastEvent ? (
                  <div>
                    <span>
                      Τελευταία
                      συντήρηση
                    </span>

                    <strong>
                      {formatDate(
                        row.lastEvent
                          .event_date
                      )}
                    </strong>
                  </div>
                ) : (
                  <div>
                    <span>
                      Τελευταία
                      συντήρηση
                    </span>

                    <strong>
                      Δεν υπάρχει
                    </strong>
                  </div>
                )}


                {row.lastEvent
                  ?.odometer_km !==
                  null &&
                  row.lastEvent
                    ?.odometer_km !==
                    undefined && (
                    <div>
                      <span>
                        Στα
                      </span>

                      <strong>
                        {formatKm(
                          row.lastEvent
                            .odometer_km
                        )}{" "}
                        km
                      </strong>
                    </div>
                  )}


                {row.dueKm !==
                  null && (
                  <div>
                    <span>
                      Επόμενο στα
                    </span>

                    <strong>
                      {formatKm(
                        row.dueKm
                      )}{" "}
                      km
                    </strong>
                  </div>
                )}


                {row.remainingKm !==
                  null && (
                  <div>
                    <span>
                      Υπόλοιπο
                    </span>

                    <strong>
                      {row.remainingKm >
                      0
                        ? `${formatKm(
                            row.remainingKm
                          )} km`
                        : `${formatKm(
                            Math.abs(
                              row.remainingKm
                            )
                          )} km εκπρόθεσμο`}
                    </strong>
                  </div>
                )}


                {row.dueDate && (
                  <div>
                    <span>
                      Επόμενη
                      ημερομηνία
                    </span>

                    <strong>
                      {formatDate(
                        row.dueDate
                      )}
                    </strong>
                  </div>
                )}


                {row.daysRemaining !==
                  null && (
                  <div>
                    <span>
                      Χρόνος
                    </span>

                    <strong>
                      {row.daysRemaining >
                      0
                        ? `${row.daysRemaining} ημέρες`
                        : `${Math.abs(
                            row.daysRemaining
                          )} ημέρες εκπρόθεσμο`}
                    </strong>
                  </div>
                )}

              </div>


              {row.status ===
                "unknown" && (
                <div className="health-no-history">
                  Δεν υπάρχει ακόμη
                  καταγεγραμμένο service
                  για αυτό το στοιχείο.
                </div>
              )}

            </article>
          ))}

        </div>
      )}
    </div>
  );
}