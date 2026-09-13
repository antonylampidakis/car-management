import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Plus,
  Trash2,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useVehicle } from "../vehicles/VehicleContext";

type QuickServiceFormProps = {
  onCancel: () => void;
  onSaved: () => void;
};

type MaintenanceItem = {
  id: string;
  name: string;
  category: string;
};

type ServiceItemForm = {
  localId: string;

  name: string;

  itemType:
    | "maintenance"
    | "repair"
    | "inspection"
    | "replacement"
    | "labor"
    | "other";

  maintenanceItemId: string;

  laborCost: string;
  partsCost: string;

  notes: string;
};

function getLocalDateTimeValue() {
  const now = new Date();

  const offset = now.getTimezoneOffset();

  return new Date(
    now.getTime() - offset * 60_000
  )
    .toISOString()
    .slice(0, 16);
}

function createEmptyItem(): ServiceItemForm {
  return {
    localId: crypto.randomUUID(),

    name: "",

    itemType: "maintenance",

    maintenanceItemId: "",

    laborCost: "",
    partsCost: "",

    notes: "",
  };
}

export default function QuickServiceForm({
  onCancel,
  onSaved,
}: QuickServiceFormProps) {
  const { selectedVehicle } = useVehicle();

  const [serviceDate, setServiceDate] =
    useState(getLocalDateTimeValue());

  const [odometerKm, setOdometerKm] =
    useState("");

  const [serviceType, setServiceType] =
    useState("scheduled_maintenance");

  const [
    maintenanceKind,
    setMaintenanceKind,
  ] = useState("scheduled");

  const [description, setDescription] =
    useState("");

  const [otherCost, setOtherCost] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [items, setItems] =
    useState<ServiceItemForm[]>([
      createEmptyItem(),
    ]);

  const [
    maintenanceItems,
    setMaintenanceItems,
  ] = useState<MaintenanceItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");


  useEffect(() => {
    async function loadInitialData() {
      if (!selectedVehicle) {
        setLoading(false);
        return;
      }

      setLoading(true);


      const [
        odometerResult,
        maintenanceResult,
      ] = await Promise.all([
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

        supabase
          .from("maintenance_items")
          .select(
            "id, name, category"
          )
          .eq(
            "vehicle_id",
            selectedVehicle.id
          )
          .eq("is_active", true)
          .order("name"),
      ]);


      if (
        odometerResult.data?.odometer_km !==
        undefined
      ) {
        setOdometerKm(
          String(
            odometerResult.data
              .odometer_km
          )
        );
      }


      if (maintenanceResult.error) {
        console.error(
          maintenanceResult.error
        );
      } else {
        setMaintenanceItems(
          (maintenanceResult.data ??
            []) as MaintenanceItem[]
        );
      }


      setLoading(false);
    }

    void loadInitialData();
  }, [selectedVehicle?.id]);


  const totals = useMemo(() => {
    const labor =
      items.reduce(
        (sum, item) =>
          sum +
          (Number(item.laborCost) || 0),
        0
      );

    const parts =
      items.reduce(
        (sum, item) =>
          sum +
          (Number(item.partsCost) || 0),
        0
      );

    const other =
      Number(otherCost) || 0;

    return {
      labor,
      parts,
      other,
      total:
        labor + parts + other,
    };
  }, [items, otherCost]);


  function updateItem(
    localId: string,
    patch: Partial<ServiceItemForm>
  ) {
    setItems((current) =>
      current.map((item) =>
        item.localId === localId
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  }


  function addItem() {
    setItems((current) => [
      ...current,
      createEmptyItem(),
    ]);
  }


  function removeItem(localId: string) {
    setItems((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter(
        (item) =>
          item.localId !== localId
      );
    });
  }


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


    if (!serviceDate) {
      setErrorMessage(
        "Συμπλήρωσε ημερομηνία."
      );

      return;
    }


    const validItems =
      items.filter(
        (item) =>
          item.name.trim() !== ""
      );


    if (validItems.length === 0) {
      setErrorMessage(
        "Πρόσθεσε τουλάχιστον μία εργασία."
      );

      return;
    }


    for (const item of validItems) {
      const labor =
        Number(item.laborCost || 0);

      const parts =
        Number(item.partsCost || 0);

      if (
        !Number.isFinite(labor) ||
        labor < 0 ||
        !Number.isFinite(parts) ||
        parts < 0
      ) {
        setErrorMessage(
          `Μη έγκυρο κόστος στην εργασία "${item.name}".`
        );

        return;
      }
    }


    const parsedOther =
      Number(otherCost || 0);

    if (
      !Number.isFinite(parsedOther) ||
      parsedOther < 0
    ) {
      setErrorMessage(
        "Μη έγκυρο πρόσθετο κόστος."
      );

      return;
    }


    try {
      setSaving(true);

      const selectedDate =
        new Date(serviceDate);

      const payload =
        validItems.map((item) => ({
          name:
            item.name.trim(),

          item_type:
            item.itemType,

          maintenance_item_id:
            item.maintenanceItemId ||
            null,

          labor_cost:
            Number(
              item.laborCost || 0
            ),

          parts_cost:
            Number(
              item.partsCost || 0
            ),

          notes:
            item.notes.trim() ||
            null,
        }));


      const { error } =
        await supabase.rpc(
          "add_service_record",
          {
            p_vehicle_id:
              selectedVehicle.id,

            p_service_date:
              selectedDate.toISOString(),

            p_odometer_km:
              km,

            p_service_type:
              serviceType,

            p_maintenance_kind:
              maintenanceKind,

            p_description:
              description.trim() ||
              null,

            p_other_cost:
              parsedOther,

            p_notes:
              notes.trim() ||
              null,

            p_items:
              payload,
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


  if (loading) {
    return (
      <div className="quick-form">
        Φόρτωση...
      </div>
    );
  }


  return (
    <div className="quick-form service-quick-form">

      <div className="quick-form-grid">

        <label>
          Ημερομηνία

          <input
            type="datetime-local"
            value={serviceDate}
            onChange={(event) =>
              setServiceDate(
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
            onChange={(event) =>
              setOdometerKm(
                event.target.value
              )
            }
          />
        </label>


        <label>
          Τύπος

          <select
            value={serviceType}
            onChange={(event) =>
              setServiceType(
                event.target.value
              )
            }
          >
            <option value="minor">
              Μικρό Service
            </option>

            <option value="major">
              Μεγάλο Service
            </option>

            <option value="scheduled_maintenance">
              Συντήρηση
            </option>

            <option value="repair">
              Επισκευή
            </option>

            <option value="inspection">
              Έλεγχος
            </option>

            <option value="other">
              Άλλο
            </option>
          </select>
        </label>


        <label>
          Χαρακτήρας

          <select
            value={maintenanceKind}
            onChange={(event) =>
              setMaintenanceKind(
                event.target.value
              )
            }
          >
            <option value="scheduled">
              Προγραμματισμένη
            </option>

            <option value="unscheduled">
              Έκτακτη
            </option>
          </select>
        </label>

      </div>


      <label>
        Περιγραφή

        <input
          type="text"
          value={description}
          placeholder="π.χ. Μεγάλο service"
          onChange={(event) =>
            setDescription(
              event.target.value
            )
          }
        />
      </label>


      <div className="service-items-header">
        <div>
          <strong>
            Εργασίες
          </strong>

          <small>
            Πρόσθεσε ό,τι πραγματικά έγινε.
          </small>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={addItem}
        >
          <Plus size={16} />
          Εργασία
        </button>
      </div>


      <div className="service-items-list">

        {items.map(
          (item, index) => (
            <div
              key={item.localId}
              className="service-item-editor"
            >

              <div className="service-item-title">
                <strong>
                  Εργασία {index + 1}
                </strong>

                {items.length > 1 && (
                  <button
                    type="button"
                    className="service-item-delete"
                    aria-label="Διαγραφή εργασίας"
                    onClick={() =>
                      removeItem(
                        item.localId
                      )
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>


              <div className="quick-form-grid">

                <label>
                  Εργασία

                  <input
                    type="text"
                    value={item.name}
                    placeholder="π.χ. Αλλαγή λαδιών"
                    onChange={(event) =>
                      updateItem(
                        item.localId,
                        {
                          name:
                            event.target
                              .value,
                        }
                      )
                    }
                  />
                </label>


                <label>
                  Τύπος εργασίας

                  <select
                    value={item.itemType}
                    onChange={(event) =>
                      updateItem(
                        item.localId,
                        {
                          itemType:
                            event.target
                              .value as ServiceItemForm["itemType"],
                        }
                      )
                    }
                  >
                    <option value="maintenance">
                      Συντήρηση
                    </option>

                    <option value="replacement">
                      Αντικατάσταση
                    </option>

                    <option value="repair">
                      Επισκευή
                    </option>

                    <option value="inspection">
                      Έλεγχος
                    </option>

                    <option value="labor">
                      Εργασία
                    </option>

                    <option value="other">
                      Άλλο
                    </option>
                  </select>
                </label>


                <label>
                  Vehicle Health

                  <select
                    value={
                      item.maintenanceItemId
                    }
                    onChange={(event) =>
                      updateItem(
                        item.localId,
                        {
                          maintenanceItemId:
                            event.target
                              .value,
                        }
                      )
                    }
                  >
                    <option value="">
                      Δεν συνδέεται
                    </option>

                    {maintenanceItems.map(
                      (maintenanceItem) => (
                        <option
                          key={
                            maintenanceItem.id
                          }
                          value={
                            maintenanceItem.id
                          }
                        >
                          {
                            maintenanceItem.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>


                <label>
                  Κόστος εργασίας €

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      item.laborCost
                    }
                    onChange={(event) =>
                      updateItem(
                        item.localId,
                        {
                          laborCost:
                            event.target
                              .value,
                        }
                      )
                    }
                  />
                </label>


                <label>
                  Ανταλλακτικά €

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      item.partsCost
                    }
                    onChange={(event) =>
                      updateItem(
                        item.localId,
                        {
                          partsCost:
                            event.target
                              .value,
                        }
                      )
                    }
                  />
                </label>

              </div>


              <label>
                Σημειώσεις εργασίας

                <input
                  type="text"
                  value={item.notes}
                  onChange={(event) =>
                    updateItem(
                      item.localId,
                      {
                        notes:
                          event.target
                            .value,
                      }
                    )
                  }
                />
              </label>

            </div>
          )
        )}

      </div>


      <label>
        Άλλο κόστος €

        <input
          type="number"
          min="0"
          step="0.01"
          value={otherCost}
          onChange={(event) =>
            setOtherCost(
              event.target.value
            )
          }
        />
      </label>


      <div className="service-total-box">

        <div>
          <span>Εργασία</span>
          <strong>
            €{totals.labor.toFixed(2)}
          </strong>
        </div>

        <div>
          <span>Ανταλλακτικά</span>
          <strong>
            €{totals.parts.toFixed(2)}
          </strong>
        </div>

        <div>
          <span>Άλλα</span>
          <strong>
            €{totals.other.toFixed(2)}
          </strong>
        </div>

        <div className="service-total-main">
          <span>Σύνολο</span>
          <strong>
            €{totals.total.toFixed(2)}
          </strong>
        </div>

      </div>


      <label>
        Γενικές σημειώσεις

        <textarea
          rows={3}
          value={notes}
          onChange={(event) =>
            setNotes(
              event.target.value
            )
          }
        />
      </label>


      {maintenanceItems.length === 0 && (
        <div className="form-info">
          Δεν υπάρχουν ακόμη Vehicle Health items.
          Το service θα αποθηκευτεί κανονικά,
          αλλά δεν θα ενημερώσει κάποιο maintenance interval.
        </div>
      )}


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
          onClick={() =>
            void handleSave()
          }
        >
          {saving
            ? "Αποθήκευση..."
            : "Αποθήκευση Service"}
        </button>

      </div>

    </div>
  );
}