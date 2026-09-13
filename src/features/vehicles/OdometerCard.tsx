import { useEffect, useState } from "react";
import {
  Gauge,
  Pencil,
  X,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useVehicle } from "./VehicleContext";

type OdometerData = {
  vehicle_id: string;
  odometer_entry_id: string;
  recorded_at: string;
  odometer_km: number;
  source_type: string | null;
  notes: string | null;
};

export default function OdometerCard() {
  const { selectedVehicle } = useVehicle();

  const [odometer, setOdometer] =
    useState<OdometerData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [showForm, setShowForm] =
    useState(false);

  const [newKm, setNewKm] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  async function loadOdometer() {
    if (!selectedVehicle) {
      setOdometer(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("current_vehicle_odometer")
      .select("*")
      .eq("vehicle_id", selectedVehicle.id)
      .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      setOdometer(null);
      setLoading(false);
      return;
    }

    setOdometer(data as OdometerData | null);
    setLoading(false);
  }

  useEffect(() => {
    void loadOdometer();
  }, [selectedVehicle?.id]);

  function openForm() {
    setErrorMessage("");

    if (odometer) {
      setNewKm(String(odometer.odometer_km));
    } else {
      setNewKm("");
    }

    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setNewKm("");
    setErrorMessage("");
  }

  async function handleSave() {
    if (!selectedVehicle) {
      return;
    }

    setErrorMessage("");

    const parsedKm = Number(newKm);

    if (
      !Number.isFinite(parsedKm) ||
      !Number.isInteger(parsedKm) ||
      parsedKm < 0
    ) {
      setErrorMessage(
        "Τα χιλιόμετρα πρέπει να είναι θετικός ακέραιος αριθμός."
      );
      return;
    }

    /*
     * Δεν απαγορεύουμε στη βάση μια μικρότερη
     * ιστορική μέτρηση γενικά.
     *
     * Εδώ όμως η φόρμα είναι για ΝΕΑ τρέχουσα μέτρηση,
     * άρα δεν επιτρέπουμε μικρότερη τιμή από την
     * τελευταία γνωστή.
     */
    if (
      odometer &&
      parsedKm < odometer.odometer_km
    ) {
      setErrorMessage(
        `Η τελευταία ένδειξη είναι ${formatKm(
          odometer.odometer_km
        )} km. Η νέα ένδειξη δεν μπορεί να είναι μικρότερη.`
      );

      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("odometer_entries")
        .insert({
          vehicle_id: selectedVehicle.id,
          odometer_km: parsedKm,
          recorded_at: new Date().toISOString(),
          source_type: "manual",
          notes: null,
        });

      if (error) {
        throw error;
      }

      setShowForm(false);
      setNewKm("");

      await loadOdometer();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Παρουσιάστηκε άγνωστο σφάλμα."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  function formatKm(value: number) {
    return new Intl.NumberFormat("el-GR", {
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  }

  if (!selectedVehicle) {
    return null;
  }

  return (
    <>
      <section className="dashboard-card odometer-card">
        <div className="dashboard-card-header">
          <div className="dashboard-card-icon">
            <Gauge size={21} />
          </div>

          <span>Τρέχοντα χιλιόμετρα</span>
        </div>

        {loading ? (
          <div className="dashboard-card-loading">
            Φόρτωση...
          </div>
        ) : (
          <>
            <div className="odometer-value">
              {odometer
                ? formatKm(odometer.odometer_km)
                : "—"}

              {odometer && (
                <span className="odometer-unit">
                  km
                </span>
              )}
            </div>

            <div className="odometer-meta">
              {odometer
                ? `Τελευταία ενημέρωση: ${formatDate(
                    odometer.recorded_at
                  )}`
                : "Δεν έχει καταχωρηθεί ένδειξη χιλιομέτρων."}
            </div>

            <button
              type="button"
              className="card-action-button"
              onClick={openForm}
            >
              <Pencil size={16} />

              {odometer
                ? "Ενημέρωση"
                : "Καταχώρηση χιλιομέτρων"}
            </button>
          </>
        )}
      </section>

      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <div
            className="app-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="odometer-dialog-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="odometer-dialog-title">
                  Ενημέρωση χιλιομέτρων
                </h2>

                <p>
                  {selectedVehicle.name}
                </p>
              </div>

              <button
                type="button"
                className="modal-close-button"
                aria-label="Κλείσιμο"
                onClick={closeForm}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {odometer && (
                <div className="current-value-info">
                  Τρέχουσα ένδειξη:
                  <strong>
                    {" "}
                    {formatKm(
                      odometer.odometer_km
                    )}{" "}
                    km
                  </strong>
                </div>
              )}

              <label className="form-field">
                Νέα ένδειξη χιλιομέτρων

                <div className="input-with-suffix">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newKm}
                    autoFocus
                    onChange={(event) =>
                      setNewKm(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !saving
                      ) {
                        void handleSave();
                      }
                    }}
                  />

                  <span>km</span>
                </div>
              </label>

              {errorMessage && (
                <div
                  className="form-error"
                  role="alert"
                >
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={saving}
                onClick={closeForm}
              >
                Ακύρωση
              </button>

              <button
                type="button"
                className="primary-button"
                disabled={
                  saving || newKm.trim() === ""
                }
                onClick={() =>
                  void handleSave()
                }
              >
                {saving
                  ? "Αποθήκευση..."
                  : "Αποθήκευση"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}