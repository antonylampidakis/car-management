import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Gauge,
  Search,
  Wrench,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useVehicle } from "../features/vehicles/VehicleContext";

type ServiceRecord = {
  id: string;
  vehicle_id: string;
  odometer_entry_id: string | null;

  service_date: string;

  service_type: string;
  maintenance_kind: string | null;
  status: string | null;

  labor_cost: number | null;
  parts_cost: number | null;
  other_cost: number | null;
  total_cost: number | null;

  description: string | null;
  notes: string | null;

  created_at?: string;
};

type ServiceItem = {
  id: string;
  service_record_id: string;

  maintenance_item_id: string | null;

  name: string;
  item_type: string | null;

  labor_cost: number | null;
  parts_cost: number | null;

  notes: string | null;
};

type MaintenanceItem = {
  id: string;
  name: string;
};

type OdometerEntry = {
  id: string;
  odometer_km: number;
};

type ServiceRow = ServiceRecord & {
  odometer_km: number | null;
  items: ServiceItem[];
};

function formatMoney(value: number) {
  return new Intl.NumberFormat(
    "el-GR",
    {
      style: "currency",
      currency: "EUR",
    }
  ).format(value);
}

function formatKm(value: number) {
  return new Intl.NumberFormat(
    "el-GR"
  ).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "el-GR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

function serviceTypeLabel(
  value: string | null
) {
  switch (value) {
    case "minor":
      return "Μικρό service";

    case "major":
      return "Μεγάλο service";

    case "scheduled_maintenance":
      return "Προγραμματισμένη συντήρηση";

    case "repair":
      return "Επισκευή";

    case "inspection":
      return "Έλεγχος";

    case "other":
      return "Άλλο";

    default:
      return value ?? "—";
  }
}

function maintenanceKindLabel(
  value: string | null
) {
  switch (value) {
    case "scheduled":
      return "Προγραμματισμένη";

    case "unscheduled":
      return "Έκτακτη";

    default:
      return value ?? "—";
  }
}

function serviceItemTypeLabel(
  value: string | null
) {
  switch (value) {
    case "replacement":
      return "Αντικατάσταση";

    case "repair":
      return "Επισκευή";

    case "inspection":
      return "Έλεγχος";

    case "service":
      return "Service";

    default:
      return value ?? "Εργασία";
  }
}

export default function ServicePage() {
  const { selectedVehicle } =
    useVehicle();

  const [rows, setRows] =
    useState<ServiceRow[]>([]);

  const [
    maintenanceItems,
    setMaintenanceItems,
  ] = useState<
    Map<string, MaintenanceItem>
  >(new Map());

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [search, setSearch] =
    useState("");

  async function loadServiceData() {
    if (!selectedVehicle) {
      setRows([]);
      setMaintenanceItems(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const [
      serviceResult,
      serviceItemsResult,
      odometerResult,
      maintenanceResult,
    ] = await Promise.all([
      supabase
        .from("service_records")
        .select("*")
        .eq(
          "vehicle_id",
          selectedVehicle.id
        )
        .order(
          "service_date",
          {
            ascending: false,
          }
        ),

      supabase
        .from("service_items")
        .select("*"),

      supabase
        .from("odometer_entries")
        .select(
          "id, odometer_km"
        )
        .eq(
          "vehicle_id",
          selectedVehicle.id
        ),

      supabase
        .from("maintenance_items")
        .select(
          "id, name"
        )
        .eq(
          "vehicle_id",
          selectedVehicle.id
        ),
    ]);

    const errors = [
      serviceResult.error,
      serviceItemsResult.error,
      odometerResult.error,
      maintenanceResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error(
        "Service page loading errors:",
        errors
      );

      setErrorMessage(
        errors
          .map(
            (error) =>
              error?.message
          )
          .filter(Boolean)
          .join(" | ")
      );

      setLoading(false);
      return;
    }

    const odometerMap =
      new Map<string, number>();

    for (
      const row of
        (odometerResult.data ??
          []) as OdometerEntry[]
    ) {
      odometerMap.set(
        row.id,
        row.odometer_km
      );
    }

    const maintenanceMap =
      new Map<
        string,
        MaintenanceItem
      >();

    for (
      const item of
        (maintenanceResult.data ??
          []) as MaintenanceItem[]
    ) {
      maintenanceMap.set(
        item.id,
        item
      );
    }

    setMaintenanceItems(
      maintenanceMap
    );

    const itemsByService =
      new Map<
        string,
        ServiceItem[]
      >();

    for (
      const item of
        (serviceItemsResult.data ??
          []) as ServiceItem[]
    ) {
      const existing =
        itemsByService.get(
          item.service_record_id
        ) ?? [];

      existing.push(item);

      itemsByService.set(
        item.service_record_id,
        existing
      );
    }

    const serviceRows =
      (
        (serviceResult.data ??
          []) as ServiceRecord[]
      ).map((record) => ({
        ...record,

        odometer_km:
          record.odometer_entry_id
            ? odometerMap.get(
                record.odometer_entry_id
              ) ?? null
            : null,

        items:
          itemsByService.get(
            record.id
          ) ?? [],
      }));

    setRows(serviceRows);

    setLoading(false);
  }

  useEffect(() => {
    void loadServiceData();
  }, [selectedVehicle?.id]);

  const summary =
    useMemo(() => {
      let labor = 0;
      let parts = 0;
      let other = 0;
      let total = 0;

      for (const row of rows) {
        const rowLabor =
          Number(
            row.labor_cost ?? 0
          );

        const rowParts =
          Number(
            row.parts_cost ?? 0
          );

        const rowOther =
          Number(
            row.other_cost ?? 0
          );

        labor += rowLabor;
        parts += rowParts;
        other += rowOther;

        if (
          row.total_cost !==
          null
        ) {
          total += Number(
            row.total_cost
          );
        } else {
          total +=
            rowLabor +
            rowParts +
            rowOther;
        }
      }

      return {
        count:
          rows.length,

        labor,
        parts,
        other,
        total,
      };
    }, [rows]);

  const filteredRows =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLocaleLowerCase(
            "el-GR"
          );

      if (!query) {
        return rows;
      }

      return rows.filter(
        (row) => {
          const itemText =
            row.items
              .map(
                (item) => {
                  const maintenanceName =
                    item.maintenance_item_id
                      ? maintenanceItems.get(
                          item.maintenance_item_id
                        )?.name ??
                        ""
                      : "";

                  return [
                    item.name,
                    item.notes,
                    serviceItemTypeLabel(
                      item.item_type
                    ),
                    maintenanceName,
                  ]
                    .filter(Boolean)
                    .join(" ");
                }
              )
              .join(" ");

          const haystack = [
            row.description,
            row.notes,
            serviceTypeLabel(
              row.service_type
            ),
            maintenanceKindLabel(
              row.maintenance_kind
            ),
            row.odometer_km !==
            null
              ? String(
                  row.odometer_km
                )
              : "",
            itemText,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase(
              "el-GR"
            );

          return haystack.includes(
            query
          );
        }
      );
    }, [
      rows,
      search,
      maintenanceItems,
    ]);

  if (!selectedVehicle) {
    return (
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1>
              Service & Επισκευές
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

  return (
    <div className="page-content">

      <div className="page-header">
        <div>
          <h1>
            Service & Επισκευές
          </h1>

          <p>
            Πλήρες ιστορικό
            συντήρησης,
            επισκευών,
            εργασιών και
            ανταλλακτικών.
          </p>
        </div>
      </div>


      <div className="service-summary-grid">

        <div className="service-summary-card">
          <span>
            Εργασίες service
          </span>

          <strong>
            {summary.count}
          </strong>
        </div>


        <div className="service-summary-card">
          <span>
            Συνολικό κόστος
          </span>

          <strong>
            {formatMoney(
              summary.total
            )}
          </strong>
        </div>


        <div className="service-summary-card">
          <span>
            Εργασία
          </span>

          <strong>
            {formatMoney(
              summary.labor
            )}
          </strong>
        </div>


        <div className="service-summary-card">
          <span>
            Ανταλλακτικά
          </span>

          <strong>
            {formatMoney(
              summary.parts
            )}
          </strong>
        </div>


        <div className="service-summary-card">
          <span>
            Λοιπά
          </span>

          <strong>
            {formatMoney(
              summary.other
            )}
          </strong>
        </div>

      </div>


      <div className="service-toolbar">

        <div className="service-search">
          <Search size={18} />

          <input
            type="search"
            value={search}
            placeholder="Αναζήτηση service..."
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />
        </div>

      </div>


      {errorMessage && (
        <div className="form-error">
          {errorMessage}
        </div>
      )}


      {loading ? (
        <div className="service-empty">
          Φόρτωση service...
        </div>
      ) : filteredRows.length ===
        0 ? (
        <div className="service-empty">
          Δεν υπάρχουν
          καταχωρήσεις service.
        </div>
      ) : (
        <div className="service-records-list">

          {filteredRows.map(
            (row) => {
              const total =
                row.total_cost !==
                null
                  ? Number(
                      row.total_cost
                    )
                  : Number(
                      row.labor_cost ??
                        0
                    ) +
                    Number(
                      row.parts_cost ??
                        0
                    ) +
                    Number(
                      row.other_cost ??
                        0
                    );

              return (
                <article
                  key={row.id}
                  className="service-record-card"
                >

                  <div className="service-record-header">

                    <div className="service-record-title">

                      <div className="service-record-icon">
                        <Wrench
                          size={
                            19
                          }
                        />
                      </div>

                      <div>
                        <span className="service-record-type">
                          {serviceTypeLabel(
                            row.service_type
                          )}
                        </span>

                        <h3>
                          {row.description ||
                            "Service / Επισκευή"}
                        </h3>

                        <span className="service-record-date">
                          {formatDate(
                            row.service_date
                          )}
                        </span>
                      </div>

                    </div>


                    <div className="service-record-total">

                      <span>
                        Σύνολο
                      </span>

                      <strong>
                        {formatMoney(
                          total
                        )}
                      </strong>

                    </div>

                  </div>


                  <div className="service-record-meta">

                    {row.odometer_km !==
                      null && (
                      <div>
                        <span>
                          Χιλιόμετρα
                        </span>

                        <strong className="service-km">
                          <Gauge
                            size={
                              14
                            }
                          />

                          {formatKm(
                            row.odometer_km
                          )}{" "}
                          km
                        </strong>
                      </div>
                    )}


                    <div>
                      <span>
                        Τύπος συντήρησης
                      </span>

                      <strong>
                        {maintenanceKindLabel(
                          row.maintenance_kind
                        )}
                      </strong>
                    </div>


                    <div>
                      <span>
                        Εργασία
                      </span>

                      <strong>
                        {formatMoney(
                          Number(
                            row.labor_cost ??
                              0
                          )
                        )}
                      </strong>
                    </div>


                    <div>
                      <span>
                        Ανταλλακτικά
                      </span>

                      <strong>
                        {formatMoney(
                          Number(
                            row.parts_cost ??
                              0
                          )
                        )}
                      </strong>
                    </div>


                    <div>
                      <span>
                        Λοιπά
                      </span>

                      <strong>
                        {formatMoney(
                          Number(
                            row.other_cost ??
                              0
                          )
                        )}
                      </strong>
                    </div>

                  </div>


                  {row.items.length >
                    0 && (
                    <div className="service-items-section">

                      <h4>
                        Εργασίες /
                        Ανταλλακτικά
                      </h4>


                      <div className="service-items-display-list">

                        {row.items.map(
                          (item) => {
                            const itemTotal =
                              Number(
                                item.labor_cost ??
                                  0
                              ) +
                              Number(
                                item.parts_cost ??
                                  0
                              );

                            const maintenanceName =
                              item.maintenance_item_id
                                ? maintenanceItems.get(
                                    item.maintenance_item_id
                                  )
                                    ?.name ??
                                  null
                                : null;

                            return (
                              <div
                                key={
                                  item.id
                                }
                                className="service-display-item"
                              >

                                <div>

                                  <div className="service-display-item-top">

                                    <strong>
                                      {
                                        item.name
                                      }
                                    </strong>


                                    <span className="service-item-type-badge">
                                      {serviceItemTypeLabel(
                                        item.item_type
                                      )}
                                    </span>

                                  </div>


                                  {maintenanceName && (
                                    <span className="service-maintenance-link">
                                      Vehicle
                                      Health:{" "}
                                      {
                                        maintenanceName
                                      }
                                    </span>
                                  )}


                                  {item.notes && (
                                    <p>
                                      {
                                        item.notes
                                      }
                                    </p>
                                  )}

                                </div>


                                <div className="service-display-item-cost">

                                  <strong>
                                    {formatMoney(
                                      itemTotal
                                    )}
                                  </strong>

                                  <span>
                                    Εργασία{" "}
                                    {formatMoney(
                                      Number(
                                        item.labor_cost ??
                                          0
                                      )
                                    )}
                                    {" • "}
                                    Ανταλλακτικά{" "}
                                    {formatMoney(
                                      Number(
                                        item.parts_cost ??
                                          0
                                      )
                                    )}
                                  </span>

                                </div>

                              </div>
                            );
                          }
                        )}

                      </div>

                    </div>
                  )}


                  {row.notes && (
                    <div className="service-record-notes">
                      <strong>
                        Σημειώσεις
                      </strong>

                      <p>
                        {row.notes}
                      </p>
                    </div>
                  )}

                </article>
              );
            }
          )}

        </div>
      )}

    </div>
  );
}