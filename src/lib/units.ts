import type {
  DistanceUnit,
  FuelConsumptionUnit,
  PressureUnit,
} from "../features/settings/SettingsContext";

export function kmToDistance(
  km: number,
  unit: DistanceUnit
) {
  if (unit === "mi") {
    return km * 0.621371;
  }

  return km;
}

export function distanceLabel(
  unit: DistanceUnit
) {
  return unit === "mi"
    ? "mi"
    : "km";
}

export function lPer100KmToUnit(
  value: number,
  unit: FuelConsumptionUnit
) {
  if (value <= 0) {
    return null;
  }

  if (
    unit ===
    "l_per_100km"
  ) {
    return value;
  }

  if (
    unit ===
    "km_per_l"
  ) {
    return 100 / value;
  }

  // US MPG
  return (
    235.214583 /
    value
  );
}

export function consumptionLabel(
  unit: FuelConsumptionUnit
) {
  switch (unit) {
    case "km_per_l":
      return "km/L";

    case "mpg":
      return "MPG";

    default:
      return "L/100 km";
  }
}

export function barToPressure(
  bar: number,
  unit: PressureUnit
) {
  if (unit === "psi") {
    return bar * 14.5038;
  }

  if (unit === "kpa") {
    return bar * 100;
  }

  return bar;
}