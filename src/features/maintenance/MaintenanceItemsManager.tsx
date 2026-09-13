import {
  useEffect,
  useState,
} from "react";

import {
  Plus,
  Trash2,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useVehicle } from "../vehicles/VehicleContext";

type MaintenanceItem = {
  id: string;
  vehicle_id: string;
  code: string | null;
  name: string;
  category: string;
  tracking_type: string;
  interval_km: number | null;
  interval_months: number | null;
  warning_threshold_pct: number;
  urgent_threshold_pct: number;
  is_active: boolean;
};

type MaintenanceItemsManagerProps = {
  onChanged?: () => void;
};

export default function MaintenanceItemsManager({
  onChanged,
}: MaintenanceItemsManagerProps) {
  const { selectedVehicle } = useVehicle();

  const [items, setItems] =
    useState<MaintenanceItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [name, setName] =
    useState("");

  const [category, setCategory] =
    useState("engine");

  const [trackingType, setTrackingType] =
    useState("distance_or_time");

  const [intervalKm, setIntervalKm] =
    useState("");

  const [intervalMonths, setIntervalMonths] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  async function loadItems() {
    if (!selectedVehicle) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("maintenance_items")
      .select("*")
      .eq(
        "vehicle_id",
        selectedVehicle.id
      )
      .order("name");

    if (error) {
      setErrorMessage(error.message);
      setItems([]);
    } else {
      setItems(
        (data ?? []) as MaintenanceItem[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadItems();
  }, [selectedVehicle?.id]);

  async function handleAdd() {
    if (!selectedVehicle) {
      return;
    }

    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage(
        "Συμπλήρωσε όνομα."
      );
      return;
    }

    const km =
      intervalKm.trim() === ""
        ? null
        : Number(intervalKm);

    const months =
      intervalMonths.trim() === ""
        ? null
        : Number(intervalMonths);

    if (
      km !== null &&
      (
        !Number.isInteger(km) ||
        km <= 0
      )
    ) {
      setErrorMessage(
        "Το interval km πρέπει να είναι θετικός ακέραιος."
      );
      return;
    }

    if (
      months !== null &&
      (
        !Number.isInteger(months) ||
        months <= 0
      )
    ) {
      setErrorMessage(
        "Οι μήνες πρέπει να είναι θετικός ακέραιος."
      );
      return;
    }

    if (
      trackingType === "distance" &&
      km === null
    ) {
      setErrorMessage(
        "Για distance tracking χρειάζεται interval km."
      );
      return;
    }

    if (
      trackingType === "time" &&
      months === null
    ) {
      setErrorMessage(
        "Για time tracking χρειάζεται interval μηνών."
      );
      return;
    }

    if (
      trackingType === "distance_or_time" &&
      km === null &&
      months === null
    ) {
      setErrorMessage(
        "Χρειάζεται interval km ή/και μήνες."
      );
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("maintenance_items")
        .insert({
          vehicle_id:
            selectedVehicle.id,

          name:
            name.trim(),

          category,

          tracking_type:
            trackingType,

          interval_km:
            km,

          interval_months:
            months,

          warning_threshold_pct:
            75,

          urgent_threshold_pct:
            90,

          is_active:
            true,
        });

      if (error) {
        throw error;
      }

      setName("");
      setIntervalKm("");
      setIntervalMonths("");

      await loadItems();
      onChanged?.();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(
          error.message
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "Θέλεις να διαγράψεις αυτό το maintenance item;"
      );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("maintenance_items")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage(
        error.message
      );
      return;
    }

    await loadItems();
  }

  if (!selectedVehicle) {
    return null;
  }

  return (
    <div className="maintenance-manager">
      <section className="maintenance-create-card">
        <h2>
          Νέο Maintenance Item
        </h2>

        <div className="quick-form-grid">
          <label>
            Όνομα

            <input
              type="text"
              value={name}
              placeholder="π.χ. Λάδια κινητήρα"
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Κατηγορία

            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value
                )
              }
            >
              <option value="engine">
                Κινητήρας
              </option>

              <option value="brakes">
                Φρένα
              </option>

              <option value="tires">
                Ελαστικά
              </option>

              <option value="electrical">
                Ηλεκτρικά
              </option>

              <option value="fluids">
                Υγρά
              </option>

              <option value="filters">
                Φίλτρα
              </option>

              <option value="inspection">
                Έλεγχοι
              </option>

              <option value="administrative">
                Διοικητικά
              </option>

              <option value="other">
                Άλλο
              </option>
            </select>
          </label>

          <label>
            Tracking

            <select
              value={trackingType}
              onChange={(event) =>
                setTrackingType(
                  event.target.value
                )
              }
            >
              <option value="distance">
                Χιλιόμετρα
              </option>

              <option value="time">
                Χρόνος
              </option>

              <option value="distance_or_time">
                Χιλιόμετρα ή χρόνος
              </option>

              <option value="manual_condition">
                Χειροκίνητη κατάσταση
              </option>

              <option value="event_only">
                Μόνο ιστορικό
              </option>
            </select>
          </label>

          <label>
            Interval km

            <input
              type="number"
              min="1"
              step="1"
              value={intervalKm}
              onChange={(event) =>
                setIntervalKm(
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Interval μήνες

            <input
              type="number"
              min="1"
              step="1"
              value={intervalMonths}
              onChange={(event) =>
                setIntervalMonths(
                  event.target.value
                )
              }
            />
          </label>
        </div>

        {errorMessage && (
          <div className="form-error">
            {errorMessage}
          </div>
        )}

        <div className="maintenance-create-actions">
          <button
            type="button"
            className="primary-button"
            disabled={saving}
            onClick={() =>
              void handleAdd()
            }
          >
            <Plus size={16} />

            {saving
              ? "Αποθήκευση..."
              : "Προσθήκη"}
          </button>
        </div>
      </section>

      <section className="maintenance-list-card">
        <h2>
          Maintenance Items
        </h2>

        {loading ? (
          <p>Φόρτωση...</p>
        ) : items.length === 0 ? (
          <p>
            Δεν υπάρχουν maintenance items.
          </p>
        ) : (
          <div className="maintenance-items-list">
            {items.map((item) => (
              <div
                key={item.id}
                className="maintenance-item-row"
              >
                <div>
                  <strong>
                    {item.name}
                  </strong>

                  <span>
                    {item.interval_km
                      ? `${item.interval_km.toLocaleString(
                          "el-GR"
                        )} km`
                      : ""}

                    {item.interval_km &&
                    item.interval_months
                      ? " / "
                      : ""}

                    {item.interval_months
                      ? `${item.interval_months} μήνες`
                      : ""}
                  </span>
                </div>

                <button
                  type="button"
                  className="service-item-delete"
                  onClick={() =>
                    void handleDelete(
                      item.id
                    )
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}