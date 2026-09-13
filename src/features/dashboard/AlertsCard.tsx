import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  FileWarning,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useVehicle } from "../vehicles/VehicleContext";

type AlertItem = {
  id: string;
  type: "reminder" | "document";
  title: string;
  subtitle: string;
  severity: "warning" | "danger";
};

type ReminderRow = {
  id: string;
  title: string;
  due_date: string | null;
  due_odometer_km: number | null;
  status: string;
  resolved_at: string | null;
};

type DocumentRow = {
  id: string;
  title: string;
  expiry_date: string | null;
  is_archived: boolean;
};

function daysUntil(value: string) {
  const now = new Date();
  const target = new Date(value);

  const diff =
    target.getTime() - now.getTime();

  return Math.ceil(
    diff / (1000 * 60 * 60 * 24)
  );
}

export default function AlertsCard() {
  const { selectedVehicle } = useVehicle();

  const [reminders, setReminders] =
    useState<ReminderRow[]>([]);

  const [documents, setDocuments] =
    useState<DocumentRow[]>([]);

  const [currentOdometer, setCurrentOdometer] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadAlerts() {
      if (!selectedVehicle) {
        setReminders([]);
        setDocuments([]);
        setCurrentOdometer(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const [
        remindersResult,
        documentsResult,
        odometerResult,
      ] = await Promise.all([
        supabase
          .from("reminders")
          .select(
            `
            id,
            title,
            due_date,
            due_odometer_km,
            status,
            resolved_at
          `
          )
          .eq(
            "vehicle_id",
            selectedVehicle.id
          ),

        supabase
          .from("documents")
          .select(
            `
            id,
            title,
            expiry_date,
            is_archived
          `
          )
          .eq(
            "vehicle_id",
            selectedVehicle.id
          ),

        supabase
          .from("current_vehicle_odometer")
          .select("odometer_km")
          .eq(
            "vehicle_id",
            selectedVehicle.id
          )
          .maybeSingle(),
      ]);

      const firstError =
        remindersResult.error ??
        documentsResult.error ??
        odometerResult.error;

      if (firstError) {
        console.error(
          "Alerts loading error:",
          firstError
        );

        setErrorMessage(
          firstError.message
        );

        setLoading(false);
        return;
      }

      setReminders(
        (remindersResult.data ?? []).map(
          (row) => ({
            id: row.id,
            title: row.title,
            due_date: row.due_date,
            due_odometer_km:
              row.due_odometer_km !== null
                ? Number(
                    row.due_odometer_km
                  )
                : null,
            status: row.status,
            resolved_at:
              row.resolved_at,
          })
        )
      );

      setDocuments(
        (documentsResult.data ?? []).map(
          (row) => ({
            id: row.id,
            title: row.title,
            expiry_date:
              row.expiry_date,
            is_archived:
              row.is_archived,
          })
        )
      );

      setCurrentOdometer(
        odometerResult.data?.odometer_km !==
          undefined &&
          odometerResult.data
            ?.odometer_km !== null
          ? Number(
              odometerResult.data
                .odometer_km
            )
          : null
      );

      setLoading(false);
    }

    void loadAlerts();
  }, [selectedVehicle?.id]);

  const alerts = useMemo(() => {
    const result: AlertItem[] = [];

    for (const reminder of reminders) {
      const resolved =
        reminder.resolved_at !== null ||
        reminder.status === "completed" ||
        reminder.status === "resolved";

      if (resolved) {
        continue;
      }

      let isDue = false;
      let isSoon = false;

      if (reminder.due_date) {
        const remainingDays =
          daysUntil(
            reminder.due_date
          );

        if (remainingDays <= 0) {
          isDue = true;
        } else if (
          remainingDays <= 30
        ) {
          isSoon = true;
        }
      }

      if (
        reminder.due_odometer_km !==
          null &&
        currentOdometer !== null
      ) {
        const remainingKm =
          reminder.due_odometer_km -
          currentOdometer;

        if (remainingKm <= 0) {
          isDue = true;
        } else if (
          remainingKm <= 1000
        ) {
          isSoon = true;
        }
      }

      if (isDue) {
        result.push({
          id: `reminder-${reminder.id}`,
          type: "reminder",
          title: reminder.title,
          subtitle:
            "Η υπενθύμιση έχει φτάσει ή ξεπεράσει το όριό της.",
          severity: "danger",
        });
      } else if (isSoon) {
        result.push({
          id: `reminder-${reminder.id}`,
          type: "reminder",
          title: reminder.title,
          subtitle:
            "Η υπενθύμιση πλησιάζει.",
          severity: "warning",
        });
      }
    }

    for (const document of documents) {
      if (
        document.is_archived ||
        !document.expiry_date
      ) {
        continue;
      }

      const remainingDays =
        daysUntil(
          document.expiry_date
        );

      if (remainingDays < 0) {
        result.push({
          id: `document-${document.id}`,
          type: "document",
          title: document.title,
          subtitle:
            "Το έγγραφο έχει λήξει.",
          severity: "danger",
        });
      } else if (
        remainingDays <= 30
      ) {
        result.push({
          id: `document-${document.id}`,
          type: "document",
          title: document.title,
          subtitle: `Το έγγραφο λήγει σε ${remainingDays} ημέρες.`,
          severity: "warning",
        });
      }
    }

    result.sort((a, b) => {
      if (
        a.severity === b.severity
      ) {
        return 0;
      }

      return a.severity === "danger"
        ? -1
        : 1;
    });

    return result;
  }, [
    reminders,
    documents,
    currentOdometer,
  ]);

  return (
    <section className="dashboard-card alerts-card">
      <div className="dashboard-card-header">
        <div>
          <span className="dashboard-card-label">
            Προειδοποιήσεις
          </span>

          <h2>
            Χρειάζεται προσοχή
          </h2>
        </div>

        <AlertTriangle size={20} />
      </div>

      {loading ? (
        <div className="dashboard-card-state">
          Φόρτωση...
        </div>
      ) : errorMessage ? (
        <div className="dashboard-card-state error">
          {errorMessage}
        </div>
      ) : alerts.length === 0 ? (
        <div className="dashboard-card-state">
          Δεν υπάρχουν ενεργές
          προειδοποιήσεις.
        </div>
      ) : (
        <div className="alerts-list">
          {alerts
            .slice(0, 5)
            .map((alert) => (
              <div
                key={alert.id}
                className={`alerts-item alerts-item-${alert.severity}`}
              >
                <div className="alerts-item-icon">
                  {alert.type ===
                  "reminder" ? (
                    <BellRing
                      size={17}
                    />
                  ) : (
                    <FileWarning
                      size={17}
                    />
                  )}
                </div>

                <div className="alerts-item-main">
                  <strong>
                    {alert.title}
                  </strong>

                  <span>
                    {alert.subtitle}
                  </span>
                </div>
              </div>
            ))}

          {alerts.length > 5 && (
            <div className="alerts-more">
              +{alerts.length - 5} ακόμη
              προειδοποιήσεις
            </div>
          )}
        </div>
      )}
    </section>
  );
}