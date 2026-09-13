import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Gauge,
  Trash2,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useVehicle } from "../features/vehicles/VehicleContext";

type Reminder = {
  id: string;
  vehicle_id: string;
  maintenance_item_id: string | null;
  vehicle_issue_id: string | null;

  title: string;
  description: string | null;

  reminder_type: string;

  due_date: string | null;
  due_odometer_km: number | null;

  recurrence_type: string | null;
  recurrence_interval: number | null;

  priority: string;
  status: string;

  snoozed_until: string | null;
  snoozed_until_km: number | null;

  is_auto_generated: boolean;

  resolved_at: string | null;

  notes: string | null;

  created_at: string;
  updated_at: string;
};

type ReminderState =
  | "ok"
  | "soon"
  | "due"
  | "resolved";

function formatDate(
  value: string
) {
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

function formatKm(
  value: number
) {
  return new Intl.NumberFormat(
    "el-GR"
  ).format(value);
}

function getReminderState(
  reminder: Reminder,
  currentOdometer: number | null
): ReminderState {
  if (
    reminder.resolved_at ||
    reminder.status === "completed" ||
    reminder.status === "resolved"
  ) {
    return "resolved";
  }

  const now =
    new Date();

  let due = false;
  let soon = false;

  /*
   * Έλεγχος ημερομηνίας
   */
  if (reminder.due_date) {
    const dueDate =
      new Date(
        reminder.due_date
      );

    const diffMilliseconds =
      dueDate.getTime() -
      now.getTime();

    const diffDays =
      diffMilliseconds /
      (1000 * 60 * 60 * 24);

    if (diffDays <= 0) {
      due = true;
    } else if (
      diffDays <= 30
    ) {
      soon = true;
    }
  }

  /*
   * Έλεγχος χιλιομέτρων
   */
  if (
    reminder.due_odometer_km !==
      null &&
    currentOdometer !== null
  ) {
    const remainingKm =
      reminder.due_odometer_km -
      currentOdometer;

    if (remainingKm <= 0) {
      due = true;
    } else if (
      remainingKm <= 1000
    ) {
      soon = true;
    }
  }

  if (due) {
    return "due";
  }

  if (soon) {
    return "soon";
  }

  return "ok";
}

function stateLabel(
  state: ReminderState
) {
  switch (state) {
    case "due":
      return "Απαιτεί ενέργεια";

    case "soon":
      return "Πλησιάζει";

    case "resolved":
      return "Ολοκληρωμένη";

    default:
      return "Προγραμματισμένη";
  }
}

function priorityLabel(
  priority: string
) {
  switch (priority) {
    case "high":
      return "Υψηλή";

    case "low":
      return "Χαμηλή";

    default:
      return "Μεσαία";
  }
}

export default function RemindersPage() {
  const { selectedVehicle } =
    useVehicle();

  const [
    reminders,
    setReminders,
  ] = useState<Reminder[]>([]);

  const [
    currentOdometer,
    setCurrentOdometer,
  ] = useState<number | null>(
    null
  );

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  async function loadData() {
    if (!selectedVehicle) {
      setReminders([]);
      setCurrentOdometer(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const [
      reminderResult,
      odometerResult,
    ] = await Promise.all([
      supabase
        .from("reminders")
        .select("*")
        .eq(
          "vehicle_id",
          selectedVehicle.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        ),

      supabase
        .from(
          "current_vehicle_odometer"
        )
        .select(
          "odometer_km"
        )
        .eq(
          "vehicle_id",
          selectedVehicle.id
        )
        .maybeSingle(),
    ]);

    if (
      reminderResult.error
    ) {
      setErrorMessage(
        reminderResult.error
          .message
      );

      setLoading(false);
      return;
    }

    if (
      odometerResult.error
    ) {
      setErrorMessage(
        odometerResult.error
          .message
      );

      setLoading(false);
      return;
    }

    setReminders(
      (reminderResult.data ??
        []) as Reminder[]
    );

    setCurrentOdometer(
      odometerResult.data
        ?.odometer_km ?? null
    );

    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, [selectedVehicle?.id]);

  const reminderRows =
    useMemo(() => {
      return reminders.map(
        (reminder) => ({
          reminder,

          state:
            getReminderState(
              reminder,
              currentOdometer
            ),
        })
      );
    }, [
      reminders,
      currentOdometer,
    ]);

  /*
   * Τα reminders που απαιτούν
   * ενέργεια εμφανίζονται πρώτα.
   */
  const sortedRows =
    useMemo(() => {
      const order = {
        due: 0,
        soon: 1,
        ok: 2,
        resolved: 3,
      };

      return [
        ...reminderRows,
      ].sort(
        (a, b) =>
          order[a.state] -
          order[b.state]
      );
    }, [reminderRows]);

  const summary =
    useMemo(() => {
      return {
        total:
          reminderRows.filter(
            (row) =>
              row.state !==
              "resolved"
          ).length,

        due:
          reminderRows.filter(
            (row) =>
              row.state ===
              "due"
          ).length,

        soon:
          reminderRows.filter(
            (row) =>
              row.state ===
              "soon"
          ).length,

        resolved:
          reminderRows.filter(
            (row) =>
              row.state ===
              "resolved"
          ).length,
      };
    }, [reminderRows]);

  async function handleDelete(
    reminder: Reminder
  ) {
    const confirmed =
      window.confirm(
        `Να διαγραφεί η υπενθύμιση "${reminder.title}";`
      );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");

    const { error } =
      await supabase
        .from("reminders")
        .delete()
        .eq(
          "id",
          reminder.id
        );

    if (error) {
      setErrorMessage(
        error.message
      );
      return;
    }

    await loadData();
  }

  if (!selectedVehicle) {
    return (
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1>
              Υπενθυμίσεις
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
            Υπενθυμίσεις
          </h1>

          <p>
            Προγραμματισμένες
            εργασίες,
            ημερομηνίες και
            όρια χιλιομέτρων.
          </p>
        </div>
      </div>


      <div className="reminders-summary-grid">

        <div className="reminders-summary-card">
          <span>
            Ενεργές
          </span>

          <strong>
            {summary.total}
          </strong>
        </div>


        <div className="reminders-summary-card reminder-summary-danger">
          <span>
            Απαιτούν ενέργεια
          </span>

          <strong>
            {summary.due}
          </strong>
        </div>


        <div className="reminders-summary-card reminder-summary-warning">
          <span>
            Πλησιάζουν
          </span>

          <strong>
            {summary.soon}
          </strong>
        </div>


        <div className="reminders-summary-card">
          <span>
            Ολοκληρωμένες
          </span>

          <strong>
            {summary.resolved}
          </strong>
        </div>

      </div>


      {currentOdometer !==
        null && (
        <div className="reminders-current-km">
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


      {errorMessage && (
        <div className="form-error">
          {errorMessage}
        </div>
      )}


      {loading ? (
        <div className="reminders-empty">
          Φόρτωση
          υπενθυμίσεων...
        </div>
      ) : sortedRows.length ===
        0 ? (
        <div className="reminders-empty">
          Δεν υπάρχουν ακόμη
          υπενθυμίσεις.
        </div>
      ) : (
        <div className="reminders-list">

          {sortedRows.map(
            ({
              reminder,
              state,
            }) => {
              const remainingKm =
                reminder.due_odometer_km !==
                  null &&
                currentOdometer !==
                  null
                  ? reminder.due_odometer_km -
                    currentOdometer
                  : null;

              return (
                <article
                  key={
                    reminder.id
                  }
                  className={`reminder-card reminder-card-${state}`}
                >

                  <div className="reminder-card-main">

                    <div className="reminder-card-title-row">

                      <div>
                        <div className="reminder-card-badges">

                          <span
                            className={`reminder-state-badge reminder-state-${state}`}
                          >
                            {state ===
                            "due" ? (
                              <AlertTriangle
                                size={
                                  15
                                }
                              />
                            ) : state ===
                              "resolved" ? (
                              <CheckCircle2
                                size={
                                  15
                                }
                              />
                            ) : (
                              <CalendarDays
                                size={
                                  15
                                }
                              />
                            )}

                            {stateLabel(
                              state
                            )}
                          </span>


                          <span
                            className={`reminder-priority reminder-priority-${reminder.priority}`}
                          >
                            {priorityLabel(
                              reminder.priority
                            )}
                          </span>

                        </div>


                        <h3>
                          {
                            reminder.title
                          }
                        </h3>
                      </div>


                      <button
                        type="button"
                        className="reminder-delete-button"
                        aria-label="Διαγραφή"
                        onClick={() =>
                          void handleDelete(
                            reminder
                          )
                        }
                      >
                        <Trash2
                          size={17}
                        />
                      </button>

                    </div>


                    {reminder.description && (
                      <p className="reminder-description">
                        {
                          reminder.description
                        }
                      </p>
                    )}


                    <div className="reminder-details-grid">

                      {reminder.due_date && (
                        <div>
                          <span>
                            Ημερομηνία
                          </span>

                          <strong>
                            {formatDate(
                              reminder.due_date
                            )}
                          </strong>
                        </div>
                      )}


                      {reminder.due_odometer_km !==
                        null && (
                        <div>
                          <span>
                            Στα
                          </span>

                          <strong>
                            {formatKm(
                              reminder.due_odometer_km
                            )}{" "}
                            km
                          </strong>
                        </div>
                      )}


                      {remainingKm !==
                        null && (
                        <div>
                          <span>
                            Απόσταση
                          </span>

                          <strong>
                            {remainingKm >
                            0
                              ? `${formatKm(
                                  remainingKm
                                )} km απομένουν`
                              : `${formatKm(
                                  Math.abs(
                                    remainingKm
                                  )
                                )} km εκπρόθεσμο`}
                          </strong>
                        </div>
                      )}


                      {reminder.recurrence_type && (
                        <div>
                          <span>
                            Επανάληψη
                          </span>

                          <strong>
                            {
                              reminder.recurrence_interval
                            }{" "}
                            {
                              reminder.recurrence_type
                            }
                          </strong>
                        </div>
                      )}

                    </div>


                    {reminder.notes && (
                      <div className="reminder-notes">
                        {
                          reminder.notes
                        }
                      </div>
                    )}

                  </div>

                </article>
              );
            }
          )}

        </div>
      )}

    </div>
  );
}