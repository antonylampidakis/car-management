import { useState } from "react";

import { supabase } from "../../lib/supabase";
import { useVehicle } from "./VehicleContext";

type AddVehicleFormProps = {
  onCreated?: () => void;
};

export default function AddVehicleForm({
  onCreated,
}: AddVehicleFormProps) {
  const { refreshVehicles } = useVehicle();

  const [name, setName] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [licensePlate, setLicensePlate] =
    useState("");

  const [fuelType, setFuelType] =
    useState("petrol");

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function handleSave() {
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage(
        "Το όνομα του οχήματος είναι υποχρεωτικό."
      );
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "Δεν βρέθηκε συνδεδεμένος χρήστης."
        );
      }

      const { error } = await supabase
        .from("vehicles")
        .insert({
          user_id: user.id,

          name: name.trim(),

          make: make.trim() || null,
          model: model.trim() || null,

          license_plate:
            licensePlate.trim() || null,

          fuel_type: fuelType,

          status: "active",
        });

      if (error) {
        throw error;
      }

      await refreshVehicles();

      onCreated?.();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Παρουσιάστηκε άγνωστο σφάλμα."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="add-vehicle-card">
      <div className="add-vehicle-header">
        <h2>Προσθήκη οχήματος</h2>

        <p>
          Καταχώρησε τα βασικά στοιχεία.
          Περισσότερα στοιχεία μπορούν να
          προστεθούν αργότερα.
        </p>
      </div>

      <div className="vehicle-form-grid">
        <label>
          Όνομα οχήματος *

          <input
            type="text"
            value={name}
            placeholder="π.χ. Toyota Yaris"
            onChange={(event) =>
              setName(event.target.value)
            }
          />
        </label>

        <label>
          Μάρκα

          <input
            type="text"
            value={make}
            placeholder="Toyota"
            onChange={(event) =>
              setMake(event.target.value)
            }
          />
        </label>

        <label>
          Μοντέλο

          <input
            type="text"
            value={model}
            placeholder="Yaris"
            onChange={(event) =>
              setModel(event.target.value)
            }
          />
        </label>

        <label>
          Πινακίδα

          <input
            type="text"
            value={licensePlate}
            placeholder="ABC-1234"
            onChange={(event) =>
              setLicensePlate(event.target.value)
            }
          />
        </label>

        <label>
          Καύσιμο

          <select
            value={fuelType}
            onChange={(event) =>
              setFuelType(event.target.value)
            }
          >
            <option value="petrol">
              Βενζίνη
            </option>

            <option value="diesel">
              Diesel
            </option>

            <option value="hybrid">
              Hybrid
            </option>

            <option value="plug_in_hybrid">
              Plug-in Hybrid
            </option>

            <option value="electric">
              Ηλεκτρικό
            </option>

            <option value="lpg">
              LPG
            </option>

            <option value="cng">
              CNG
            </option>

            <option value="other">
              Άλλο
            </option>
          </select>
        </label>
      </div>

      {errorMessage && (
        <div
          className="form-error"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <div className="vehicle-form-actions">
        <button
          type="button"
          className="primary-button"
          disabled={loading}
          onClick={() => void handleSave()}
        >
          {loading
            ? "Αποθήκευση..."
            : "Δημιουργία οχήματος"}
        </button>
      </div>
    </div>
  );
}