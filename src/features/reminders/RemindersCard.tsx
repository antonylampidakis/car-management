import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useVehicle } from "../vehicles/VehicleContext";

type Reminder = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  due_odometer_km: number | null;
};

export default function RemindersCard() {
  const { selectedVehicle } = useVehicle();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReminders() {
      if (!selectedVehicle) {
        setReminders([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("reminders")
        .select(`
          id,
          title,
          status,
          due_date,
          due_odometer_km
        `)
        .eq("vehicle_id", selectedVehicle.id)
        .in("status", [
          "upcoming",
          "due_soon",
          "due",
          "overdue",
        ])
        .order("due_date", {
          ascending: true,
          nullsFirst: false,
        })
        .limit(3);

      if (error) {
        console.error(error);
        setReminders([]);
      } else {
        setReminders((data ?? []) as Reminder[]);
      }

      setLoading(false);
    }

    void loadReminders();
  }, [selectedVehicle?.id]);

  return (
    <section className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-card-icon">
          <Bell size={21} />
        </div>

        <span>Υπενθυμίσεις</span>
      </div>

      {loading ? (
        <div className="dashboard-card-loading">Φόρτωση...</div>
      ) : reminders.length === 0 ? (
        <>
          <div className="dashboard-big-value">0</div>

          <div className="dashboard-card-subtext">
            Δεν υπάρχουν ενεργές υπενθυμίσεις.
          </div>
        </>
      ) : (
        <>
          <div className="dashboard-big-value">
            {reminders.length}
          </div>

          <div className="dashboard-card-subtext">
            επόμενες ενέργειες
          </div>

          <div className="reminders-mini-list">
            {reminders.map((reminder) => (
              <div key={reminder.id}>
                {reminder.title}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}