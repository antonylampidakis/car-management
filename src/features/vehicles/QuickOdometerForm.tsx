import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";
import { useVehicle } from "./VehicleContext";

type QuickOdometerFormProps = {
  onCancel: () => void;
  onSaved: () => void;
};

type CurrentOdometer = {
  odometer_km: number;
  recorded_at: string;
};

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

export default function QuickOdometerForm({
  onCancel,
  onSaved,
}: QuickOdometerFormProps) {
  const { selectedVehicle } =
    useVehicle();

  const [recordedAt, setRecordedAt] =
    useState(
      getLocalDateTimeValue()
    );

  const [odometerKm, setOdometerKm] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [
    currentOdometer,
    setCurrentOdometer,
  ] =
    useState<CurrentOdometer | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    async function loadCurrent() {
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
          .select(
            "odometer_km, recorded_at"
          )
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

        setCurrentOdometer(row);

        if (row) {
          setOdometerKm(
            String(
              row.odometer_km
            )
          );
        }
      }

      setLoading(false);
    }

    void loadCurrent();
  }, [selectedVehicle?.id]);

  async function handleSave() {
    if (!selectedVehicle) {
      return;
    }

    setErrorMessage("");

    const km =
      Number(odometerKm);

    if (
      !Number.isInteger(km) ||
      km < 0
    ) {
      setErrorMessage(
        "Συμπλήρωσε έγκυρα χιλιόμετρα."
      );

      return;
    }

    if (!recordedAt) {
      setErrorMessage(
        "Συμπλήρωσε ημερομηνία."
      );

      return;
    }

    const selectedDate =
      new Date(recordedAt);

    if (
      Number.isNaN(
        selectedDate.getTime()
      )
    ) {
      setErrorMessage(
        "Η ημερομηνία δεν είναι έγκυρη."
      );

      return;
    }

    /*
     * Αν η νέα ένδειξη είναι χρονικά
     * νεότερη από την τρέχουσα,
     * δεν επιτρέπουμε μικρότερα km.
     *
     * Ιστορικές εγγραφές επιτρέπονται.
     */
    if (
      currentOdometer &&
      selectedDate >=
        new Date(
          currentOdometer.recorded_at
        ) &&
      km <
        currentOdometer.odometer_km
    ) {
      setErrorMessage(
        `Η τρέχουσα ένδειξη είναι ${formatKm(
          currentOdometer.odometer_km
        )} km.`
      );

      return;
    }

    try {
      setSaving(true);

      const { error } =
        await supabase
          .from(
            "odometer_entries"
          )
          .insert({
            vehicle_id:
              selectedVehicle.id,

            odometer_km: km,

            recorded_at:
              selectedDate.toISOString(),

            source_type:
              "manual",

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
    <div className="quick-form">

      {currentOdometer && (
        <div className="odometer-current-box">
          <span>
            Τρέχουσα ένδειξη
          </span>

          <strong>
            {formatKm(
              currentOdometer.odometer_km
            )}{" "}
            km
          </strong>
        </div>
      )}


      <div className="quick-form-grid">

        <label>
          Ημερομηνία

          <input
            type="datetime-local"
            value={recordedAt}
            onChange={(event) =>
              setRecordedAt(
                event.target.value
              )
            }
          />
        </label>


        <label>
          Χιλιόμετρα

          <input
            type="number"
            min="0"
            step="1"
            value={odometerKm}
            placeholder="π.χ. 98650"
            onChange={(event) =>
              setOdometerKm(
                event.target.value
              )
            }
          />
        </label>

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
            !recordedAt ||
            !odometerKm
          }
          onClick={() =>
            void handleSave()
          }
        >
          {saving
            ? "Αποθήκευση..."
            : "Αποθήκευση χιλιομέτρων"}
        </button>

      </div>

    </div>
  );
}