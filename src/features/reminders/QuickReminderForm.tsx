import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";
import { useVehicle } from "../vehicles/VehicleContext";

type QuickReminderFormProps = {
  onCancel: () => void;
  onSaved: () => void;
};

type CurrentOdometer = {
  odometer_km: number;
};

type Priority =
  | "low"
  | "medium"
  | "high";

type RecurrenceType =
  | ""
  | "days"
  | "weeks"
  | "months"
  | "km";

function getLocalDateTimeValue() {
  const now = new Date();

  const offset =
    now.getTimezoneOffset();

  return new Date(
    now.getTime() -
      offset * 60_000
  )
    .toISOString()
    .slice(0, 16);
}

function formatKm(value: number) {
  return new Intl.NumberFormat(
    "el-GR"
  ).format(value);
}

export default function QuickReminderForm({
  onCancel,
  onSaved,
}: QuickReminderFormProps) {
  const { selectedVehicle } =
    useVehicle();

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [dueDateEnabled, setDueDateEnabled] =
    useState(true);

  const [dueDate, setDueDate] =
    useState(
      getLocalDateTimeValue()
    );

  const [dueKmEnabled, setDueKmEnabled] =
    useState(false);

  const [dueOdometerKm, setDueOdometerKm] =
    useState("");

  const [priority, setPriority] =
    useState<Priority>("medium");

  const [
    recurrenceType,
    setRecurrenceType,
  ] =
    useState<RecurrenceType>("");

  const [
    recurrenceInterval,
    setRecurrenceInterval,
  ] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [
    currentOdometer,
    setCurrentOdometer,
  ] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  useEffect(() => {
    async function loadCurrentOdometer() {
      if (!selectedVehicle) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const { data, error } =
        await supabase
          .from(
            "current_vehicle_odometer"
          )
          .select("odometer_km")
          .eq(
            "vehicle_id",
            selectedVehicle.id
          )
          .maybeSingle();

      if (error) {
        console.error(error);

        setErrorMessage(
          error.message
        );
      } else {
        const row =
          data as CurrentOdometer | null;

        const km =
          row?.odometer_km ?? null;

        setCurrentOdometer(km);

        if (km !== null) {
          setDueOdometerKm(
            String(km)
          );
        }
      }

      setLoading(false);
    }

    void loadCurrentOdometer();
  }, [selectedVehicle?.id]);

  async function handleSave() {
    if (!selectedVehicle) {
      return;
    }

    setErrorMessage("");

    if (!title.trim()) {
      setErrorMessage(
        "Συμπλήρωσε τίτλο υπενθύμισης."
      );
      return;
    }

    if (
      !dueDateEnabled &&
      !dueKmEnabled
    ) {
      setErrorMessage(
        "Η υπενθύμιση πρέπει να έχει ημερομηνία ή χιλιόμετρα."
      );
      return;
    }

    let dueDateValue:
      | string
      | null = null;

    if (dueDateEnabled) {
      if (!dueDate) {
        setErrorMessage(
          "Συμπλήρωσε ημερομηνία."
        );
        return;
      }

      const parsedDate =
        new Date(dueDate);

      if (
        Number.isNaN(
          parsedDate.getTime()
        )
      ) {
        setErrorMessage(
          "Η ημερομηνία δεν είναι έγκυρη."
        );
        return;
      }

      dueDateValue =
        parsedDate.toISOString();
    }

    let dueKmValue:
      | number
      | null = null;

    if (dueKmEnabled) {
      const parsedKm =
        Number(dueOdometerKm);

      if (
        !Number.isInteger(
          parsedKm
        ) ||
        parsedKm < 0
      ) {
        setErrorMessage(
          "Συμπλήρωσε έγκυρα χιλιόμετρα."
        );
        return;
      }

      if (
        currentOdometer !== null &&
        parsedKm <
          currentOdometer
      ) {
        setErrorMessage(
          `Τα χιλιόμετρα υπενθύμισης δεν μπορούν να είναι μικρότερα από την τρέχουσα ένδειξη (${formatKm(
            currentOdometer
          )} km).`
        );
        return;
      }

      dueKmValue =
        parsedKm;
    }

    let recurrenceIntervalValue:
      | number
      | null = null;

    let recurrenceTypeValue:
      | string
      | null = null;

    if (recurrenceType !== "") {
      const parsedInterval =
        Number(
          recurrenceInterval
        );

      if (
        !Number.isInteger(
          parsedInterval
        ) ||
        parsedInterval <= 0
      ) {
        setErrorMessage(
          "Το διάστημα επανάληψης πρέπει να είναι θετικός ακέραιος."
        );
        return;
      }

      recurrenceTypeValue =
        recurrenceType;

      recurrenceIntervalValue =
        parsedInterval;
    }

    try {
      setSaving(true);

      const { error } =
        await supabase
          .from("reminders")
          .insert({
            vehicle_id:
              selectedVehicle.id,

            maintenance_item_id:
              null,

            vehicle_issue_id:
              null,

            title:
              title.trim(),

            description:
              description.trim() ||
              null,

            reminder_type:
              "manual",

            due_date:
              dueDateValue,

            due_odometer_km:
              dueKmValue,

            recurrence_type:
              recurrenceTypeValue,

            recurrence_interval:
              recurrenceIntervalValue,

            priority,

            status:
              "upcoming",

            snoozed_until:
              null,

            snoozed_until_km:
              null,

            is_auto_generated:
              false,

            resolved_at:
              null,

            notes:
              notes.trim() ||
              null,
          });

      if (error) {
        throw error;
      }

      onSaved();
    } catch (error) {
      if (
        error instanceof Error
      ) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          "Παρουσιάστηκε άγνωστο σφάλμα."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="quick-form">
        Φόρτωση...
      </div>
    );
  }

  return (
    <div className="quick-form reminder-form">

      <label>
        Τίτλος

        <input
          type="text"
          value={title}
          placeholder="π.χ. Αλλαγή λαδιών"
          onChange={(event) =>
            setTitle(
              event.target.value
            )
          }
        />
      </label>


      <label>
        Περιγραφή

        <textarea
          rows={3}
          value={description}
          placeholder="Προαιρετική περιγραφή"
          onChange={(event) =>
            setDescription(
              event.target.value
            )
          }
        />
      </label>


      <div className="reminder-target-section">

        <label className="quick-checkbox">
          <input
            type="checkbox"
            checked={
              dueDateEnabled
            }
            onChange={(event) =>
              setDueDateEnabled(
                event.target
                  .checked
              )
            }
          />

          Υπενθύμιση με ημερομηνία
        </label>


        {dueDateEnabled && (
          <label>
            Ημερομηνία

            <input
              type="datetime-local"
              value={dueDate}
              onChange={(event) =>
                setDueDate(
                  event.target
                    .value
                )
              }
            />
          </label>
        )}


        <label className="quick-checkbox">
          <input
            type="checkbox"
            checked={
              dueKmEnabled
            }
            onChange={(event) =>
              setDueKmEnabled(
                event.target
                  .checked
              )
            }
          />

          Υπενθύμιση με χιλιόμετρα
        </label>


        {dueKmEnabled && (
          <label>
            Χιλιόμετρα

            <input
              type="number"
              min="0"
              step="1"
              value={
                dueOdometerKm
              }
              onChange={(event) =>
                setDueOdometerKm(
                  event.target
                    .value
                )
              }
            />

            {currentOdometer !==
              null && (
              <small className="form-helper">
                Τρέχουσα ένδειξη:{" "}
                {formatKm(
                  currentOdometer
                )}{" "}
                km
              </small>
            )}
          </label>
        )}

      </div>


      <label>
        Προτεραιότητα

        <select
          value={priority}
          onChange={(event) =>
            setPriority(
              event.target
                .value as Priority
            )
          }
        >
          <option value="low">
            Χαμηλή
          </option>

          <option value="medium">
            Μεσαία
          </option>

          <option value="high">
            Υψηλή
          </option>
        </select>
      </label>


      <div className="quick-form-grid">

        <label>
          Επανάληψη

          <select
            value={
              recurrenceType
            }
            onChange={(event) =>
              setRecurrenceType(
                event.target
                  .value as RecurrenceType
              )
            }
          >
            <option value="">
              Καμία
            </option>

            <option value="days">
              Ημέρες
            </option>

            <option value="weeks">
              Εβδομάδες
            </option>

            <option value="months">
              Μήνες
            </option>

            <option value="km">
              Χιλιόμετρα
            </option>
          </select>
        </label>


        {recurrenceType !==
          "" && (
          <label>
            Κάθε

            <input
              type="number"
              min="1"
              step="1"
              value={
                recurrenceInterval
              }
              placeholder={
                recurrenceType ===
                "km"
                  ? "π.χ. 10000"
                  : "π.χ. 12"
              }
              onChange={(event) =>
                setRecurrenceInterval(
                  event.target
                    .value
                )
              }
            />
          </label>
        )}

      </div>


      <label>
        Σημειώσεις

        <textarea
          rows={3}
          value={notes}
          placeholder="Προαιρετικές σημειώσεις"
          onChange={(event) =>
            setNotes(
              event.target.value
            )
          }
        />
      </label>


      {errorMessage && (
        <div
          className="form-error"
          role="alert"
        >
          {errorMessage}
        </div>
      )}


      <div className="modal-actions">

        <button
          type="button"
          className="secondary-button"
          disabled={saving}
          onClick={onCancel}
        >
          Πίσω
        </button>


        <button
          type="button"
          className="primary-button"
          disabled={
            saving ||
            !title.trim()
          }
          onClick={() =>
            void handleSave()
          }
        >
          {saving
            ? "Αποθήκευση..."
            : "Αποθήκευση υπενθύμισης"}
        </button>

      </div>

    </div>
  );
}