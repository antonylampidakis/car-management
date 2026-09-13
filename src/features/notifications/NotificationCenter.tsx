import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bell,
  BellRing,
  FileWarning,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useVehicle } from "../vehicles/VehicleContext";

type NotificationItem = {
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

export default function NotificationCenter() {
  const { selectedVehicle } = useVehicle();

  const [open, setOpen] =
    useState(false);

    const notificationRef =
  useRef<HTMLDivElement | null>(null);

  const [reminders, setReminders] =
    useState<ReminderRow[]>([]);

  const [documents, setDocuments] =
    useState<DocumentRow[]>([]);

  const [currentOdometer, setCurrentOdometer] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

useEffect(() => {
  function handleClickOutside(
    event: MouseEvent
  ) {
    if (
      !notificationRef.current ||
      notificationRef.current.contains(
        event.target as Node
      )
    ) {
      return;
    }

    setOpen(false);
  }

  document.addEventListener(
    "mousedown",
    handleClickOutside
  );

  return () => {
    document.removeEventListener(
      "mousedown",
      handleClickOutside
    );
  };
}, []);

  useEffect(() => {
    async function loadNotifications() {
      if (!selectedVehicle) {
        setReminders([]);
        setDocuments([]);
        setCurrentOdometer(null);
        setLoading(false);
        return;
      }

      setLoading(true);

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

      if (remindersResult.error) {
        console.error(
          "Notification reminders error:",
          remindersResult.error
        );
      }

      if (documentsResult.error) {
        console.error(
          "Notification documents error:",
          documentsResult.error
        );
      }

      if (odometerResult.error) {
        console.error(
          "Notification odometer error:",
          odometerResult.error
        );
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
        odometerResult.data?.odometer_km !==
          null
          ? Number(
              odometerResult.data
                .odometer_km
            )
          : null
      );

      setLoading(false);
    }

    void loadNotifications();
  }, [selectedVehicle?.id]);

  const notifications = useMemo(() => {
    const result: NotificationItem[] = [];

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
    <div
  ref={notificationRef}
  className="notification-center"
>
      <button
        type="button"
        className="icon-button notification-button"
        aria-label="Ειδοποιήσεις"
        onClick={() =>
          setOpen((value) => !value)
        }
      >
        {notifications.length > 0 ? (
          <BellRing size={19} />
        ) : (
          <Bell size={19} />
        )}

        {notifications.length > 0 && (
          <span className="notification-badge">
            {notifications.length > 9
              ? "9+"
              : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <div>
              <strong>
                Ειδοποιήσεις
              </strong>

              <span>
                {notifications.length} ενεργές
              </span>
            </div>
          </div>

          {loading ? (
            <div className="notification-empty">
              Φόρτωση...
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              Δεν υπάρχουν ενεργές ειδοποιήσεις.
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map(
                (notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item notification-item-${notification.severity}`}
                  >
                    <div className="notification-item-icon">
                      {notification.type ===
                      "document" ? (
                        <FileWarning
                          size={16}
                        />
                      ) : (
                        <BellRing
                          size={16}
                        />
                      )}
                    </div>

                    <div className="notification-item-main">
                      <strong>
                        {notification.title}
                      </strong>

                      <span>
                        {notification.subtitle}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}