import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ReactNode } from "react";

import { supabase } from "../../lib/supabase";

export type Vehicle = {
  id: string;
  user_id: string;
  name: string;

  make: string | null;
  model: string | null;
  variant: string | null;

  manufacture_year: number | null;
  first_registration_date: string | null;

  license_plate: string | null;
  vin: string | null;
  color: string | null;

  fuel_type:
    | "petrol"
    | "diesel"
    | "hybrid"
    | "plug_in_hybrid"
    | "electric"
    | "lpg"
    | "cng"
    | "other"
    | null;

  engine_cc: number | null;
  power_hp: number | null;
  tank_capacity_liters: number | null;

  purchase_date: string | null;
  purchase_odometer_km: number | null;
  purchase_price: number | null;

  status: "active" | "sold" | "archived";

  sold_date: string | null;
  sold_odometer_km: number | null;
  sold_price: number | null;

  notes: string | null;

  created_at: string;
  updated_at: string;
};

type VehicleContextValue = {
  vehicles: Vehicle[];

  selectedVehicle: Vehicle | null;

  loading: boolean;
  error: string | null;

  selectVehicle: (vehicleId: string) => void;

  refreshVehicles: () => Promise<void>;
};

const VehicleContext =
  createContext<VehicleContextValue | undefined>(undefined);

type VehicleProviderProps = {
  children: ReactNode;
};

export function VehicleProvider({
  children,
}: VehicleProviderProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshVehicles() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .in("status", ["active", "archived"])
      .order("created_at", { ascending: true });

    if (error) {
      setVehicles([]);
      setSelectedVehicleId(null);
      setError(error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Vehicle[];

    setVehicles(rows);

    setSelectedVehicleId((currentId) => {
      if (
        currentId &&
        rows.some((vehicle) => vehicle.id === currentId)
      ) {
        return currentId;
      }

      return rows[0]?.id ?? null;
    });

    setLoading(false);
  }

  useEffect(() => {
    void refreshVehicles();
  }, []);

  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId) {
      return null;
    }

    return (
      vehicles.find(
        (vehicle) => vehicle.id === selectedVehicleId
      ) ?? null
    );
  }, [vehicles, selectedVehicleId]);

  function selectVehicle(vehicleId: string) {
    const exists = vehicles.some(
      (vehicle) => vehicle.id === vehicleId
    );

    if (!exists) {
      return;
    }

    setSelectedVehicleId(vehicleId);
  }

  const value = useMemo<VehicleContextValue>(
    () => ({
      vehicles,
      selectedVehicle,
      loading,
      error,
      selectVehicle,
      refreshVehicles,
    }),
    [
      vehicles,
      selectedVehicle,
      loading,
      error,
    ]
  );

  return (
    <VehicleContext.Provider value={value}>
      {children}
    </VehicleContext.Provider>
  );
}

export function useVehicle() {
  const context = useContext(VehicleContext);

  if (!context) {
    throw new Error(
      "useVehicle must be used inside VehicleProvider"
    );
  }

  return context;
}