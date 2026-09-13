import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  History,
  Fuel,
  Wrench,
  HeartPulse,
  WalletCards,
  Bell,
  ChartNoAxesCombined,
  FileText,
  Car,
  Settings,
} from "lucide-react";

const navigation = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/history", label: "Ιστορικό", icon: History },
  { to: "/fuel", label: "Καύσιμα", icon: Fuel },
  { to: "/service", label: "Service & Επισκευές", icon: Wrench },
  { to: "/health", label: "Vehicle Health", icon: HeartPulse },
  { to: "/expenses", label: "Έξοδα", icon: WalletCards },
  { to: "/reminders", label: "Υπενθυμίσεις", icon: Bell },
  { to: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { to: "/documents", label: "Έγγραφα", icon: FileText },
  { to: "/vehicle", label: "Όχημα", icon: Car },
  { to: "/settings", label: "Ρυθμίσεις", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <Car size={22} />
        </div>

        <div>
          <div className="sidebar-title">Car Management</div>
          <div className="sidebar-subtitle">Vehicle control center</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}