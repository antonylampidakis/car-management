import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Banknote,
  CalendarDays,
  Search,
  Tag,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useVehicle } from "../features/vehicles/VehicleContext";

type Expense = {
  id: string;
  vehicle_id: string;

  category_id: string | null;

  amount: number;

  expense_date: string;

  description: string | null;
  notes: string | null;

  created_at: string;
};

type ExpenseCategory = {
  id: string;
  name: string;
};

type ExpenseRow = Expense & {
  category_name: string;
};

type CategorySummary = {
  categoryId: string;
  categoryName: string;

  count: number;
  total: number;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "el-GR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(new Date(value));
}

export default function ExpensesPage() {
  const { selectedVehicle } =
    useVehicle();

  const [
    expenses,
    setExpenses,
  ] = useState<ExpenseRow[]>([]);

  const [
    categories,
    setCategories,
  ] = useState<ExpenseCategory[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [search, setSearch] =
    useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("all");

  async function loadExpenses() {
    if (!selectedVehicle) {
      setExpenses([]);
      setCategories([]);
      setLoading(false);

      return;
    }

    setLoading(true);
    setErrorMessage("");

    const [
      expenseResult,
      categoryResult,
    ] = await Promise.all([
      supabase
        .from("expenses")
        .select("*")
        .eq(
          "vehicle_id",
          selectedVehicle.id
        )
        .order(
          "expense_date",
          {
            ascending: false,
          }
        ),

      supabase
        .from("expense_categories")
        .select("id, name")
        .order("name"),
    ]);

    if (expenseResult.error) {
      setErrorMessage(
        expenseResult.error.message
      );

      setLoading(false);
      return;
    }

    if (categoryResult.error) {
      setErrorMessage(
        categoryResult.error.message
      );

      setLoading(false);
      return;
    }

    const categoryRows =
      (categoryResult.data ??
        []) as ExpenseCategory[];

    setCategories(categoryRows);

    const categoryMap =
      new Map<string, string>();

    for (
      const category of categoryRows
    ) {
      categoryMap.set(
        category.id,
        category.name
      );
    }

    const expenseRows =
      (
        expenseResult.data ??
        []
      ).map(
        (expense) => {
          const row =
            expense as Expense;

          return {
            ...row,

            category_name:
              row.category_id
                ? categoryMap.get(
                    row.category_id
                  ) ??
                  "Χωρίς κατηγορία"
                : "Χωρίς κατηγορία",
          };
        }
      );

    setExpenses(expenseRows);

    setLoading(false);
  }

  useEffect(() => {
    void loadExpenses();
  }, [selectedVehicle?.id]);

  const summary =
    useMemo(() => {
      const total =
        expenses.reduce(
          (sum, expense) =>
            sum +
            Number(
              expense.amount ?? 0
            ),
          0
        );

      const average =
        expenses.length > 0
          ? total /
            expenses.length
          : 0;

      const currentYear =
        new Date().getFullYear();

      const thisYear =
        expenses.reduce(
          (sum, expense) => {
            const year =
              new Date(
                expense.expense_date
              ).getFullYear();

            if (
              year === currentYear
            ) {
              return (
                sum +
                Number(
                  expense.amount ??
                    0
                )
              );
            }

            return sum;
          },
          0
        );

      return {
        count:
          expenses.length,

        total,

        average,

        thisYear,
      };
    }, [expenses]);

  const categorySummary =
    useMemo(() => {
      const map =
        new Map<
          string,
          CategorySummary
        >();

      for (
        const expense of expenses
      ) {
        const categoryId =
          expense.category_id ??
          "uncategorized";

        const current =
          map.get(
            categoryId
          ) ?? {
            categoryId,

            categoryName:
              expense.category_name,

            count: 0,
            total: 0,
          };

        current.count += 1;

        current.total +=
          Number(
            expense.amount ?? 0
          );

        map.set(
          categoryId,
          current
        );
      }

      return [
        ...map.values(),
      ].sort(
        (a, b) =>
          b.total - a.total
      );
    }, [expenses]);

  const filteredExpenses =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLocaleLowerCase(
            "el-GR"
          );

      return expenses.filter(
        (expense) => {
          if (
            selectedCategory !==
              "all" &&
            expense.category_id !==
              selectedCategory
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const haystack = [
            expense.category_name,
            expense.description,
            expense.notes,
            String(
              expense.amount
            ),
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
      expenses,
      search,
      selectedCategory,
    ]);

  if (!selectedVehicle) {
    return (
      <div className="page-content">

        <div className="page-header">
          <div>
            <h1>
              Έξοδα
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
            Έξοδα
          </h1>

          <p>
            Παρακολούθηση
            κόστους,
            κατηγοριών και
            οικονομικού
            ιστορικού.
          </p>
        </div>

      </div>


      <div className="expenses-summary-grid">

        <div className="expenses-summary-card">

          <span>
            Καταχωρήσεις
          </span>

          <strong>
            {summary.count}
          </strong>

        </div>


        <div className="expenses-summary-card">

          <span>
            Συνολικά έξοδα
          </span>

          <strong>
            {formatMoney(
              summary.total
            )}
          </strong>

        </div>


        <div className="expenses-summary-card">

          <span>
            Μέσο έξοδο
          </span>

          <strong>
            {formatMoney(
              summary.average
            )}
          </strong>

        </div>


        <div className="expenses-summary-card">

          <span>
            Φέτος
          </span>

          <strong>
            {formatMoney(
              summary.thisYear
            )}
          </strong>

        </div>

      </div>


      <div className="expenses-layout">

        <section className="expenses-main">

          <div className="expenses-toolbar">

            <div className="expenses-search">

              <Search
                size={18}
              />

              <input
                type="search"
                value={search}
                placeholder="Αναζήτηση εξόδων..."
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
              />

            </div>


            <select
              className="expenses-category-filter"
              value={
                selectedCategory
              }
              onChange={(
                event
              ) =>
                setSelectedCategory(
                  event.target
                    .value
                )
              }
            >

              <option value="all">
                Όλες οι
                κατηγορίες
              </option>


              {categories.map(
                (category) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {
                      category.name
                    }
                  </option>
                )
              )}

            </select>

          </div>


          {errorMessage && (
            <div className="form-error">
              {errorMessage}
            </div>
          )}


          {loading ? (
            <div className="expenses-empty">
              Φόρτωση εξόδων...
            </div>
          ) : filteredExpenses.length ===
            0 ? (
            <div className="expenses-empty">
              Δεν υπάρχουν
              καταχωρήσεις
              εξόδων.
            </div>
          ) : (
            <div className="expenses-list">

              {filteredExpenses.map(
                (
                  expense
                ) => (
                  <article
                    key={
                      expense.id
                    }
                    className="expense-card"
                  >

                    <div className="expense-card-icon">
                      <Banknote
                        size={19}
                      />
                    </div>


                    <div className="expense-card-body">

                      <div className="expense-card-header">

                        <div>

                          <div className="expense-category-line">

                            <Tag
                              size={
                                13
                              }
                            />

                            <span>
                              {
                                expense.category_name
                              }
                            </span>

                          </div>


                          <h3>
                            {expense.description ||
                              expense.category_name}
                          </h3>

                        </div>


                        <strong className="expense-card-amount">

                          {formatMoney(
                            Number(
                              expense.amount
                            )
                          )}

                        </strong>

                      </div>


                      <div className="expense-card-meta">

                        <span>

                          <CalendarDays
                            size={
                              14
                            }
                          />

                          {formatDate(
                            expense.expense_date
                          )}

                        </span>

                      </div>


                      {expense.notes && (
                        <p className="expense-card-notes">
                          {
                            expense.notes
                          }
                        </p>
                      )}

                    </div>

                  </article>
                )
              )}

            </div>
          )}

        </section>


        <aside className="expenses-breakdown">

          <div className="expenses-breakdown-card">

            <h3>
              Ανάλυση ανά
              κατηγορία
            </h3>


            {categorySummary.length ===
            0 ? (
              <p className="expenses-breakdown-empty">
                Δεν υπάρχουν
                δεδομένα.
              </p>
            ) : (
              <div className="expenses-category-list">

                {categorySummary.map(
                  (
                    category
                  ) => {
                    const percentage =
                      summary.total >
                      0
                        ? (category.total /
                            summary.total) *
                          100
                        : 0;

                    return (
                      <div
                        key={
                          category.categoryId
                        }
                        className="expenses-category-row"
                      >

                        <div className="expenses-category-row-top">

                          <div>

                            <strong>
                              {
                                category.categoryName
                              }
                            </strong>

                            <span>
                              {
                                category.count
                              }{" "}
                              {category.count ===
                              1
                                ? "καταχώρηση"
                                : "καταχωρήσεις"}
                            </span>

                          </div>


                          <strong>
                            {formatMoney(
                              category.total
                            )}
                          </strong>

                        </div>


                        <div className="expenses-category-progress">

                          <div
                            className="expenses-category-progress-bar"
                            style={{
                              width: `${Math.min(
                                100,
                                percentage
                              )}%`,
                            }}
                          />

                        </div>


                        <span className="expenses-category-percentage">

                          {percentage.toFixed(
                            1
                          )}
                          %

                        </span>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>

        </aside>

      </div>

    </div>
  );
}