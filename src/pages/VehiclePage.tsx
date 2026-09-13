import {
  useEffect,
  useState,
} from "react";

import {
  Car,
  CheckCircle2,
  Save,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useVehicle } from "../features/vehicles/VehicleContext";

type VehicleFormState = {
  name: string;

  make: string;
  model: string;
  variant: string;

  manufacture_year: string;
  first_registration_date: string;

  license_plate: string;
  vin: string;
  color: string;

  fuel_type: string;

  engine_cc: string;
  power_hp: string;
  tank_capacity_liters: string;

  purchase_date: string;
  purchase_odometer_km: string;
  purchase_price: string;

  status: string;

  sold_date: string;
  sold_odometer_km: string;
  sold_price: string;

  notes: string;
};

function createEmptyForm(): VehicleFormState {
  return {
    name: "",

    make: "",
    model: "",
    variant: "",

    manufacture_year: "",
    first_registration_date: "",

    license_plate: "",
    vin: "",
    color: "",

    fuel_type: "",

    engine_cc: "",
    power_hp: "",
    tank_capacity_liters: "",

    purchase_date: "",
    purchase_odometer_km: "",
    purchase_price: "",

    status: "active",

    sold_date: "",
    sold_odometer_km: "",
    sold_price: "",

    notes: "",
  };
}

function nullableText(
  value: string
) {
  const trimmed = value.trim();

  return trimmed
    ? trimmed
    : null;
}

function nullableInteger(
  value: string
) {
  if (!value.trim()) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isInteger(
      parsed
    )
  ) {
    return undefined;
  }

  return parsed;
}

function nullableNumber(
  value: string
) {
  if (!value.trim()) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return undefined;
  }

  return parsed;
}

export default function VehiclePage() {
  const {
    selectedVehicle,
  } = useVehicle();

  const [
    form,
    setForm,
  ] = useState<VehicleFormState>(
    createEmptyForm()
  );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  async function loadVehicle() {
    if (!selectedVehicle) {
      setForm(
        createEmptyForm()
      );

      setLoading(false);

      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const {
      data,
      error,
    } = await supabase
      .from("vehicles")
      .select("*")
      .eq(
        "id",
        selectedVehicle.id
      )
      .single();

    if (error) {
      setErrorMessage(
        error.message
      );

      setLoading(false);

      return;
    }

    setForm({
      name:
        data.name ?? "",

      make:
        data.make ?? "",

      model:
        data.model ?? "",

      variant:
        data.variant ?? "",

      manufacture_year:
        data.manufacture_year !==
        null
          ? String(
              data.manufacture_year
            )
          : "",

      first_registration_date:
        data.first_registration_date ??
        "",

      license_plate:
        data.license_plate ?? "",

      vin:
        data.vin ?? "",

      color:
        data.color ?? "",

      fuel_type:
        data.fuel_type ?? "",

      engine_cc:
        data.engine_cc !==
        null
          ? String(
              data.engine_cc
            )
          : "",

      power_hp:
        data.power_hp !==
        null
          ? String(
              data.power_hp
            )
          : "",

      tank_capacity_liters:
        data.tank_capacity_liters !==
        null
          ? String(
              data.tank_capacity_liters
            )
          : "",

      purchase_date:
        data.purchase_date ?? "",

      purchase_odometer_km:
        data.purchase_odometer_km !==
        null
          ? String(
              data.purchase_odometer_km
            )
          : "",

      purchase_price:
        data.purchase_price !==
        null
          ? String(
              data.purchase_price
            )
          : "",

      status:
        data.status ??
        "active",

      sold_date:
        data.sold_date ?? "",

      sold_odometer_km:
        data.sold_odometer_km !==
        null
          ? String(
              data.sold_odometer_km
            )
          : "",

      sold_price:
        data.sold_price !==
        null
          ? String(
              data.sold_price
            )
          : "",

      notes:
        data.notes ?? "",
    });

    setLoading(false);
  }

  useEffect(() => {
    void loadVehicle();
  }, [selectedVehicle?.id]);

  function updateField(
    field: keyof VehicleFormState,
    value: string
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );

    setSuccessMessage("");
  }

  async function handleSave() {
    if (!selectedVehicle) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (!form.name.trim()) {
      setErrorMessage(
        "Το όνομα του οχήματος είναι υποχρεωτικό."
      );

      return;
    }

    const manufactureYear =
      nullableInteger(
        form.manufacture_year
      );

    const engineCc =
      nullableInteger(
        form.engine_cc
      );

    const purchaseOdometer =
      nullableInteger(
        form.purchase_odometer_km
      );

    const soldOdometer =
      nullableInteger(
        form.sold_odometer_km
      );

    const powerHp =
      nullableNumber(
        form.power_hp
      );

    const tankCapacity =
      nullableNumber(
        form.tank_capacity_liters
      );

    const purchasePrice =
      nullableNumber(
        form.purchase_price
      );

    const soldPrice =
      nullableNumber(
        form.sold_price
      );

    if (
      manufactureYear ===
      undefined
    ) {
      setErrorMessage(
        "Το έτος κατασκευής πρέπει να είναι ακέραιος αριθμός."
      );

      return;
    }

    if (
      manufactureYear !==
        null &&
      (
        manufactureYear <
          1886 ||
        manufactureYear >
          new Date().getFullYear() +
            1
      )
    ) {
      setErrorMessage(
        "Το έτος κατασκευής δεν είναι έγκυρο."
      );

      return;
    }

    if (
      engineCc ===
      undefined
    ) {
      setErrorMessage(
        "Ο κυβισμός πρέπει να είναι ακέραιος αριθμός."
      );

      return;
    }

    if (
      engineCc !== null &&
      engineCc < 0
    ) {
      setErrorMessage(
        "Ο κυβισμός δεν μπορεί να είναι αρνητικός."
      );

      return;
    }

    if (
      powerHp ===
      undefined
    ) {
      setErrorMessage(
        "Η ισχύς πρέπει να είναι αριθμός."
      );

      return;
    }

    if (
      powerHp !== null &&
      powerHp < 0
    ) {
      setErrorMessage(
        "Η ισχύς δεν μπορεί να είναι αρνητική."
      );

      return;
    }

    if (
      tankCapacity ===
      undefined
    ) {
      setErrorMessage(
        "Η χωρητικότητα ρεζερβουάρ πρέπει να είναι αριθμός."
      );

      return;
    }

    if (
      tankCapacity !==
        null &&
      tankCapacity < 0
    ) {
      setErrorMessage(
        "Η χωρητικότητα ρεζερβουάρ δεν μπορεί να είναι αρνητική."
      );

      return;
    }

    if (
      purchaseOdometer ===
      undefined
    ) {
      setErrorMessage(
        "Τα χιλιόμετρα αγοράς πρέπει να είναι ακέραιος αριθμός."
      );

      return;
    }

    if (
      purchaseOdometer !==
        null &&
      purchaseOdometer < 0
    ) {
      setErrorMessage(
        "Τα χιλιόμετρα αγοράς δεν μπορούν να είναι αρνητικά."
      );

      return;
    }

    if (
      purchasePrice ===
      undefined
    ) {
      setErrorMessage(
        "Η τιμή αγοράς πρέπει να είναι αριθμός."
      );

      return;
    }

    if (
      purchasePrice !==
        null &&
      purchasePrice < 0
    ) {
      setErrorMessage(
        "Η τιμή αγοράς δεν μπορεί να είναι αρνητική."
      );

      return;
    }

    if (
      soldOdometer ===
      undefined
    ) {
      setErrorMessage(
        "Τα χιλιόμετρα πώλησης πρέπει να είναι ακέραιος αριθμός."
      );

      return;
    }

    if (
      soldOdometer !==
        null &&
      soldOdometer < 0
    ) {
      setErrorMessage(
        "Τα χιλιόμετρα πώλησης δεν μπορούν να είναι αρνητικά."
      );

      return;
    }

    if (
      soldPrice ===
      undefined
    ) {
      setErrorMessage(
        "Η τιμή πώλησης πρέπει να είναι αριθμός."
      );

      return;
    }

    if (
      soldPrice !== null &&
      soldPrice < 0
    ) {
      setErrorMessage(
        "Η τιμή πώλησης δεν μπορεί να είναι αρνητική."
      );

      return;
    }

    if (
      form.status ===
        "sold" &&
      !form.sold_date
    ) {
      setErrorMessage(
        "Για πωλημένο όχημα συμπλήρωσε ημερομηνία πώλησης."
      );

      return;
    }

    try {
      setSaving(true);

      const {
        error,
      } = await supabase
        .from("vehicles")
        .update({
          name:
            form.name.trim(),

          make:
            nullableText(
              form.make
            ),

          model:
            nullableText(
              form.model
            ),

          variant:
            nullableText(
              form.variant
            ),

          manufacture_year:
            manufactureYear,

          first_registration_date:
            form.first_registration_date ||
            null,

          license_plate:
            nullableText(
              form.license_plate
            ),

          vin:
            nullableText(
              form.vin
            ),

          color:
            nullableText(
              form.color
            ),

          fuel_type:
            nullableText(
              form.fuel_type
            ),

          engine_cc:
            engineCc,

          power_hp:
            powerHp,

          tank_capacity_liters:
            tankCapacity,

          purchase_date:
            form.purchase_date ||
            null,

          purchase_odometer_km:
            purchaseOdometer,

          purchase_price:
            purchasePrice,

          status:
            form.status,

          sold_date:
            form.status ===
            "sold"
              ? form.sold_date ||
                null
              : null,

          sold_odometer_km:
            form.status ===
            "sold"
              ? soldOdometer
              : null,

          sold_price:
            form.status ===
            "sold"
              ? soldPrice
              : null,

          notes:
            nullableText(
              form.notes
            ),
        })
        .eq(
          "id",
          selectedVehicle.id
        );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        "Τα στοιχεία του οχήματος αποθηκεύτηκαν."
      );

      await loadVehicle();
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

  if (!selectedVehicle) {
    return (
      <div className="page-content">

        <div className="page-header">
          <div>
            <h1>
              Όχημα
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

  if (loading) {
    return (
      <div className="page-content">

        <div className="vehicle-empty">
          Φόρτωση στοιχείων
          οχήματος...
        </div>

      </div>
    );
  }

  return (
    <div className="page-content">

      <div className="page-header">

        <div>
          <h1>
            Όχημα
          </h1>

          <p>
            Στοιχεία,
            τεχνικά
            χαρακτηριστικά και
            πληροφορίες
            ιδιοκτησίας.
          </p>
        </div>


        <button
          type="button"
          className="primary-button vehicle-save-button"
          disabled={saving}
          onClick={() =>
            void handleSave()
          }
        >
          <Save size={17} />

          {saving
            ? "Αποθήκευση..."
            : "Αποθήκευση"}
        </button>

      </div>


      {errorMessage && (
        <div className="form-error">
          {errorMessage}
        </div>
      )}


      {successMessage && (
        <div className="vehicle-success">
          <CheckCircle2
            size={18}
          />

          {successMessage}
        </div>
      )}


      <div className="vehicle-profile-header">

        <div className="vehicle-profile-icon">
          <Car size={29} />
        </div>


        <div>
          <span>
            Επιλεγμένο όχημα
          </span>

          <h2>
            {form.name}
          </h2>

          <p>
            {[
              form.make,
              form.model,
              form.variant,
              form.manufacture_year,
            ]
              .filter(Boolean)
              .join(" • ") ||
              "Δεν έχουν συμπληρωθεί ακόμη στοιχεία."}
          </p>
        </div>

      </div>


      <div className="vehicle-sections">

        <section className="vehicle-section">

          <div className="vehicle-section-heading">

            <h3>
              Βασικά στοιχεία
            </h3>

            <p>
              Ονομασία και
              περιγραφή του
              οχήματος.
            </p>

          </div>


          <div className="vehicle-form-grid">

            <label className="vehicle-field vehicle-field-wide">
              Όνομα οχήματος

              <input
                type="text"
                value={form.name}
                onChange={(
                  event
                ) =>
                  updateField(
                    "name",
                    event.target
                      .value
                  )
                }
              />
            </label>


            <label className="vehicle-field">
              Μάρκα

              <input
                type="text"
                value={form.make}
                placeholder="π.χ. Ford"
                onChange={(
                  event
                ) =>
                  updateField(
                    "make",
                    event.target
                      .value
                  )
                }
              />
            </label>


            <label className="vehicle-field">
              Μοντέλο

              <input
                type="text"
                value={form.model}
                placeholder="π.χ. Fiesta"
                onChange={(
                  event
                ) =>
                  updateField(
                    "model",
                    event.target
                      .value
                  )
                }
              />
            </label>


            <label className="vehicle-field">
              Έκδοση

              <input
                type="text"
                value={
                  form.variant
                }
                placeholder="Έκδοση / trim"
                onChange={(
                  event
                ) =>
                  updateField(
                    "variant",
                    event.target
                      .value
                  )
                }
              />
            </label>


            <label className="vehicle-field">
              Έτος κατασκευής

              <input
                type="number"
                min="1886"
                step="1"
                value={
                  form.manufacture_year
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "manufacture_year",
                    event.target
                      .value
                  )
                }
              />
            </label>


            <label className="vehicle-field">
              1η κυκλοφορία

              <input
                type="date"
                value={
                  form.first_registration_date
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "first_registration_date",
                    event.target
                      .value
                  )
                }
              />
            </label>


            <label className="vehicle-field">
              Χρώμα

              <input
                type="text"
                value={
                  form.color
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "color",
                    event.target
                      .value
                  )
                }
              />
            </label>

          </div>

        </section>


        <section className="vehicle-section">

          <div className="vehicle-section-heading">

            <h3>
              Ταυτοποίηση
            </h3>

            <p>
              Πινακίδα και
              αριθμός πλαισίου.
            </p>

          </div>


          <div className="vehicle-form-grid">

            <label className="vehicle-field">
              Πινακίδα

              <input
                type="text"
                value={
                  form.license_plate
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "license_plate",
                    event.target
                      .value.toUpperCase()
                  )
                }
              />
            </label>


            <label className="vehicle-field vehicle-field-wide">
              VIN / Αριθμός πλαισίου

              <input
                type="text"
                value={form.vin}
                onChange={(
                  event
                ) =>
                  updateField(
                    "vin",
                    event.target
                      .value.toUpperCase()
                  )
                }
              />
            </label>

          </div>

        </section>


        <section className="vehicle-section">

          <div className="vehicle-section-heading">

            <h3>
              Τεχνικά χαρακτηριστικά
            </h3>

            <p>
              Κινητήρας,
              καύσιμο και βασικά
              τεχνικά στοιχεία.
            </p>

          </div>


          <div className="vehicle-form-grid">

            <label className="vehicle-field">
              Καύσιμο

              <select
                value={
                  form.fuel_type
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "fuel_type",
                    event.target
                      .value
                  )
                }
              >
                <option value="">
                  —
                </option>

                <option value="petrol">
                  Βενζίνη
                </option>

                <option value="diesel">
                  Diesel
                </option>

                <option value="lpg">
                  LPG
                </option>

                <option value="cng">
                  CNG
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

                <option value="other">
                  Άλλο
                </option>
              </select>
            </label>


            <label className="vehicle-field">
              Κυβισμός (cc)

              <input
                type="number"
                min="0"
                step="1"
                value={
                  form.engine_cc
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "engine_cc",
                    event.target
                      .value
                  )
                }
              />
            </label>


            <label className="vehicle-field">
              Ισχύς (hp)

              <input
                type="number"
                min="0"
                step="0.1"
                value={
                  form.power_hp
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "power_hp",
                    event.target
                      .value
                  )
                }
              />
            </label>


            <label className="vehicle-field">
              Ρεζερβουάρ (L)

              <input
                type="number"
                min="0"
                step="0.1"
                value={
                  form.tank_capacity_liters
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "tank_capacity_liters",
                    event.target
                      .value
                  )
                }
              />
            </label>

          </div>

        </section>


        <section className="vehicle-section">

          <div className="vehicle-section-heading">

            <h3>
              Αγορά
            </h3>

            <p>
              Στοιχεία απόκτησης
              του οχήματος.
            </p>

          </div>


          <div className="vehicle-form-grid">

            <label className="vehicle-field">
              Ημερομηνία αγοράς

              <input
                type="date"
                value={
                  form.purchase_date
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "purchase_date",
                    event.target
                      .value
                  )
                }
              />
            </label>


            <label className="vehicle-field">
              Χιλιόμετρα αγοράς

              <input
                type="number"
                min="0"
                step="1"
                value={
                  form.purchase_odometer_km
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "purchase_odometer_km",
                    event.target
                      .value
                  )
                }
              />
            </label>


            <label className="vehicle-field">
              Τιμή αγοράς (€)

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.purchase_price
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "purchase_price",
                    event.target
                      .value
                  )
                }
              />
            </label>

          </div>

        </section>


        <section className="vehicle-section">

          <div className="vehicle-section-heading">

            <h3>
              Κατάσταση οχήματος
            </h3>

            <p>
              Ενεργό,
              ανενεργό ή
              πωλημένο όχημα.
            </p>

          </div>


          <div className="vehicle-form-grid">

            <label className="vehicle-field">
              Κατάσταση

              <select
                value={
                  form.status
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "status",
                    event.target
                      .value
                  )
                }
              >
                <option value="active">
                  Ενεργό
                </option>

                <option value="inactive">
                  Ανενεργό
                </option>

                <option value="sold">
                  Πωλημένο
                </option>
              </select>
            </label>


            {form.status ===
              "sold" && (
              <>
                <label className="vehicle-field">
                  Ημερομηνία πώλησης

                  <input
                    type="date"
                    value={
                      form.sold_date
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "sold_date",
                        event.target
                          .value
                      )
                    }
                  />
                </label>


                <label className="vehicle-field">
                  Χιλιόμετρα πώλησης

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      form.sold_odometer_km
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "sold_odometer_km",
                        event.target
                          .value
                      )
                    }
                  />
                </label>


                <label className="vehicle-field">
                  Τιμή πώλησης (€)

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.sold_price
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "sold_price",
                        event.target
                          .value
                      )
                    }
                  />
                </label>
              </>
            )}

          </div>

        </section>


        <section className="vehicle-section">

          <div className="vehicle-section-heading">

            <h3>
              Σημειώσεις
            </h3>

            <p>
              Πρόσθετες
              πληροφορίες για το
              όχημα.
            </p>

          </div>


          <label className="vehicle-field">
            Σημειώσεις

            <textarea
              rows={5}
              value={
                form.notes
              }
              placeholder="Προαιρετικές σημειώσεις..."
              onChange={(
                event
              ) =>
                updateField(
                  "notes",
                  event.target
                    .value
                )
              }
            />
          </label>

        </section>

      </div>


      <div className="vehicle-bottom-actions">

        <button
          type="button"
          className="primary-button"
          disabled={saving}
          onClick={() =>
            void handleSave()
          }
        >
          <Save size={17} />

          {saving
            ? "Αποθήκευση..."
            : "Αποθήκευση αλλαγών"}
        </button>

      </div>

    </div>
  );
}