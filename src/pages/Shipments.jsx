import { useEffect, useState } from "react";

import PortalTabs from "../components/shipments/PortalTabs.jsx";
import ShipmentFilters from "../components/shipments/ShipmentFilters.jsx";
import ShipmentTable from "../components/shipments/ShipmentTable.jsx";
import Pagination from "../components/shipments/Pagination.jsx";
import { getShipmentRecords } from "../services/shipmentService.js";
import { downloadExcel } from "../utils/exportExcel.js";
import { formatDateDisplay } from "../utils/shipments.js";
import { orderLocationColumns } from "../utils/shipmentDisplay.js";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function Shipments({
  view,
  data,
  active,
  portalRecords = [],
  portalCounts = [],
  totals = {},
  headers,
  portal,
  onPortalChange,
  onViewChange,
  onEdit,
  onAdd,
  canEdit = false,
  canAdd = false,
  companies,
  selectedCompany,
  selectedCompanyId,
  onCompanyChange,

  // Server-side controls
  loadRecords,
  pagination,
  recordsLoading,
}) {
  // FILTERS
  const [filters, setFilters] = useState({
    search: "",
    company: selectedCompany || "",
    status: "",
    mergeInvoiceStatus: "",
    fromDate: "",
    toDate: "",
  });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const pageSize = pagination?.limit || 20;
  const displayHeaders = orderLocationColumns(headers);

  const selectedPortalId = portal === "All portals"
    ? ""
    : portalRecords.find(item => item?.name === portal)?._id || "";
  const currentStatus = (view === "merge" ? filters.mergeInvoiceStatus : filters.status) || "";

  // COMPANY
  // -------------------------------------------------

  // FILTER CHANGE
  const changeFilter = (field, value) => {
    setFilters((previous) => ({
      ...previous,
      [field]: value,
      ...(field === "fromDate" && value && !previous.toDate ? { toDate: today() } : {}),
    }));
    if (field === "company") onCompanyChange?.(value);
    if (field === "status" || field === "mergeInvoiceStatus") {
      onPortalChange?.("All portals");
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    setExportError("");
    try {
      const query = {
        limit: 100,
        search: filters.search.trim(),
        fromDate: filters.fromDate || "",
        toDate: filters.toDate || "",
        companyId: selectedCompanyId,
        portalId: selectedPortalId,
        status: currentStatus,
        type: view,
      };
      const firstPage = await getShipmentRecords({ ...query, page: 1 });
      const records = [...(firstPage.data?.[view] || [])];
      const totalPages = firstPage.pagination?.totalPages || 1;
      for (let page = 2; page <= totalPages; page++) {
        const result = await getShipmentRecords({ ...query, page });
        records.push(...(result.data?.[view] || []));
      }

      const exportHeaders = view === "merge" ? [...displayHeaders, "Master Status"] : displayHeaders;
      const exportRows = records.map(record => ({
        ...record,
        ...Object.fromEntries(headers.filter(header => header.endsWith("Date")).map(header => [header, formatDateDisplay(record[header])])),
        "Master Status": record._masterStatus || "No master match",
      }));
      const name = (selectedCompany || "all-companies").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
      downloadExcel(`${name}-${view}-${new Date().toISOString().slice(0, 10)}.xlsx`, view === "master" ? "Master Shipments" : "Merge Invoices", exportHeaders, exportRows);
    } catch (error) {
      setExportError(error.message || "Could not export the Excel file.");
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setFilters({ search: "", company: selectedCompany || "", status: "", mergeInvoiceStatus: "", fromDate: "", toDate: "" });
    onPortalChange?.("All portals");
  };
  // PORTAL CHANGE

  const changePortal = (
    value
  ) => {
    onPortalChange(value);
  };

  // VIEW CHANGE

  const changeView = (
    nextView
  ) => {
    setFilters({
      search: "",
      company: "",
      status: "",
      mergeInvoiceStatus: "",
      fromDate: "",
      toDate: "",
    });

    onViewChange(nextView);
    onPortalChange?.("All portals");
  };

  // PAGE CHANGE

  const changePage = (
    nextPage
  ) => {
    if (
      recordsLoading ||
      nextPage < 1
    ) {
      return;
    }

    if (
      pagination?.totalPages &&
      nextPage >
      pagination.totalPages
    ) {
      return;
    }

    loadRecords({
      page: nextPage,
      limit: pagination?.limit || 20,
      search: filters.search.trim(),
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
      companyId: selectedCompanyId,
      status: currentStatus,
      portalId: selectedPortalId,
      type: view,
    }).catch(() => { });
  };

  // PAGE SIZE

  const changePageSize = (
    value
  ) => {
    loadRecords({
      page: 1,
      limit: Number(value),
      search: filters.search.trim(),
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
      companyId: selectedCompanyId,
      status: currentStatus,
      portalId: selectedPortalId,
      type: view,
    }).catch(() => { });
  };

  const rows = Array.isArray(data?.[view])
    ? data[view].map((record, index) => ({
      record,
      index,
    }))
    : [];  
  useEffect(() => {
    const timer = setTimeout(() => {
      loadRecords({
        page: 1,
        limit: pagination?.limit || 20,

        // Search keyword
        search: filters.search,

        // Date range
        fromDate: filters.fromDate,
        toDate: filters.toDate,

        // Company
        companyId: selectedCompanyId,

        // Status
        status: currentStatus,
        portalId: selectedPortalId,

        // Current view
        type: view,
      }).catch(() => { });
    }, 400);

    return () => clearTimeout(timer);
  }, [
    filters.search,
    filters.fromDate,
    filters.toDate,
    filters.status,
    filters.mergeInvoiceStatus,
    selectedCompanyId,
    view,
    selectedPortalId,
  ]);

  return (
    <>
      {/* ========================================== */}
      {/* PORTAL TABS */}
      {/* ========================================== */}

      <PortalTabs
        view={view}
        portalRecords={portalRecords}
        portalCounts={portalCounts}
        rows={data?.[view] || []}
        selected={portal}
        onChange={changePortal}
      />

      <section className="table-card">

        {/* ======================================== */}
        {/* CARD HEADER */}
        {/* ======================================== */}

        <div className="card-heading">
          <div>
            <h2>
              {view === "master"
                ? "Master Shipment Sheet"
                : "Merge Invoice Excel Sheet"}
            </h2>

            <p>
              {view === "master"
                ? "All imported shipments, including delivered records. Filter by status below."
                : "All imported invoice lines, including invoices for delivered shipments."}
            </p>
          </div>

          <div className="page-actions">
            <button type="button" className="button secondary" onClick={exportExcel} disabled={exporting || recordsLoading}>
              {exporting ? "Preparing Excel…" : "↓ Export Excel"}
            </button>
            <button type="button" className="button primary" disabled={!canAdd} onClick={onAdd}>
              {view === "master" ? "＋ Add shipment" : "＋ Add invoice line"}
            </button>
          </div>
        </div>

        {/* ======================================== */}
        {/* FILTERS */}
        {/* ======================================== */}

      <ShipmentFilters
        view={view}
          onViewChange={
            changeView
          }
          filters={{
            ...filters,

            /*
             * Display currently selected company.
             */
            company:
              selectedCompany || "",
          }}
          onChange={
            changeFilter
          }
          onClear={clearFilters}
          companies={
            companies
          }
      />
        {exportError && <p className="form-error" role="alert">{exportError}</p>}

        {/* ======================================== */}
        {/* LOADING */}
        {/* ======================================== */}

        {recordsLoading ? (
          <div className="table-loading">
            Loading shipment records...
          </div>
        ) : null}

        {/* ======================================== */}
        {/* TABLE */}
        {/* ======================================== */}

        {!recordsLoading &&
          rows.length === 0 ? (
          <div className="empty-state">
            <h3>
              No records found
            </h3>

            <p>
              Try changing the
              search, date, status
              or company filter.
            </p>
          </div>
        ) : null}

        {!recordsLoading &&
          rows.length > 0 ? (
          <ShipmentTable
              canEdit={canEdit}
            headers={displayHeaders}
            rows={rows}
            totals={totals}
            showMasterStatus={view === "merge"}
              onEdit={onEdit}
              view={view}
          />
        ) : null}

        {/* ======================================== */}
        {/* PAGINATION */}
        {/* ======================================== */}

        <Pagination
          page={
            pagination?.page || 1
          }

          pageSize={
            pagination?.limit || 20
          }

          total={
            pagination?.total || 0
          }

          onPageChange={
            changePage
          }

          onPageSizeChange={
            changePageSize
          }

          label={
            view === "master"
              ? "shipments"
              : "invoice lines"
          }
        />
      </section>
    </>
  );
}
