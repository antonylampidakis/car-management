import { useState } from "react";
import {
  Fuel,
  Gauge,
  WalletCards,
  Wrench,
  Bell,
  X,
} from "lucide-react";

import QuickFuelForm from "../features/fuel/QuickFuelForm";
import QuickExpenseForm from "../features/expenses/QuickExpenseForm";
import QuickServiceForm from "../features/service/QuickServiceForm";
import QuickOdometerForm from "../features/vehicles/QuickOdometerForm";
import QuickReminderForm from "../features/reminders/QuickReminderForm";

type QuickAddModalProps = {
  open: boolean;
  onClose: () => void;
};

type QuickAddType =
  | "fuel"
  | "service"
  | "expense"
  | "reminder"
  | "odometer"
  | null;

export default function QuickAddModal({
  open,
  onClose,
}: QuickAddModalProps) {
  const [type, setType] = useState<QuickAddType>(null);

  if (!open) {
    return null;
  }

  function closeAll() {
    setType(null);
    onClose();
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeAll();
        }
      }}
    >
      <div className="quick-add-modal">
        <div className="modal-header">
          <div>
            <h2>Νέα καταχώρηση</h2>
            <p>
              Επίλεξε τι θέλεις να καταχωρήσεις.
            </p>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={closeAll}
          >
            <X size={20} />
          </button>
        </div>

        {!type && (
          <div className="quick-add-options">
            <button
              type="button"
              className="quick-add-option"
              onClick={() => setType("fuel")}
            >
              <Fuel size={22} />
              <span>
                <strong>Ανεφοδιασμός</strong>
                <small>
                  Καύσιμο, ποσό, λίτρα και χιλιόμετρα
                </small>
              </span>
            </button>

            <button
              type="button"
              className="quick-add-option"
              onClick={() => setType("service")}
            >
              <Wrench size={22} />
              <span>
                <strong>Service / Επισκευή</strong>
                <small>
                  Εργασίες και κόστος
                </small>
              </span>
            </button>

            <button
              type="button"
              className="quick-add-option"
              onClick={() => setType("expense")}
            >
              <WalletCards size={22} />
              <span>
                <strong>Έξοδο</strong>
                <small>
                  Πλύσιμο, parking, διόδια κ.λπ.
                </small>
              </span>
            </button>

            <button
              type="button"
              className="quick-add-option"
              onClick={() => setType("reminder")}
            >
              <Bell size={22} />
              <span>
                <strong>Υπενθύμιση</strong>
                <small>
                  Ημερομηνία ή χιλιόμετρα
                </small>
              </span>
            </button>

            <button
              type="button"
              className="quick-add-option"
              onClick={() => setType("odometer")}
            >
              <Gauge size={22} />
              <span>
                <strong>Χιλιόμετρα</strong>
                <small>
                  Ενημέρωση τρέχουσας ένδειξης
                </small>
              </span>
            </button>
          </div>
        )}

        {type === "fuel" && (
          <QuickFuelForm
            onCancel={() => setType(null)}
            onSaved={closeAll}
          />
        )}

        {type === "expense" && (
          <QuickExpenseForm
            onCancel={() => setType(null)}
            onSaved={closeAll}
          />
        )}

        {type === "service" && (
            <QuickServiceForm
                onCancel={() => setType(null)}
                onSaved={closeAll}
            />
            )}

        {type === "reminder" && (
          <QuickReminderForm
            onCancel={() =>
              setType(null)
            }
            onSaved={closeAll}
          />
        )}

        {type === "odometer" && (
          <QuickOdometerForm
            onCancel={() =>
              setType(null)
            }
            onSaved={closeAll}
          />
        )}
      </div>
    </div>
  );
}