import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import { supabase } from "../../lib/supabase";

export type AppLanguage =
  | "el"
  | "en";

export type AppTheme =
  | "system"
  | "light"
  | "dark";

export type DistanceUnit =
  | "km"
  | "mi";

export type FuelConsumptionUnit =
  | "l_per_100km"
  | "km_per_l"
  | "mpg";

export type PressureUnit =
  | "bar"
  | "psi"
  | "kpa";

export type HistoryView =
  | "timeline"
  | "table";

export type AppSettings = {
  language: AppLanguage;
  theme: AppTheme;
  currency: string;
  distance_unit: DistanceUnit;
  fuel_consumption_unit:
    FuelConsumptionUnit;
  pressure_unit:
    PressureUnit;
  default_history_view:
    HistoryView;

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

type SettingsContextValue = {
  settings: AppSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
};

const defaultSettings: AppSettings = {
  language: "el",
  theme: "system",
  currency: "EUR",
  distance_unit: "km",
  fuel_consumption_unit:
    "l_per_100km",
  pressure_unit: "bar",
  default_history_view:
    "timeline",

  dashboard_preferences: {},
  notification_preferences: {},
  data_quality_preferences: {},
};

const SettingsContext =
  createContext<
    SettingsContextValue | undefined
  >(undefined);

export function SettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    settings,
    setSettings,
  ] = useState<AppSettings>(
    defaultSettings
  );

  const [loading, setLoading] =
    useState(true);

  async function refreshSettings() {
    setLoading(true);

    const {
      data: authData,
    } =
      await supabase.auth.getUser();

    const user =
      authData.user;

    if (!user) {
      setSettings(
        defaultSettings
      );

      setLoading(false);
      return;
    }

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

    if (
      error ||
      !data
    ) {
      setSettings(
        defaultSettings
      );

      setLoading(false);
      return;
    }

    setSettings({
      language:
        data.language ??
        "el",

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
        data.dashboard_preferences ??
        {},

      notification_preferences:
        data.notification_preferences ??
        {},

      data_quality_preferences:
        data.data_quality_preferences ??
        {},
    });

    setLoading(false);
  }

  useEffect(() => {
    void refreshSettings();
  }, []);

  useEffect(() => {
    const root =
      document.documentElement;

    function applyTheme(
      resolved:
        | "light"
        | "dark"
    ) {
      root.dataset.theme =
        resolved;
    }

    if (
      settings.theme ===
      "system"
    ) {
      const media =
        window.matchMedia(
          "(prefers-color-scheme: dark)"
        );

      applyTheme(
        media.matches
          ? "dark"
          : "light"
      );

      const listener = (
        event: MediaQueryListEvent
      ) => {
        applyTheme(
          event.matches
            ? "dark"
            : "light"
        );
      };

      media.addEventListener(
        "change",
        listener
      );

      return () => {
        media.removeEventListener(
          "change",
          listener
        );
      };
    }

    applyTheme(
      settings.theme
    );
  }, [settings.theme]);

  const value =
    useMemo(
      () => ({
        settings,
        loading,
        refreshSettings,
      }),
      [
        settings,
        loading,
      ]
    );

  return (
    <SettingsContext.Provider
      value={value}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context =
    useContext(
      SettingsContext
    );

  if (!context) {
    throw new Error(
      "useSettings must be used inside SettingsProvider"
    );
  }

  return context;
}