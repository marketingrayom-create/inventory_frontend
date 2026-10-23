
export default function ShipmentFilters({
  view,
  onViewChange,
  filters,
  onChange,
  onClear,
  companies,
}) {
  const dateLabel = view === "merge" ? "invoice date" : "PO date";
  const statuses = [
    {
      value: "Delivered",
      label: view === "merge" ? "Delivered Qty" : "Delivered",
      className: "dispatched",
    },
    {
      value: "In-transit",
      label: view === "merge" ? "In-transit Qty" : "In-transit",
      className: "transit",
    },
  ];

  return (
    <div className="toolbar">
      {/* LEFT */}
      <div className="toolbar-left">

        {/* VIEW TABS */}

        {/* <div className="view-tabs">
          {view === "master" && (
            <button
              type="button"
              className="selected"
              onClick={() =>
                onViewChange("master")
              }
            >
              Master Shipment
            </button>
          )}

          {view === "merge" && (
            <button
              type="button"
              className="selected"
              onClick={() =>
                onViewChange("merge")
              }
            >
              Merge Excel Invoice Sheet
            </button>
          )}
        </div> */}

          {/* STATUS */}
  
        {(view === "master" || view === "merge") && (
          <div className="merge-status-wrapper">

            <div className="merge-status-title">
              {view === "merge"
                ? "Merge Invoice Status"
                : "Shipment Status"}
            </div>

            <div className="merge-status-tabs">

              {/* ALL */}
              <button
                type="button"
                className={`status-chip all ${(view === "merge"
                    ? filters.mergeInvoiceStatus
                    : filters.status) === ""
                    ? "active"
                    : ""
                  }`}
                onClick={() =>
                  onChange(
                    view === "merge"
                      ? "mergeInvoiceStatus"
                      : "status",
                    ""
                  )
                }
              >
                <span className="status-dot" />
                All status
              </button>

              {/* STATUS OPTIONS */}
              {statuses.map((status) => {
                const currentStatus =
                  view === "merge"
                    ? filters.mergeInvoiceStatus
                    : filters.status;

                return (
                  <button
                    key={status.value}
                    type="button"
                    className={`status-chip ${status.className} ${currentStatus === status.value
                        ? "active"
                        : ""
                      }`}
                    onClick={() =>
                      onChange(
                        view === "merge"
                          ? "mergeInvoiceStatus"
                          : "status",
                        status.value
                      )
                    }
                  >
                    <span className="status-dot" />
                    {status.label}
                  </button>
                );
              })}

            </div>
          </div>
        )}
      </div>

      {/* RIGHT FILTERS */}

      <div className="filters">

        {/* SEARCH */}

        <label className="search">
          <span>⌕</span>

          <input
            type="search"
            placeholder="Search shipments..."
            aria-label="Search shipments"
            value={
              filters.search || ""
            }
            onChange={(event) =>
              onChange(
                "search",
                event.target.value
              )
            }
          />
        </label>

        {/* COMPANY */}

        <select
          aria-label="Filter company"
          value={
            filters.company || ""
          }
          onChange={(event) =>
            onChange(
              "company",
              event.target.value
            )
          }
        >
          <option value="">
            All companies
          </option>

          {companies.map(
            (company) => (
              <option
                key={company._id || company.name || company}
                value={company.name || company}
              >
                {(company.name || company)?.toUpperCase()}
              </option>
            )
          )}
        </select>

        {/* DATE RANGE */}

        <div className="date-range" role="group" aria-label={`Filter by ${dateLabel} range`}>
          <label className="date-filter">
            <span>From</span>
            <input
              type="date"
              aria-label={`Filter from ${dateLabel}`}
              value={filters.fromDate || ""}
              onChange={(event) => onChange("fromDate", event.target.value)}
            />
          </label>

          <label className="date-filter">
            <span>To</span>
            <input
              type="date"
              aria-label={`Filter to ${dateLabel}`}
              value={filters.toDate || ""}
              onChange={(event) => onChange("toDate", event.target.value)}
            />
          </label>
        </div>

        <button type="button" className="clear-filters" onClick={onClear}>
          Clear filters
        </button>

      </div>
    </div>
  );
}
