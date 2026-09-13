import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";
import { useVehicle } from "../vehicles/VehicleContext";

type QuickFuelFormProps = {
  onCancel: () => void;
  onSaved: () => void;
};

type CurrentOdometer = {
  odometer_km: number;
  recorded_at: string;
};

function getLocalDateTimeValue() {
  const now = new Date();

  const offset = now.getTimezoneOffset();

  const localDate = new Date(
    now.getTime() - offset * 60_000
  );

  return localDate
    .toISOString()
    .slice(0, 16);
}

export default function QuickFuelForm({
  onCancel,
  onSaved,
}: QuickFuelFormProps) {
  const { selectedVehicle } = useVehicle();

  const [fuelDate, setFuelDate] =
    useState(getLocalDateTimeValue());

  const [odometerKm, setOdometerKm] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [pricePerLiter, setPricePerLiter] =
    useState("");

  const [isFullTank, setIsFullTank] =
    useState(false);

  const [notes, setNotes] =
    useState("");

  const [currentOdometer, setCurrentOdometer] =
    useState<CurrentOdometer | null>(null);

  const [loadingOdometer, setLoadingOdometer] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadCurrentOdometer() {
      if (!selectedVehicle) {
        setCurrentOdometer(null);
        setLoadingOdometer(false);
        return;
      }

      setLoadingOdometer(true);

      const { data, error } = await supabase
        .from("current_vehicle_odometer")
        .select("odometer_km, recorded_at")
        .eq("vehicle_id", selectedVehicle.id)
        .maybeSingle();

      if (error) {
        console.error(
          "Failed to load odometer:",
          error
        );

        setCurrentOdometer(null);
      } else {
        const row =
          data as CurrentOdometer | null;

        setCurrentOdometer(row);

        if (row) {
          setOdometerKm(
            String(row.odometer_km)
          );
        }
      }

      setLoadingOdometer(false);
    }

    void loadCurrentOdometer();
  }, [selectedVehicle?.id]);

  const calculatedLiters = useMemo(() => {
    const amountValue = Number(amount);
    const priceValue =
      Number(pricePerLiter);

    if (
      !Number.isFinite(amountValue) ||
      !Number.isFinite(priceValue) ||
      amountValue <= 0 ||
      priceValue <= 0
    ) {
      return null;
    }

    return amountValue / priceValue;
  }, [amount, pricePerLiter]);

  function formatKm(value: number) {
    return new Intl.NumberFormat(
      "el-GR"
    ).format(value);
  }

  async function handleSave() {
    if (!selectedVehicle) {
      return;
    }

    setErrorMessage("");

    const km =
      Number(odometerKm);

    const amountValue =
      Number(amount);

    const priceValue =
      Number(pricePerLiter);

    if (!fuelDate) {
      setErrorMessage(
        "Συμπλήρωσε ημερομηνία ανεφοδιασμού."
      );
      return;
    }

    if (
      !Number.isFinite(km) ||
      !Number.isInteger(km) ||
      km < 0
    ) {
      setErrorMessage(
        "Συμπλήρωσε έγκυρα χιλιόμετρα."
      );
      return;
    }

    if (
      !Number.isFinite(amountValue) ||
      amountValue <= 0
    ) {
      setErrorMessage(
        "Συμπλήρωσε έγκυρο ποσό."
      );
      return;
    }

    if (
      !Number.isFinite(priceValue) ||
      priceValue <= 0
    ) {
      setErrorMessage(
        "Συμπλήρωσε έγκυρη τιμή ανά λίτρο."
      );
      return;
    }

    /*
     * Για σημερινή / νεότερη εγγραφή:
     * δεν επιτρέπουμε km μικρότερα από τα
     * τρέχοντα.
     *
     * Για ιστορικές εγγραφές, η βάση κάνει
     * ακριβέστερο chronological validation.
     */
    if (
      currentOdometer &&
      new Date(fuelDate) >=
        new Date(
          currentOdometer.recorded_at
        ) &&
      km < currentOdometer.odometer_km
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

      const selectedDate =
        new Date(fuelDate);

      if (
        Number.isNaN(
          selectedDate.getTime()
        )
      ) {
        throw new Error(
          "Μη έγκυρη ημερομηνία."
        );
      }

      const { error } =
        await supabase.rpc(
          "add_fuel_entry",
          {
            p_vehicle_id:
              selectedVehicle.id,

            p_fuel_date:
              selectedDate.toISOString(),

            p_odometer_km: km,

            p_amount:
              amountValue,

            p_price_per_liter:
              priceValue,

            p_is_full_tank:
              isFullTank,

            p_notes:
              notes.trim() || null,
          }
        );

      if (error) {
        throw error;
      }

      onSaved();
    } catch (error) {
      if (error instanceof Error) {
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

  return (
    <div className="quick-form">
      <div className="quick-form-grid">

        <label>
          Ημερομηνία

          <input
            type="datetime-local"
            value={fuelDate}
            onChange={(event) =>
              setFuelDate(
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
            disabled={loadingOdometer}
            onChange={(event) =>
              setOdometerKm(
                event.target.value
              )
            }
          />

          <small className="form-helper">
            {loadingOdometer
              ? "Φόρτωση τελευταίας ένδειξης..."
              : currentOdometer
                ? `Τρέχουσα ένδειξη: ${formatKm(
                    currentOdometer.odometer_km
                  )} km`
                : "Δεν υπάρχει προηγούμενη ένδειξη."}
          </small>
        </label>


        <label>
          Ποσό €

          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            placeholder="π.χ. 50"
            onChange={(event) =>
              setAmount(
                event.target.value
              )
            }
          />
        </label>


        <label>
          Τιμή / λίτρο €

          <input
            type="number"
            min="0"
            step="0.001"
            value={pricePerLiter}
            placeholder="π.χ. 2.395"
            onChange={(event) =>
              setPricePerLiter(
                event.target.value
              )
            }
          />
        </label>
      </div>


      <div className="calculated-field">
        <span>
          Υπολογισμένα λίτρα
        </span>

        <strong>
          {calculatedLiters !== null
            ? `${calculatedLiters.toFixed(
                3
              )} L`
            : "—"}
        </strong>
      </div>


      <label className="quick-checkbox">
        <input
          type="checkbox"
          checked={isFullTank}
          onChange={(event) =>
            setIsFullTank(
              event.target.checked
            )
          }
        />

        Πλήρες γέμισμα
      </label>


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
            !fuelDate ||
            !odometerKm ||
            !amount ||
            !pricePerLiter
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
  );
}