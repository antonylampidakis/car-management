import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ChangeEvent,
  FormEvent,
} from "react";

import {
  Archive,
  CalendarDays,
  ExternalLink,
  FileText,
  Search,
  Upload,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useVehicle } from "../features/vehicles/VehicleContext";

const STORAGE_BUCKET = "vehicle-documents";

type DocumentCategory =
  | "service_invoice"
  | "parts_receipt"
  | "insurance"
  | "kteo"
  | "emissions_card"
  | "road_tax"
  | "fuel_receipt"
  | "repair"
  | "photo"
  | "technical_document"
  | "registration"
  | "other";

type VehicleDocument = {
  id: string;
  vehicle_id: string;

  title: string;
  category: DocumentCategory;

  file_path: string;
  original_filename: string;

  mime_type: string | null;
  file_size: number | null;

  document_date: string | null;
  expiry_date: string | null;

  notes: string | null;

  is_archived: boolean;

  created_at: string;
  updated_at: string;
};

type ExpiryState =
  | "none"
  | "valid"
  | "soon"
  | "expired";

const categories: {
  value: DocumentCategory;
  label: string;
}[] = [
  {
    value: "registration",
    label: "Άδεια κυκλοφορίας",
  },
  {
    value: "insurance",
    label: "Ασφάλεια",
  },
  {
    value: "kteo",
    label: "ΚΤΕΟ",
  },
  {
    value: "emissions_card",
    label: "Κάρτα καυσαερίων",
  },
  {
    value: "road_tax",
    label: "Τέλη κυκλοφορίας",
  },
  {
    value: "service_invoice",
    label: "Τιμολόγιο Service",
  },
  {
    value: "parts_receipt",
    label: "Απόδειξη ανταλλακτικών",
  },
  {
    value: "fuel_receipt",
    label: "Απόδειξη καυσίμων",
  },
  {
    value: "repair",
    label: "Επισκευή",
  },
  {
    value: "technical_document",
    label: "Τεχνικό έγγραφο",
  },
  {
    value: "photo",
    label: "Φωτογραφία",
  },
  {
    value: "other",
    label: "Άλλο",
  },
];

function categoryLabel(
  category: DocumentCategory
) {
  return (
    categories.find(
      (item) =>
        item.value === category
    )?.label ?? category
  );
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "el-GR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(
    new Date(
      `${value}T00:00:00`
    )
  );
}

function formatFileSize(
  bytes: number | null
) {
  if (
    bytes === null ||
    bytes < 0
  ) {
    return "—";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;

  return `${mb.toFixed(1)} MB`;
}

function getExpiryState(
  expiryDate: string | null
): ExpiryState {
  if (!expiryDate) {
    return "none";
  }

  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const expiry = new Date(
    `${expiryDate}T00:00:00`
  );

  const differenceMs =
    expiry.getTime() -
    today.getTime();

  const days =
    Math.ceil(
      differenceMs /
        (1000 *
          60 *
          60 *
          24)
    );

  if (days < 0) {
    return "expired";
  }

  if (days <= 30) {
    return "soon";
  }

  return "valid";
}

function expiryLabel(
  state: ExpiryState
) {
  switch (state) {
    case "expired":
      return "Έχει λήξει";

    case "soon":
      return "Λήγει σύντομα";

    case "valid":
      return "Σε ισχύ";

    default:
      return "";
  }
}

function sanitizeFilename(
  filename: string
) {
  const lastDot =
    filename.lastIndexOf(".");

  const extension =
    lastDot >= 0
      ? filename
          .slice(lastDot)
          .toLowerCase()
      : "";

  const base =
    lastDot >= 0
      ? filename.slice(
          0,
          lastDot
        )
      : filename;

  const cleanBase =
    base
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .replace(
        /^-|-$/g,
        ""
      )
      .slice(0, 80) ||
    "document";

  return `${cleanBase}${extension}`;
}

export default function DocumentsPage() {
  const { selectedVehicle } =
    useVehicle();

  const [
    documents,
    setDocuments,
  ] = useState<
    VehicleDocument[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("all");

  const [
    showArchived,
    setShowArchived,
  ] = useState(false);

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    category,
    setCategory,
  ] =
    useState<DocumentCategory>(
      "other"
    );

  const [
    documentDate,
    setDocumentDate,
  ] = useState("");

  const [
    expiryDate,
    setExpiryDate,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(
    null
  );

  async function loadDocuments() {
    if (!selectedVehicle) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const {
      data,
      error,
    } = await supabase
      .from("documents")
      .select("*")
      .eq(
        "vehicle_id",
        selectedVehicle.id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      setErrorMessage(
        error.message
      );

      setLoading(false);
      return;
    }

    setDocuments(
      (data ??
        []) as VehicleDocument[]
    );

    setLoading(false);
  }

  useEffect(() => {
    void loadDocuments();
  }, [selectedVehicle?.id]);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0] ??
      null;

    setSelectedFile(file);

    if (
      file &&
      !title.trim()
    ) {
      const nameWithoutExtension =
        file.name.replace(
          /\.[^/.]+$/,
          ""
        );

      setTitle(
        nameWithoutExtension
      );
    }

    setErrorMessage("");
    setSuccessMessage("");
  }

  function resetUploadForm() {
    setTitle("");
    setCategory("other");
    setDocumentDate("");
    setExpiryDate("");
    setNotes("");
    setSelectedFile(null);

    const input =
      document.getElementById(
        "document-file-input"
      ) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }
  }

  async function handleUpload(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !selectedVehicle
    ) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (!title.trim()) {
      setErrorMessage(
        "Συμπλήρωσε τίτλο εγγράφου."
      );

      return;
    }

    if (!selectedFile) {
      setErrorMessage(
        "Επίλεξε αρχείο."
      );

      return;
    }

    const maxSize =
      20 * 1024 * 1024;

    if (
      selectedFile.size >
      maxSize
    ) {
      setErrorMessage(
        "Το αρχείο δεν μπορεί να είναι μεγαλύτερο από 20 MB."
      );

      return;
    }

    setUploading(true);

    let uploadedPath:
      | string
      | null = null;

    try {
      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const user =
        authData.user;

      if (!user) {
        throw new Error(
          "Δεν υπάρχει ενεργός χρήστης."
        );
      }

      const safeFilename =
        sanitizeFilename(
          selectedFile.name
        );

      const uniqueId =
        crypto.randomUUID();

      uploadedPath =
        `${user.id}/` +
        `${selectedVehicle.id}/` +
        `${uniqueId}-${safeFilename}`;

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from(
            STORAGE_BUCKET
          )
          .upload(
            uploadedPath,
            selectedFile,
            {
              cacheControl:
                "3600",

              upsert: false,

              contentType:
                selectedFile.type ||
                undefined,
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      const {
        error: insertError,
      } = await supabase
        .from("documents")
        .insert({
          vehicle_id:
            selectedVehicle.id,

          title:
            title.trim(),

          category,

          file_path:
            uploadedPath,

          original_filename:
            selectedFile.name,

          mime_type:
            selectedFile.type ||
            null,

          file_size:
            selectedFile.size,

          document_date:
            documentDate ||
            null,

          expiry_date:
            expiryDate ||
            null,

          notes:
            notes.trim() ||
            null,

          is_archived:
            false,
        });

      if (insertError) {
        /*
         * Αν αποτύχει η DB
         * καταχώρηση, αφαιρούμε
         * το αρχείο ώστε να μην
         * μείνει orphan file.
         */
        await supabase.storage
          .from(
            STORAGE_BUCKET
          )
          .remove([
            uploadedPath,
          ]);

        uploadedPath = null;

        throw insertError;
      }

      resetUploadForm();

      setSuccessMessage(
        "Το έγγραφο αποθηκεύτηκε επιτυχώς."
      );

      await loadDocuments();
    } catch (error) {
      console.error(
        "Document upload error:",
        error
      );

      if (
        error instanceof Error
      ) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          "Παρουσιάστηκε σφάλμα κατά την αποθήκευση του εγγράφου."
        );
      }
    } finally {
      setUploading(false);
    }
  }

  async function openDocument(
    documentRow: VehicleDocument
  ) {
    setErrorMessage("");

    const {
      data,
      error,
    } =
      await supabase.storage
        .from(
          STORAGE_BUCKET
        )
        .createSignedUrl(
          documentRow.file_path,
          60
        );

    if (error) {
      setErrorMessage(
        error.message
      );

      return;
    }

    window.open(
      data.signedUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function toggleArchive(
    documentRow: VehicleDocument
  ) {
    setErrorMessage("");

    const newValue =
      !documentRow.is_archived;

    const {
      error,
    } = await supabase
      .from("documents")
      .update({
        is_archived:
          newValue,
      })
      .eq(
        "id",
        documentRow.id
      );

    if (error) {
      setErrorMessage(
        error.message
      );

      return;
    }

    await loadDocuments();
  }

  const summary =
    useMemo(() => {
      let active = 0;
      let expiringSoon = 0;
      let expired = 0;

      for (
        const documentRow of
          documents
      ) {
        if (
          documentRow.is_archived
        ) {
          continue;
        }

        active += 1;

        const state =
          getExpiryState(
            documentRow.expiry_date
          );

        if (state === "soon") {
          expiringSoon += 1;
        }

        if (
          state ===
          "expired"
        ) {
          expired += 1;
        }
      }

      return {
        total:
          documents.length,

        active,

        expiringSoon,

        expired,
      };
    }, [documents]);

  const filteredDocuments =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLocaleLowerCase(
            "el-GR"
          );

      return documents.filter(
        (documentRow) => {
          if (
            !showArchived &&
            documentRow.is_archived
          ) {
            return false;
          }

          if (
            categoryFilter !==
              "all" &&
            documentRow.category !==
              categoryFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const haystack = [
            documentRow.title,
            documentRow.original_filename,
            categoryLabel(
              documentRow.category
            ),
            documentRow.notes,
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
      documents,
      search,
      categoryFilter,
      showArchived,
    ]);

  if (!selectedVehicle) {
    return (
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1>
              Έγγραφα
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
            Έγγραφα
          </h1>

          <p>
            Άδειες,
            ασφάλειες,
            ΚΤΕΟ,
            παραστατικά και
            αρχεία του
            οχήματος.
          </p>
        </div>
      </div>


      {errorMessage && (
        <div className="form-error">
          {errorMessage}
        </div>
      )}


      {successMessage && (
        <div className="vehicle-success">
          {successMessage}
        </div>
      )}


      <div className="documents-summary-grid">

        <div className="documents-summary-card">
          <span>
            Σύνολο εγγράφων
          </span>

          <strong>
            {summary.total}
          </strong>
        </div>


        <div className="documents-summary-card">
          <span>
            Ενεργά
          </span>

          <strong>
            {summary.active}
          </strong>
        </div>


        <div className="documents-summary-card">
          <span>
            Λήγουν σύντομα
          </span>

          <strong>
            {summary.expiringSoon}
          </strong>
        </div>


        <div className="documents-summary-card">
          <span>
            Ληγμένα
          </span>

          <strong>
            {summary.expired}
          </strong>
        </div>

      </div>


      <div className="documents-layout">

        <section className="documents-main">

          <div className="documents-toolbar">

            <div className="documents-search">
              <Search size={18} />

              <input
                type="search"
                value={search}
                placeholder="Αναζήτηση εγγράφων..."
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
              value={
                categoryFilter
              }
              onChange={(
                event
              ) =>
                setCategoryFilter(
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
                (item) => (
                  <option
                    key={
                      item.value
                    }
                    value={
                      item.value
                    }
                  >
                    {
                      item.label
                    }
                  </option>
                )
              )}
            </select>


            <label className="documents-archive-toggle">
              <input
                type="checkbox"
                checked={
                  showArchived
                }
                onChange={(
                  event
                ) =>
                  setShowArchived(
                    event.target
                      .checked
                  )
                }
              />

              Αρχειοθετημένα
            </label>

          </div>


          {loading ? (
            <div className="documents-empty">
              Φόρτωση
              εγγράφων...
            </div>
          ) : filteredDocuments.length ===
            0 ? (
            <div className="documents-empty">
              Δεν υπάρχουν
              έγγραφα.
            </div>
          ) : (
            <div className="documents-list">

              {filteredDocuments.map(
                (
                  documentRow
                ) => {
                  const expiryState =
                    getExpiryState(
                      documentRow.expiry_date
                    );

                  return (
                    <article
                      key={
                        documentRow.id
                      }
                      className={`document-card ${
                        documentRow.is_archived
                          ? "document-card-archived"
                          : ""
                      }`}
                    >

                      <div className="document-card-icon">
                        <FileText
                          size={21}
                        />
                      </div>


                      <div className="document-card-body">

                        <div className="document-card-header">

                          <div>
                            <span className="document-category">
                              {categoryLabel(
                                documentRow.category
                              )}
                            </span>

                            <h3>
                              {
                                documentRow.title
                              }
                            </h3>
                          </div>


                          {expiryState !==
                            "none" && (
                            <span
                              className={`document-expiry-badge document-expiry-${expiryState}`}
                            >
                              {expiryLabel(
                                expiryState
                              )}
                            </span>
                          )}

                        </div>


                        <div className="document-meta-grid">

                          <div>
                            <span>
                              Αρχείο
                            </span>

                            <strong>
                              {
                                documentRow.original_filename
                              }
                            </strong>
                          </div>


                          <div>
                            <span>
                              Μέγεθος
                            </span>

                            <strong>
                              {formatFileSize(
                                documentRow.file_size
                              )}
                            </strong>
                          </div>


                          <div>
                            <span>
                              Ημερομηνία
                            </span>

                            <strong>
                              {formatDate(
                                documentRow.document_date
                              )}
                            </strong>
                          </div>


                          <div>
                            <span>
                              Λήξη
                            </span>

                            <strong>
                              {formatDate(
                                documentRow.expiry_date
                              )}
                            </strong>
                          </div>

                        </div>


                        {documentRow.notes && (
                          <p className="document-notes">
                            {
                              documentRow.notes
                            }
                          </p>
                        )}


                        <div className="document-actions">

                          <button
                            type="button"
                            onClick={() =>
                              void openDocument(
                                documentRow
                              )
                            }
                          >
                            <ExternalLink
                              size={
                                15
                              }
                            />

                            Άνοιγμα
                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              void toggleArchive(
                                documentRow
                              )
                            }
                          >
                            <Archive
                              size={
                                15
                              }
                            />

                            {documentRow.is_archived
                              ? "Επαναφορά"
                              : "Αρχειοθέτηση"}
                          </button>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

        </section>


        <aside className="document-upload-card">

          <div className="document-upload-heading">

            <div>
              <Upload size={20} />
            </div>

            <div>
              <h3>
                Νέο έγγραφο
              </h3>

              <p>
                Μεταφόρτωση
                αρχείου στο
                όχημα.
              </p>
            </div>

          </div>


          <form
            onSubmit={
              handleUpload
            }
            className="document-upload-form"
          >

            <label>
              Τίτλος

              <input
                type="text"
                value={title}
                placeholder="π.χ. Ασφάλεια 2026"
                onChange={(
                  event
                ) =>
                  setTitle(
                    event.target
                      .value
                  )
                }
              />
            </label>


            <label>
              Κατηγορία

              <select
                value={
                  category
                }
                onChange={(
                  event
                ) =>
                  setCategory(
                    event.target
                      .value as DocumentCategory
                  )
                }
              >
                {categories.map(
                  (item) => (
                    <option
                      key={
                        item.value
                      }
                      value={
                        item.value
                      }
                    >
                      {
                        item.label
                      }
                    </option>
                  )
                )}
              </select>
            </label>


            <label>
              <span className="document-field-label">
                <CalendarDays
                  size={14}
                />
                Ημερομηνία
                εγγράφου
              </span>

              <input
                type="date"
                value={
                  documentDate
                }
                onChange={(
                  event
                ) =>
                  setDocumentDate(
                    event.target
                      .value
                  )
                }
              />
            </label>


            <label>
              Ημερομηνία λήξης

              <input
                type="date"
                value={
                  expiryDate
                }
                onChange={(
                  event
                ) =>
                  setExpiryDate(
                    event.target
                      .value
                  )
                }
              />
            </label>


            <label>
              Αρχείο

              <input
                id="document-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={
                  handleFileChange
                }
              />
            </label>


            {selectedFile && (
              <div className="selected-document-file">
                <strong>
                  {
                    selectedFile.name
                  }
                </strong>

                <span>
                  {formatFileSize(
                    selectedFile.size
                  )}
                </span>
              </div>
            )}


            <label>
              Σημειώσεις

              <textarea
                rows={4}
                value={notes}
                placeholder="Προαιρετικές σημειώσεις..."
                onChange={(
                  event
                ) =>
                  setNotes(
                    event.target
                      .value
                  )
                }
              />
            </label>


            <button
              type="submit"
              className="primary-button document-upload-button"
              disabled={
                uploading
              }
            >
              <Upload
                size={16}
              />

              {uploading
                ? "Μεταφόρτωση..."
                : "Αποθήκευση εγγράφου"}
            </button>

          </form>

        </aside>

      </div>

    </div>
  );
}