import { useState } from "react";

import { supabase } from "../../lib/supabase";
import { useVehicle } from "../vehicles/VehicleContext";

type QuickExpenseFormProps = {
  onCancel: () => void;
  onSaved: () => void;
};

export default function QuickExpenseForm({
  onCancel,
  onSaved,
}: QuickExpenseFormProps) {
  const { selectedVehicle } = useVehicle();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSave() {
    if (!selectedVehicle) {
      return;
    }

    setErrorMessage("");

    const amountValue = Number(amount);

    if (!description.trim()) {
      setErrorMessage("Συμπλήρωσε περιγραφή.");
      return;
    }

    if (
      !Number.isFinite(amountValue) ||
      amountValue <= 0
    ) {
      setErrorMessage("Συμπλήρωσε έγκυρο ποσό.");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("expenses")
        .insert({
          vehicle_id: selectedVehicle.id,
          description: description.trim(),
          amount: amountValue,
          expense_date: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      onSaved();
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

  return (
    <div className="quick-form">
      <label>
        Περιγραφή

        <input
          type="text"
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
          placeholder="π.χ. Πλύσιμο"
        />
      </label>

      <label>
        Ποσό €

        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) =>
            setAmount(event.target.value)
          }
          placeholder="0,00"
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
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving
            ? "Αποθήκευση..."
            : "Αποθήκευση"}
        </button>
      </div>
    </div>
  );
}