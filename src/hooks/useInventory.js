import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import seed from "../data/shipments.json";

import {
  activeRecords,
  isRelatedShipmentHeader,
  STORAGE_KEY,
} from "../utils/shipments.js";

import {
  getCompanies,
} from "../services/companyService.jsx";

import {
  getPortals,
} from "../services/portalService.jsx";

import {
  getShipmentRecords,
  importShipmentRecords,
} from "../services/shipmentService.js";

const PREFERENCES_KEY =
  "Kuber-ERP-v2";
const SHIPMENT_SCHEMA_KEY = "Kuber-shipment-column-schema-v1";

function readLocal(key) {
  try {
    return (
      JSON.parse(
        localStorage.getItem(key)
      ) || {}
    );
  } catch {
    return {};
  }
}

function validColumnMappings(mappings = {}) {
  return Object.fromEntries(Object.entries(mappings).filter(([oldName, newName]) =>
    oldName && newName && (
      isRelatedShipmentHeader(oldName, newName) ||
      (oldName === 'Location' && /^(pick\s*[- ]?up|pickup)\s+location$/i.test(newName.trim()))
    )));
}

function orderTaxColumns(headers, type, replacements = {}) {
  if (type !== 'merge') return headers;
  const taxHeaders = ['IGST', 'SGST', 'CGST'].map(field => replacements[field] || field);
  const present = taxHeaders.filter(field => headers.includes(field));
  if (present.length < 2) return headers;
  const positions = present.map(field => headers.indexOf(field));
  const insertAt = Math.min(...positions);
  const rest = headers.filter(field => !present.includes(field));
  const beforeCount = headers.slice(0, insertAt).filter(field => !present.includes(field)).length;
  rest.splice(beforeCount, 0, ...taxHeaders.filter(field => present.includes(field)));
  return rest;
}

function legacyRows() {
  const saved = readLocal(STORAGE_KEY);

  return {
    master: Array.isArray(saved.master)
      ? saved.master
      : [],

    merge: Array.isArray(saved.merge)
      ? saved.merge
      : [],
  };
}

export default function useInventory(view = 'master', screen = 'dashboard') {
  // DATA

  const [data, setData] = useState(() => ({
    master: [],
    merge: [],
    portals: [],
    companies: [],

    selectedCompany:
      readLocal(PREFERENCES_KEY)
        .selectedCompany ||
      readLocal(STORAGE_KEY)
        .selectedCompany ||
      "",
  }));
  const [shipmentSchema, setShipmentSchema] = useState(() => {
    const saved = readLocal(SHIPMENT_SCHEMA_KEY);
    const defaults = {
      master: seed.masterHeaders.map(header => header === 'Unit' ? 'Qty' : header),
      merge: seed.mergeHeaders,
    };
    const headers = {};
    const replacements = {};
    for (const type of ['master', 'merge']) {
      replacements[type] = validColumnMappings(saved.replacements?.[type]);
      const savedHeaders = Array.isArray(saved.headers?.[type]) ? saved.headers[type] : defaults[type];
      const hasSavedEquivalent = name => savedHeaders.includes(name) || (type === 'master' && name === 'Location' &&
        savedHeaders.some(header => /^(pick\s*[- ]?up|pickup)\s+location$/i.test(header.trim())));
      const missingRequired = defaults[type].filter(name => !hasSavedEquivalent(name) && !Object.hasOwn(replacements[type], name));
      headers[type] = orderTaxColumns([...new Set([...savedHeaders, ...missingRequired])], type, replacements[type]);
      // Keep the generated PDF link visible beside its invoice, including saved schemas.
      headers[type] = headers[type].filter(name => name !== 'Invoice Link');
      headers[type].splice(Math.max(0, headers[type].indexOf('Invoice Number') + 1), 0, 'Invoice Link');
      headers[type] = [...new Set(headers[type].map(name => name === 'Location' ? 'Pickup Location' : name))];
      if (!headers[type].includes('Destination Location')) headers[type].splice(headers[type].indexOf('Pickup Location') + 1, 0, 'Destination Location');
    }
    const initialized = saved.initialized || Object.fromEntries(['master', 'merge'].map(type => [type,
      Boolean(saved.headers?.[type] && (headers[type].length !== defaults[type].length || headers[type].some((name, index) => name !== defaults[type][index]))) || Object.keys(replacements[type]).length > 0,
    ]));
    const restored = { headers, replacements, initialized };
    try { localStorage.setItem(SHIPMENT_SCHEMA_KEY, JSON.stringify(restored)); } catch { /* Use repaired schema in memory if storage is unavailable. */ }
    return restored;
  });
  const shipmentHeaders = shipmentSchema.headers;

  // COMPANIES

  const [companyList, setCompanyList] = useState([]);
  const [companiesReady, setCompaniesReady] = useState(false);

  const [portalRecords, setPortalRecords] =  useState([]);
  const [portalCounts, setPortalCounts] = useState([]);
  const [recordTotals, setRecordTotals] = useState({});

  // STATUS

  const [storageError, setStorageError] = useState("");

  const [recordsLoading, setRecordsLoading] = useState(true);

  const [recordsReady, setRecordsReady] =  useState(false);

  // LEGACY

  const [legacy, setLegacy] = useState(legacyRows);

  // REQUEST CONTROL

  const loadVersion = useRef(0);

  const currentCompanyId = useRef("");

  // SERVER FILTERS

  const [recordFilters, setRecordFilters] =
    useState({
      page: 1,
      limit: 20,
      search: "",
      fromDate: "",
      toDate: "",
      companyId: "",
      portalId: "",
      type: "",
    });

  // PAGINATION

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });

  // ACTIVE DATA

  const active = useMemo(
    () => activeRecords(data),
    [data]
  );

  // COMPANY NAMES

  const companies = useMemo(
    () =>
      companyList
        .map(
          (company) =>
            company?.name
        )
        .filter(Boolean),
    [companyList]
  );

  // SELECTED COMPANY

  const selectedCompany =
    companies.includes(
      data.selectedCompany
    )
      ? data.selectedCompany
      : "";

  const selectedCompanyData =
    companyList.find(
      (company) =>
        company.name === selectedCompany
    );

  const selectedCompanyId =  selectedCompanyData?._id || "";

  currentCompanyId.current = selectedCompanyId;

  // LOAD SHIPMENT RECORDS

  async function loadRecords(
    overrides = {},
    silent = false
  ) {
    const version =
      ++loadVersion.current;

    const filters = {
      ...recordFilters,
      ...overrides,
    };

    // Always keep page valid
    filters.page =  Number(filters.page) > 0 ? Number(filters.page) : 1;

    filters.limit = Number(filters.limit) > 0  ? Number(filters.limit)  : 20;

    if (!silent) {
      setRecordsLoading(true);
    }

    try {
      console.log(
        "GET shipment records:",
        filters
      );

      const result =
        await getShipmentRecords(
          filters
        );

      // Ignore old request response
      if (
        version !==
        loadVersion.current
      ) {
        return result;
      }

      const adaptRows = (rows, type) => (rows || []).map(row => {
        const adapted = { ...row };
        for (const [oldName, newName] of Object.entries(validColumnMappings(readLocal(SHIPMENT_SCHEMA_KEY).replacements?.[type]))) {
          if ((adapted[newName] == null || adapted[newName] === '') && adapted[oldName] != null) adapted[newName] = adapted[oldName];
          if ((adapted[oldName] == null || adapted[oldName] === '') && adapted[newName] != null) adapted[oldName] = adapted[newName];
        }

        if (type === 'master' && (adapted.Location == null || adapted.Location === '')) {
          const pickup = Object.keys(adapted).find(name => /^(pick\s*[- ]?up|pickup)\s+location$/i.test(name.trim()));
          if (pickup && adapted[pickup] != null) adapted.Location = adapted[pickup];
        }
        return adapted;
      });
      const master = adaptRows(result.data?.master, 'master');
      const merge = adaptRows(result.data?.merge, 'merge');
      if (master.length || merge.length) {
        setShipmentSchema(previous => {
          const initialized = { ...previous.initialized, ...(master.length ? { master: true } : {}), ...(merge.length ? { merge: true } : {}) };
          if (initialized.master === previous.initialized.master && initialized.merge === previous.initialized.merge) return previous;
          const next = { ...previous, initialized };
          localStorage.setItem(SHIPMENT_SCHEMA_KEY, JSON.stringify(next));
          return next;
        });
      }

      setData((previous) => ({
        ...previous,
        master,
        merge,
      }));
      if (!filters.portalId) {
        setPortalCounts(Array.isArray(result.portalCounts) ? result.portalCounts : []);
      }

      if (result.pagination) {
        setPagination(
          result.pagination
        );
      }
      setRecordTotals(result.totals || {});
      setRecordFilters(
        filters
      );
      setRecordsReady(true);
      setStorageError("");

      return result;
    } catch (error) {
      if (
        version === loadVersion.current
      ) {
        setStorageError(
          error.message
        );

        setRecordsReady(false);
      }

      throw error;
    } finally {
      if (
        version ===  loadVersion.current &&  !silent
      ) {
        setRecordsLoading(false);
      }
    }
  }

  async function loadCompanies() {
    try {
      const result =
        await getCompanies();

      const list = Array.isArray( result.data ) ? result.data  : [];

      setCompanyList(list);
      setCompaniesReady(true);

      const names =  list?.map(
            (company) =>
              company?.name
          )?.filter(Boolean);

      setData((previous) => {
        const oldCompany =
          previous.selectedCompany;

        const nextCompany =
          names?.includes(
            oldCompany
          )
            ? oldCompany
            : names[0] || "";

        return {
          ...previous,

          companies: names,

          selectedCompany:
            nextCompany,

          portals: [],
        };
      });
    } catch (error) {
      setStorageError(
        error.message
      );
    }
  }

  // LOAD PORTALS

  async function loadPortals(
    companyId
  ) {
    if (!companyId) {
      setData((previous) => ({
        ...previous,
        portals: [],
      }));
      setPortalRecords([]);

      return;
    }

    try {
      const result =
        await getPortals(
          companyId
        );

      const list =
        Array.isArray(
          result.data
        )
          ? result.data
          : [];

      if (
        currentCompanyId.current ===
        companyId
      ) {
        setPortalRecords(list);
        setData((previous) => ({
          ...previous,

          portals:
            list?.map( (portal) => portal?.name)?.filter(Boolean),
        }));
      }
    } catch (error) {
      setStorageError(
        error.message
      );
    }
  }

  // INITIAL LOAD

  useEffect(() => {
    loadCompanies();

    return () => {
      loadVersion.current++;
    };
  }, []);

  // COMPANY CHANGE
  useEffect(() => {
    setData((previous) => ({
      ...previous,
      portals: [],
    }));
    setPortalRecords([]);
    setPortalCounts([]);
    setRecordTotals({});

    // Load company portals
    loadPortals(
      selectedCompanyId
    );

  }, [selectedCompanyId]);

  // The shipment page owns its filtered requests; the dashboard loads only after company selection is ready.
  useEffect(() => {
    if (!companiesReady || screen !== 'dashboard') return;
    loadRecords({
      page: 1,
      companyId: selectedCompanyId,
      portalId: "",
      search: "",
      keyword: "",
      fromDate: "",
      toDate: "",
      status: "",
      type: view,
    }).catch(
      () => { }
    );
  }, [
    selectedCompanyId,
    view,
    screen,
    companiesReady,
  ]);

  // POD STATUS REFRESH

  useEffect(() => {
    const hasPendingPod =
      data.master.some(
        (row) =>
          [
            "pending",
            "downloading",
          ].includes(
            row?._pod?.status
          )
      );

    if (
      recordsLoading ||
      !hasPendingPod
    ) {
      return;
    }

    const timer =
      setTimeout(() => {
        loadRecords(
          {},
          true
        ).catch(
          () => { }
        );
      }, 5000);

    return () =>
      clearTimeout(timer);
  }, [
    data.master,
    recordsLoading,
  ]);

  // SAVE UI PREFERENCES

  function commit(next) {
    setData((previous) => {
      const updated =
        typeof next === "function"
          ? next(previous)
          : {
            ...previous,
            ...next,
          };

      try {
        localStorage.setItem(
          PREFERENCES_KEY,
          JSON.stringify({
            selectedCompany:
              updated.selectedCompany,
          })
        );
      } catch {
        // Preferences are optional.
      }

      return updated;
    });
  }

  // LEGACY MIGRATION

  async function migrateLegacy() {
    if (
      !recordsReady ||
      recordsLoading
    ) {
      throw new Error(
        "Load database records before migrating browser data."
      );
    }

    for (
      const type of [
        "master",
        "merge",
      ]
    ) {
      for (
        let offset = 0;
        offset <
        legacy[type].length;
        offset += 1000
      ) {
        await importShipmentRecords(
          type,
          legacy[type].slice(
            offset,
            offset + 1000
          ),
          true
        );
      }
    }

    await loadRecords();

    await loadPortals(
      currentCompanyId.current
    );

    setLegacy({
      master: [],
      merge: [],
    });

    try {
      localStorage.setItem(
        "stockflow-migrated-v2",
        JSON.stringify(
          readLocal(
            STORAGE_KEY
          )
        )
      );
    } catch {
      // Retrying migration is safe.
    }
  }

  // LEGACY COUNT

  const legacyCount =
    JSON.stringify(
      readLocal(
        "stockflow-migrated-v2"
      )
    ) ===
      JSON.stringify(
        readLocal(STORAGE_KEY)
      )
      ? 0
      : legacy.master.length +
      legacy.merge.length;

  // RETURN

  return {
    data,

    active,

    companies,

    companyList,
    companiesReady,

    selectedCompany,

    selectedCompanyData,

    selectedCompanyId,

    portals:
      data.portals || [],
    portalRecords,
    portalCounts,
    recordTotals,

    // Server-side filtering
    recordFilters,

    setRecordFilters,

    // Pagination
    pagination,

    // Actions
    commit,

    loadCompanies,

    loadPortals,

    loadRecords,

    // Status
    storageError,

    recordsReady,

    recordsLoading,

    // Legacy
    legacyCount,

    migrateLegacy,

    // Excel headers
    headers: shipmentHeaders,
    columnMappings: shipmentSchema.replacements,
    shipmentSchemaInitialized: Boolean(shipmentSchema.initialized[view]),
    applyShipmentSchema: (type, { columnMapping = {}, additions = [], reset = false } = {}) => setShipmentSchema(previous => {
      const defaults = {
        master: seed.masterHeaders.map(header => header === 'Unit' ? 'Qty' : header),
        merge: seed.mergeHeaders,
      };
      const headers = reset ? [...defaults[type]] : [...previous.headers[type]];
      const replacements = reset ? {} : { ...previous.replacements[type] };
      for (const [oldName, newName] of Object.entries(validColumnMappings(columnMapping))) {
        if (!newName || oldName === newName) continue;
        for (const [savedOld, savedNew] of Object.entries(replacements)) {
          if ([oldName, newName].includes(savedOld) || [oldName, newName].includes(savedNew)) delete replacements[savedOld];
        }
        const index = headers.indexOf(oldName);
        if (index >= 0) headers[index] = newName;
        replacements[oldName] = newName;
      }
      for (const name of additions) if (!headers.includes(name)) headers.push(name);
      const next = { headers: { ...previous.headers, [type]: orderTaxColumns([...new Set(headers)], type, replacements) }, replacements: { ...previous.replacements, [type]: replacements }, initialized: { ...previous.initialized, [type]: true } };
      localStorage.setItem(SHIPMENT_SCHEMA_KEY, JSON.stringify(next));
      return next;
    }),
  };
}
