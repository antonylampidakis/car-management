import {
  useEffect,
  useState,
} from "react";

import {
  Bell,
  Database,
  Gauge,
  Languages,
  LayoutDashboard,
  Palette,
  Save,
  Settings2,
  WalletCards,
} from "lucide-react";
import { useSettings } from "../features/settings/SettingsContext";
import { supabase } from "../lib/supabase";

type SettingsRow = {
  user_id: string;
  language: "el" | "en";
  theme: "system" | "light" | "dark";
  currency: string;
  distance_unit: "km" | "mi";
  fuel_consumption_unit:
    | "l_per_100km"
    | "km_per_l"
    | "mpg";
  pressure_unit:
    | "bar"
    | "psi"
    | "kpa";
  default_history_view:
    | "timeline"
    | "table";
  dashboard_preferences: Record<
    string,
    unknown
  >;
  notification_preferences: Record<
    string,
    unknown
  >;
  data_quality_preferences: Record<
    string,
    unknown
  >;
};

type SettingsForm = Omit<
  SettingsRow,
  "user_id"
>;

function defaultSettings(): SettingsForm {
  return {
    language: "el",
    theme: "system",
    currency: "EUR",
    distance_unit: "km",
    fuel_consumption_unit:
      "l_per_100km",
    pressure_unit: "bar",
    default_history_view:
      "timeline",

    dashboard_preferences: {
      show_vehicle_health: true,
      show_reminders: true,
      show_year_cost: true,
      show_recent_activity: true,
    },

    notification_preferences: {
      reminder_notifications: true,
      expiry_notifications: true,
      maintenance_notifications: true,
    },

    data_quality_preferences: {
      warn_missing_odometer: true,
      warn_duplicate_entries: true,
      warn_inconsistent_dates: true,
    },
  };
}

function getBooleanPreference(
  object: Record<
    string,
    unknown
  >,
  key: string,
  fallback: boolean
) {
  const value = object[key];

  return typeof value ===
    "boolean"
    ? value
    : fallback;
}

export default function SettingsPage() {
  const [
    form,
    setForm,
  ] = useState<SettingsForm>(
    defaultSettings()
  );

  const {
    refreshSettings,
  } = useSettings();

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

  const [
    userId,
    setUserId,
  ] = useState<string | null>(
    null
  );

  async function loadSettings() {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.getUser();

    if (authError) {
      setErrorMessage(
        authError.message
      );

      setLoading(false);
      return;
    }

    const user =
      authData.user;

    if (!user) {
      setErrorMessage(
        "Δεν υπάρχει ενεργός χρήστης."
      );

      setLoading(false);
      return;
    }

    setUserId(user.id);

    const {
      data,
      error,
    } = await supabase
      .from("user_settings")
      .select("*")
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    if (error) {
      setErrorMessage(
        error.message
      );

      setLoading(false);
      return;
    }

    if (!data) {
      setForm(
        defaultSettings()
      );

      setLoading(false);
      return;
    }

    setForm({
      language:
        data.language ?? "el",

      theme:
        data.theme ??
        "system",

      currency:
        data.currency ??
        "EUR",

      distance_unit:
        data.distance_unit ??
        "km",

      fuel_consumption_unit:
        data.fuel_consumption_unit ??
        "l_per_100km",

      pressure_unit:
        data.pressure_unit ??
        "bar",

      default_history_view:
        data.default_history_view ??
        "timeline",

      dashboard_preferences:
        data.dashboard_preferences &&
        typeof data.dashboard_preferences ===
          "object"
          ? data.dashboard_preferences
          : {},

      notification_preferences:
        data.notification_preferences &&
        typeof data.notification_preferences ===
          "object"
          ? data.notification_preferences
          : {},

      data_quality_preferences:
        data.data_quality_preferences &&
        typeof data.data_quality_preferences ===
          "object"
          ? data.data_quality_preferences
          : {},
    });

    setLoading(false);
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  function updateSimpleField<
    K extends keyof SettingsForm
  >(
    key: K,
    value: SettingsForm[K]
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      })
    );

    setSuccessMessage("");
  }

  function updateJsonBoolean(
    group:
      | "dashboard_preferences"
      | "notification_preferences"
      | "data_quality_preferences",
    key: string,
    value: boolean
  ) {
    setForm(
      (current) => ({
        ...current,

        [group]: {
          ...current[group],
          [key]: value,
        },
      })
    );

    setSuccessMessage("");
  }

  async function handleSave() {
    if (!userId) {
      setErrorMessage(
        "Δεν υπάρχει ενεργός χρήστης."
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const {
      error,
    } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id:
            userId,

          language:
            form.language,

          theme:
            form.theme,

          currency:
            form.currency.trim() ||
            "EUR",

          distance_unit:
            form.distance_unit,

          fuel_consumption_unit:
            form.fuel_consumption_unit,

          pressure_unit:
            form.pressure_unit,

          default_history_view:
            form.default_history_view,

          dashboard_preferences:
            form.dashboard_preferences,

          notification_preferences:
            form.notification_preferences,

          data_quality_preferences:
            form.data_quality_preferences,
        },
        {
          onConflict:
            "user_id",
        }
      );

    if (error) {
  setErrorMessage(
    error.message
  );

  setSaving(false);
  return;
}

await refreshSettings();

setSuccessMessage(
  "Οι ρυθμίσεις αποθηκεύτηκαν."
);

setSaving(false);
}

if (loading) {
    return (
      <div className="page-content">

        <div className="settings-empty">
          Φόρτωση ρυθμίσεων...
        </div>

      </div>
    );
  }

  return (
    <div className="page-content">

      <div className="page-header">

        <div>
          <h1>
            Ρυθμίσεις
          </h1>

          <p>
            Προσαρμογή της
            εφαρμογής και των
            προτιμήσεων χρήστη.
          </p>
        </div>


        <button
          type="button"
          className="primary-button settings-save-button"
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
          {successMessage}
        </div>
      )}


      <div className="settings-sections">

        <section className="settings-section">

          <div className="settings-section-heading">

            <div className="settings-section-icon">
              <Languages
                size={19}
              />
            </div>

            <div>
              <h3>
                Γλώσσα
              </h3>

              <p>
                Προεπιλεγμένη
                γλώσσα της
                εφαρμογής.
              </p>
            </div>

          </div>


          <div className="settings-control">

            <select
              value={
                form.language
              }
              onChange={(
                event
              ) =>
                updateSimpleField(
                  "language",
                  event.target
                    .value as
                    | "el"
                    | "en"
                )
              }
            >
              <option value="el">
                Ελληνικά
              </option>

              <option value="en">
                English
              </option>
            </select>

          </div>

        </section>


        <section className="settings-section">

          <div className="settings-section-heading">

            <div className="settings-section-icon">
              <Palette
                size={19}
              />
            </div>

            <div>
              <h3>
                Εμφάνιση
              </h3>

              <p>
                Προτίμηση θέματος
                της εφαρμογής.
              </p>
            </div>

          </div>


          <div className="settings-control">

            <select
              value={
                form.theme
              }
              onChange={(
                event
              ) =>
                updateSimpleField(
                  "theme",
                  event.target
                    .value as
                    | "system"
                    | "light"
                    | "dark"
                )
              }
            >
              <option value="system">
                Σύστημα
              </option>

              <option value="light">
                Φωτεινό
              </option>

              <option value="dark">
                Σκούρο
              </option>
            </select>

          </div>

        </section>


        <section className="settings-section">

          <div className="settings-section-heading">

            <div className="settings-section-icon">
              <WalletCards
                size={19}
              />
            </div>

            <div>
              <h3>
                Νόμισμα
              </h3>

              <p>
                Νόμισμα που
                χρησιμοποιείται
                στις οικονομικές
                τιμές.
              </p>
            </div>

          </div>


          <div className="settings-control">

            <input
              type="text"
              maxLength={3}
              value={
                form.currency
              }
              onChange={(
                event
              ) =>
                updateSimpleField(
                  "currency",
                  event.target
                    .value.toUpperCase()
                )
              }
            />

            <small>
              π.χ. EUR
            </small>

          </div>

        </section>


        <section className="settings-section">

          <div className="settings-section-heading">

            <div className="settings-section-icon">
              <Gauge
                size={19}
              />
            </div>

            <div>
              <h3>
                Μονάδες μέτρησης
              </h3>

              <p>
                Απόσταση,
                κατανάλωση
                καυσίμου και
                πίεση.
              </p>
            </div>

          </div>


          <div className="settings-control-grid">

            <label>
              Απόσταση

              <select
                value={
                  form.distance_unit
                }
                onChange={(
                  event
                ) =>
                  updateSimpleField(
                    "distance_unit",
                    event.target
                      .value as
                      | "km"
                      | "mi"
                  )
                }
              >
                <option value="km">
                  Χιλιόμετρα (km)
                </option>

                <option value="mi">
                  Μίλια (mi)
                </option>
              </select>
            </label>


            <label>
              Κατανάλωση

              <select
                value={
                  form.fuel_consumption_unit
                }
                onChange={(
                  event
                ) =>
                  updateSimpleField(
                    "fuel_consumption_unit",
                    event.target
                      .value as
                      | "l_per_100km"
                      | "km_per_l"
                      | "mpg"
                  )
                }
              >
                <option value="l_per_100km">
                  L / 100 km
                </option>

                <option value="km_per_l">
                  km / L
                </option>

                <option value="mpg">
                  MPG
                </option>
              </select>
            </label>


            <label>
              Πίεση

              <select
                value={
                  form.pressure_unit
                }
                onChange={(
                  event
                ) =>
                  updateSimpleField(
                    "pressure_unit",
                    event.target
                      .value as
                      | "bar"
                      | "psi"
                      | "kpa"
                  )
                }
              >
                <option value="bar">
                  bar
                </option>

                <option value="psi">
                  PSI
                </option>

                <option value="kpa">
                  kPa
                </option>
              </select>
            </label>

          </div>

        </section>


        <section className="settings-section">

          <div className="settings-section-heading">

            <div className="settings-section-icon">
              <Settings2
                size={19}
              />
            </div>

            <div>
              <h3>
                Ιστορικό
              </h3>

              <p>
                Προεπιλεγμένη
                προβολή της
                σελίδας
                ιστορικού.
              </p>
            </div>

          </div>


          <div className="settings-control">

            <select
              value={
                form.default_history_view
              }
              onChange={(
                event
              ) =>
                updateSimpleField(
                  "default_history_view",
                  event.target
                    .value as
                    | "timeline"
                    | "table"
                )
              }
            >
              <option value="timeline">
                Timeline
              </option>

              <option value="table">
                Πίνακας
              </option>
            </select>

          </div>

        </section>


        <section className="settings-section settings-section-stacked">

          <div className="settings-section-heading">

            <div className="settings-section-icon">
              <LayoutDashboard
                size={19}
              />
            </div>

            <div>
              <h3>
                Dashboard
              </h3>

              <p>
                Επιλογές για τα
                στοιχεία που
                εμφανίζονται στο
                dashboard.
              </p>
            </div>

          </div>


          <div className="settings-toggle-list">

            <label className="settings-toggle-row">

              <div>
                <strong>
                  Κατάσταση
                  οχήματος
                </strong>

                <span>
                  Vehicle Health
                  card
                </span>
              </div>

              <input
                type="checkbox"
                checked={getBooleanPreference(
                  form.dashboard_preferences,
                  "show_vehicle_health",
                  true
                )}
                onChange={(
                  event
                ) =>
                  updateJsonBoolean(
                    "dashboard_preferences",
                    "show_vehicle_health",
                    event.target
                      .checked
                  )
                }
              />

            </label>


            <label className="settings-toggle-row">

              <div>
                <strong>
                  Υπενθυμίσεις
                </strong>

                <span>
                  Ενεργές και
                  επερχόμενες
                  υπενθυμίσεις
                </span>
              </div>

              <input
                type="checkbox"
                checked={getBooleanPreference(
                  form.dashboard_preferences,
                  "show_reminders",
                  true
                )}
                onChange={(
                  event
                ) =>
                  updateJsonBoolean(
                    "dashboard_preferences",
                    "show_reminders",
                    event.target
                      .checked
                  )
                }
              />

            </label>


            <label className="settings-toggle-row">

              <div>
                <strong>
                  Ετήσιο κόστος
                </strong>

                <span>
                  Οικονομικό
                  summary του
                  έτους
                </span>
              </div>

              <input
                type="checkbox"
                checked={getBooleanPreference(
                  form.dashboard_preferences,
                  "show_year_cost",
                  true
                )}
                onChange={(
                  event
                ) =>
                  updateJsonBoolean(
                    "dashboard_preferences",
                    "show_year_cost",
                    event.target
                      .checked
                  )
                }
              />

            </label>


            <label className="settings-toggle-row">

              <div>
                <strong>
                  Πρόσφατη
                  δραστηριότητα
                </strong>

                <span>
                  Τελευταίες
                  καταχωρήσεις
                </span>
              </div>

              <input
                type="checkbox"
                checked={getBooleanPreference(
                  form.dashboard_preferences,
                  "show_recent_activity",
                  true
                )}
                onChange={(
                  event
                ) =>
                  updateJsonBoolean(
                    "dashboard_preferences",
                    "show_recent_activity",
                    event.target
                      .checked
                  )
                }
              />

            </label>

          </div>

        </section>


        <section className="settings-section settings-section-stacked">

          <div className="settings-section-heading">

            <div className="settings-section-icon">
              <Bell
                size={19}
              />
            </div>

            <div>
              <h3>
                Ειδοποιήσεις
              </h3>

              <p>
                Τύποι
                ειδοποιήσεων που
                θέλεις να
                χρησιμοποιεί η
                εφαρμογή.
              </p>
            </div>

          </div>


          <div className="settings-toggle-list">

            <label className="settings-toggle-row">

              <div>
                <strong>
                  Υπενθυμίσεις
                </strong>

                <span>
                  Προγραμματισμένες
                  υπενθυμίσεις
                </span>
              </div>

              <input
                type="checkbox"
                checked={getBooleanPreference(
                  form.notification_preferences,
                  "reminder_notifications",
                  true
                )}
                onChange={(
                  event
                ) =>
                  updateJsonBoolean(
                    "notification_preferences",
                    "reminder_notifications",
                    event.target
                      .checked
                  )
                }
              />

            </label>


            <label className="settings-toggle-row">

              <div>
                <strong>
                  Λήξεις εγγράφων
                </strong>

                <span>
                  Ασφάλεια,
                  ΚΤΕΟ και λοιπά
                  έγγραφα
                </span>
              </div>

              <input
                type="checkbox"
                checked={getBooleanPreference(
                  form.notification_preferences,
                  "expiry_notifications",
                  true
                )}
                onChange={(
                  event
                ) =>
                  updateJsonBoolean(
                    "notification_preferences",
                    "expiry_notifications",
                    event.target
                      .checked
                  )
                }
              />

            </label>


            <label className="settings-toggle-row">

              <div>
                <strong>
                  Συντήρηση
                </strong>

                <span>
                  Επερχόμενο
                  service και
                  maintenance
                </span>
              </div>

              <input
                type="checkbox"
                checked={getBooleanPreference(
                  form.notification_preferences,
                  "maintenance_notifications",
                  true
                )}
                onChange={(
                  event
                ) =>
                  updateJsonBoolean(
                    "notification_preferences",
                    "maintenance_notifications",
                    event.target
                      .checked
                  )
                }
              />

            </label>

          </div>

        </section>


        <section className="settings-section settings-section-stacked">

          <div className="settings-section-heading">

            <div className="settings-section-icon">
              <Database
                size={19}
              />
            </div>

            <div>
              <h3>
                Έλεγχος δεδομένων
              </h3>

              <p>
                Προειδοποιήσεις
                για πιθανώς
                προβληματικές
                καταχωρήσεις.
              </p>
            </div>

          </div>


          <div className="settings-toggle-list">

            <label className="settings-toggle-row">

              <div>
                <strong>
                  Έλλειψη
                  χιλιομέτρων
                </strong>

                <span>
                  Προειδοποίηση
                  όταν λείπει
                  οδομετρική
                  ένδειξη
                </span>
              </div>

              <input
                type="checkbox"
                checked={getBooleanPreference(
                  form.data_quality_preferences,
                  "warn_missing_odometer",
                  true
                )}
                onChange={(
                  event
                ) =>
                  updateJsonBoolean(
                    "data_quality_preferences",
                    "warn_missing_odometer",
                    event.target
                      .checked
                  )
                }
              />

            </label>


            <label className="settings-toggle-row">

              <div>
                <strong>
                  Πιθανές
                  διπλοεγγραφές
                </strong>

                <span>
                  Έλεγχος για
                  παρόμοιες
                  καταχωρήσεις
                </span>
              </div>

              <input
                type="checkbox"
                checked={getBooleanPreference(
                  form.data_quality_preferences,
                  "warn_duplicate_entries",
                  true
                )}
                onChange={(
                  event
                ) =>
                  updateJsonBoolean(
                    "data_quality_preferences",
                    "warn_duplicate_entries",
                    event.target
                      .checked
                  )
                }
              />

            </label>


            <label className="settings-toggle-row">

              <div>
                <strong>
                  Ασυνεπείς
                  ημερομηνίες
                </strong>

                <span>
                  Προειδοποίηση
                  για περίεργη
                  χρονολογική
                  σειρά
                </span>
              </div>

              <input
                type="checkbox"
                checked={getBooleanPreference(
                  form.data_quality_preferences,
                  "warn_inconsistent_dates",
                  true
                )}
                onChange={(
                  event
                ) =>
                  updateJsonBoolean(
                    "data_quality_preferences",
                    "warn_inconsistent_dates",
                    event.target
                      .checked
                  )
                }
              />

            </label>

          </div>

        </section>

      </div>


      <div className="settings-bottom-actions">

        <button
          type="button"
          className="primary-button settings-save-button"
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