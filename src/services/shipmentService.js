import { apiFetch, API_BASE_URL } from './apiClient.js';
import { readApiResponse } from './apiResponse.js';


const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

async function request(path = "", options = {}) {
  let response;

  try {
    response = await apiFetch(`${API_BASE_URL}/shipment-records${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Cannot connect to the inventory server. Check the backend and try again."
    );
  }

  const result = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(
      result.message || "Unable to save or load shipment records."
    );
  }

  return result;
}


// GET shipment records
export const getShipmentRecords = ({
  page = 1,
  limit = 20,
  search = "",
  keyword = "",
  fromDate = "",
  toDate = "",
  dateField = "PO Date",
  companyId = "",
  portalId = "",
  status = "",
  type = "",
} = {}) => {
  const params = new URLSearchParams();
  const effectiveToDate = fromDate && !toDate ? today() : toDate;

  params.set("page", String(page));
  params.set("limit", String(limit));

  const searchTerm = keyword || search;
  if (searchTerm?.trim()) {
    params.set("keyword", searchTerm.trim());
  }

  if (fromDate) {
    params.set("fromDate", fromDate);
  }

  if (effectiveToDate) {
    params.set("toDate", effectiveToDate);
  }

  if (fromDate || effectiveToDate) params.set("dateField", dateField);

  if (companyId) {
    params.set("companyId", companyId);
  }

  if (portalId) {
    params.set("portalId", portalId);
  }

  if (status) {
    params.set("status", status);
  }

  if (type) {
    params.set("type", type);
  }

  const query = params.toString();

  return request(query ? `?${query}` : "");
};


// IMPORT
export const importShipmentRecords = (
  type,
  records,
  preserveExisting = false,
  invoiceImport = false
) =>
  request("/import", {
    method: "POST",
    body: JSON.stringify({
      type,
      records,
      preserveExisting,
      invoiceImport,
    }),
  });

export const previewShipmentImport = (type, records, preserveExisting = false, invoiceImport = false) =>
  request('/import/preview', {
    method: 'POST',
    body: JSON.stringify({ type, records, preserveExisting, invoiceImport }),
  });


// UPDATE
export const getShipmentActivity = ({ page = 1, userId = '' } = {}) => request(`/activity?${new URLSearchParams({ page: String(page), userId })}`);
export const updateShipmentRecord = (id, record) =>
  request(`/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      record,
    }),
  });

// Complete report: totals are never limited by the shipments table pagination.
export function getInTransitReport({companyId = '', portalId = '', includeUnknown = true, signal} = {}) {
  const params = new URLSearchParams({includeUnknown: String(includeUnknown)});
  if (companyId) params.set('companyId', companyId);
  if (portalId) params.set('portalId', portalId);
  return request(`/in-transit-report?${params}`, {signal});
}
