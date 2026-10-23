import { useEffect, useState } from 'react';

import StatsCards from '../components/dashboard/StatsCards.jsx';
import { getDashboard } from '../services/dashboardService.js';
import { money, number } from '../utils/shipments.js';

export default function Dashboard({
  companyId = '',
  refreshKey,
  onOpenShipments,
}) {
  const [state, setState] = useState({
    companyId: null,
    data: null,
    error: '',
    loading: true,
  });

  const [retry, setRetry] = useState(0);

  const [pagination, setPagination] = useState({
    companyId,
    refreshKey,
    page: 1,
  });

  const page =
    pagination.companyId === companyId &&
      pagination.refreshKey === refreshKey
      ? pagination.page
      : 1;

  useEffect(() => {
    const controller = new AbortController();

    setState({
      companyId,
      data: null,
      error: '',
      loading: true,
    });

    getDashboard(companyId, controller.signal, page, 2)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({
            companyId,
            data,
            error: '',
            loading: false,
          });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setState({
            companyId,
            data: null,
            error: error.message,
            loading: false,
          });
        }
      });

    return () => controller.abort();
  }, [companyId, refreshKey, retry, page]);

  if (state.companyId !== companyId || state.loading) {
    return (
      <div className="table-loading" role="status">
        Loading company dashboard…
      </div>
    );
  }

  if (state.error) {
    return (
      <div role="alert" className="auth-error">
        {state.error}{' '}
        <button
          className="button secondary"
          onClick={() => setRetry((value) => value + 1)}
        >
          Retry dashboard
        </button>
      </div>
    );
  }

  const data = state.data;

  const states = data.stateInTransit || [];

  const stateTotals =
    data.stateTotals ||
    states.reduce(
      (total, row) => ({
        units: total.units + row.units,
        parcels: total.parcels + row.parcels,
        invoiceValue:
          total.invoiceValue + (row.invoiceValue || 0),
        withoutTaxAmount:
          total.withoutTaxAmount + (row.withoutTaxAmount || 0),
      }),
      {
        units: 0,
        parcels: 0,
        invoiceValue: 0,
        withoutTaxAmount: 0,
      }
    );

  const totalPortalShipments = data.portals.reduce(
    (sum, portal) => sum + portal.count,
    0
  );

  return (
    <>
      <StatsCards summary={data} />

      <section id="dashboardPanel">
        {/* LEFT COLUMN */}
        <div className="dashboard-left-column">
          {/* STATE-WISE IN-TRANSIT INVENTORY */}
          <article className="dashboard-card state-transit-card">
            <div className="eyebrow">
              STATE-WISE IN-TRANSIT INVENTORY
            </div>

            <h2>In-transit inventory by state</h2>

            <p className="portal-metrics">
              Dispatched / In-transit Master shipments only
            </p>

            {states.length ? (
              <div className="state-transit-scroll">
                <table className="state-transit-table">
                  <thead>
                    <tr>
                      <th scope="col">State</th>
                      <th scope="col">Units</th>
                      <th scope="col">Parcels</th>
                      <th scope="col">Invoice Value</th>
                      <th scope="col">Without Tax Amount</th>
                    </tr>
                  </thead>

                  <tbody className="state-total-row">
                    <tr>
                      <th scope="row">Total</th>

                      <td>{number(stateTotals.units)}</td>

                      <td>{number(stateTotals.parcels)}</td>

                      <td>
                        {money(stateTotals.invoiceValue)}
                      </td>

                      <td>
                        {money(stateTotals.withoutTaxAmount)}
                      </td>
                    </tr>
                  </tbody>

                  <tbody>
                    {states.map((row) => (
                      <tr key={row.state}>
                        <th scope="row">{row.state}</th>

                        <td>{number(row.units)}</td>

                        <td>{number(row.parcels)}</td>

                        <td>{money(row.invoiceValue)}</td>

                        <td>
                          {money(row.withoutTaxAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No in-transit shipments for this company.</p>
            )}

            {data.statePagination && (
              <nav
                className="state-pagination"
                aria-label="State pagination"
              >
                <button
                  className="button secondary"
                  disabled={data.statePagination.page <= 1}
                  onClick={() =>
                    setPagination({
                      companyId,
                      refreshKey,
                      page: data.statePagination.page - 1,
                    })
                  }
                >
                  Previous
                </button>

                <span>
                  Page {data.statePagination.page} of{' '}
                  {data.statePagination.totalPages} —{' '}
                  {data.statePagination.total} states
                </span>

                <button
                  className="button secondary"
                  disabled={
                    data.statePagination.page >=
                    data.statePagination.totalPages
                  }
                  onClick={() =>
                    setPagination({
                      companyId,
                      refreshKey,
                      page: data.statePagination.page + 1,
                    })
                  }
                >
                  Next
                </button>
              </nav>
            )}
          </article>

          {/* SHIPMENT OVERVIEW */}
          <article className="dashboard-card">
            <div className="eyebrow">SHIPMENT OVERVIEW</div>

            <h2>Every stage, accounted for.</h2>

            {/* <div className="dashboard-row">
              <span>Pending</span>
              <strong>{data.pending}</strong>
            </div> */}

            <div className="dashboard-row">
              <span>Dispatched / In-transit</span>
              <strong>{data.dispatchedInTransit}</strong>
            </div>
{/* 
            <div className="dashboard-row">
              <span>Invoice line items</span>
              <strong>{data.invoiceLineItems}</strong>
            </div> */}

            <button
              className="button primary dashboard-link"
              onClick={onOpenShipments}
            >
              View master shipments →
            </button>
          </article>
        </div>

        {/* MARKETPLACE ACTIVITY */}
        <article className="dashboard-card">
          <div className="eyebrow">MARKETPLACE ACTIVITY</div>

          <h2>Shipments by portal</h2>

          <p className="portal-metrics">
            All Master shipments, including Delivered
          </p>

          {data.portals.length ? (
            data.portals.map((portal) => (
              <div key={portal.id}>
                <div className="dashboard-row">
                  <span>{portal.name}</span>
                  <strong>{portal.count}</strong>
                </div>

                <div className="portal-metrics portal-value-lines">
                  <div>
                    Total Qty: {number(portal.units)}
                  </div>

                  <div>
                    · Invoice Value: {money(portal.masterValue)}
                  </div>

                  <div>
                    · Without Tax Value:{' '}
                    {money(portal.withoutTaxAmount)}
                  </div>
                </div>

                <div className="dashboard-bar">
                  <span
                    style={{
                      width: `${totalPortalShipments
                          ? (portal.count / totalPortalShipments) * 100
                          : 0
                        }%`,
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p>No portals connected for this company.</p>
          )}
        </article>
      </section>
    </>
  );
}