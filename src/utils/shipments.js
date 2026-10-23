import { companyKey, normalized, portalKey, portalName } from './importIdentity.js';

export const STORAGE_KEY =
  "Kuber-transit-v1";

export const numericFields =
  new Set([
    "Qty",
    "Parcel",
    "Invoice Value",
    "Without Tax Amount",
    "Tax Amount",
    "Unit Cost",
    "Total Cost",
    "IGST",
    "CGST",
    "SGST",
    "IGST Amount",
    "Total Amount",
  ]);

export const requiredShipmentHeaders = {
  master: ["Company", "Portal", "Vendor Code/ Shipment Id", "PO Number", "Location", "State", "PO Date", "Status", "Remark", "Invoice Number", "Invoice Date", "Qty", "Parcel", "Invoice Value", "Without Tax Amount", "Tax Amount", "Logistic Name", "LRN Number", "Dispatched Date", "Appointment Id", "Appointment Date", "Delivered Date", "POD Link", "Uploaded in Vendor Central", "Transporter Bill Check Status"],
  merge: ["Company", "Portal", "PO Number", "Location", "Invoice Number", "Invoice Date", "ASIN", "EAN", "SKU Code", "Product Name", "HSN Code", "Qty", "Unit Cost", "Total Cost", "IGST", "CGST", "SGST", "IGST Amount", "Total Amount"],
};

export const formSections = {
  master: [
    [
      "Shipment information",
      0,
      9,
    ],
    [
      "Invoice & quantities",
      9,
      16,
    ],
    [
      "Logistics & delivery",
      16,
      25,
    ],
  ],

  merge: [
    [
      "Shipment & invoice",
      0,
      6,
    ],
    [
      "Product information",
      6,
      11,
    ],
    [
      "Quantity, pricing & tax",
      11,
      19,
    ],
  ],
};

export const money = (value) =>
  new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(Number(value) || 0);

export const number = (value) =>
  new Intl.NumberFormat(
    "en-IN"
  ).format(value);

export function shipmentStatus(row) {
  const status = String(
    row?.Status || ""
  )
    .trim()
    .toLowerCase();

  if (
    status === "pending"
  ) {
    return "Pending";
  }

  if (
    [
      "-",
      "",
      "in transit",
      "in-transit",
    ].includes(status)
  ) {
    return "In-transit";
  }

  return (
    status[0].toUpperCase() +
    status.slice(1)
  );
}

export function formatDateDisplay(value) {
  const text = String(value ?? '');
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
  if (isoDate) return `${isoDate[3]}-${isoDate[2]}-${isoDate[1]}${isoDate[4]}`;
  return text;
}

export const isActive = (row) =>
  [
    "Pending",
    // "Dispatched",
    "In-transit",
  ].includes(
    shipmentStatus(row)
  );

export const shipmentKey = (row) =>
  JSON.stringify([
    companyKey(row.Company),
    portalKey(row.Portal),
    normalized(row["Invoice Number"]),
    normalized(row["PO Number"]),
  ]);

export const recordKey = (
  row,
  type
) =>
  type === "master"
    ? shipmentKey(row)
    : JSON.stringify([
      shipmentKey(row),
      ...[
        "SKU Code",
        "ASIN",
        "EAN",
      ].map(
        (field) =>
          normalized(
            row[field] ?? ""
          )
      ),
      ...(!['SKU Code', 'ASIN', 'EAN'].some(field => normalized(row[field]))
        ? [normalized(row['Product Name'])] : []),
    ]);

// Match portal aliases without changing the original Excel cell value.
export function portalCategory(
  row
) {
  return portalName(row?.Portal);
}

export function activeRecords(
  data
) {
  const master =
    data.master.filter(
      isActive
    );

  const keys = new Set(
    data.master.filter(row => !isActive(row)).map(
      shipmentKey
    )
  );

  return {
    master,
    merge: data.merge.filter(
      (row) =>
        !keys.has(
          shipmentKey(row)
        )
    ),
  };
}

export function shipmentViewRecords(data, active, view, company) {
  const rows = data[view];
  return company ? rows.filter(row => companyKey(row.Company) === companyKey(company)) : rows;
}

export function normalizeRecord(
  values,
  headers
) {
  return Object.fromEntries(
    [...new Set([...headers, ...Object.keys(values)])].map(
      (field) => {
        const value =
          values[field] ?? "";

        return [
          field,
          numericFields.has(field)
            ? value === ""
              ? null
              : Number(value)
            : typeof value === 'number' ? value : String(value).trim(),
        ];
      }
    )
  );
}

export function saveRecord(
  data,
  type,
  record,
  index = null
) {
  if (
    !record.Company ||
    !record.Portal ||
    !record["Invoice Number"]
  ) {
    throw Error(
      "Company, portal and invoice number are required."
    );
  }

  for (
    const field of numericFields
  ) {
    if (
      record[field] != null &&
      (
        !Number.isFinite(
          record[field]
        ) ||
        record[field] < 0
      )
    ) {
      throw Error(
        `Invalid number in ${field}.`
      );
    }
  }

  if (
    data[type].some(
      (row, i) =>
        i !== index &&
        recordKey(
          row,
          type
        ) ===
        recordKey(
          record,
          type
        )
    )
  ) {
    throw Error(
      "This record already exists. Edit the existing record instead."
    );
  }

  const next = {
    ...data,
    [type]: [
      ...data[type],
    ],
  };

  if (index === null) {
    next[type].unshift(
      record
    );
  } else {
    next[type][index] =
      record;
  }

  if (
    type === "master" &&
    index !== null
  ) {
    const previousKey =
      shipmentKey(
        data.master[index]
      );

    next.merge =
      data.merge.map(
        (row) =>
          shipmentKey(row) ===
            previousKey
            ? {
              ...row,
              ...Object.fromEntries(
                [
                  "Company",
                  "Portal",
                  "Invoice Number",
                  "PO Number",
                  "Location",
                  "Invoice Date",
                ].map(
                  (field) => [
                    field,
                    record[field],
                  ]
                )
              ),
            }
            : row
      );
  }

  return next;
}

export function importRecords(
  data,
  type,
  rows
) {
  const records =
    new Map(
      data[type].map(
        (row) => [
          recordKey(
            row,
            type
          ),
          row,
        ]
      )
    );

  let added = 0;
  let updated = 0;

  for (
    const row of rows
  ) {
    const key =
      recordKey(
        row,
        type
      );

    if (
      records.has(key)
    ) {
      updated++;
    } else {
      added++;
    }

    records.set(
      key,
      row
    );
  }

  return {
    data: {
      ...data,
      [type]: [
        ...records.values(),
      ],
    },
    added,
    updated,
  };
}

const headerKey = value => {
  const key = normalized(value).replace(/\s*\/\s*/g, '/').toLowerCase();
  return ['unit', 'units', 'quantity', 'quantities', 'unit per parcel', 'units per parcel', 'quantity per parcel', 'quantities per parcel', 'qty per parcel'].includes(key) ? 'qty' : key;
};
const editDistance = (left, right) => {
  const prior = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i++) {
    let diagonal = prior[0];
    prior[0] = i;
    for (let j = 1; j <= right.length; j++) {
      const above = prior[j];
      prior[j] = Math.min(prior[j] + 1, prior[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return prior[right.length];
};
const similarWord = (left, right) => {
  if (left === right) return true;
  if (Math.min(left.length, right.length) < 3) return false;
  return 1 - editDistance(left, right) / Math.max(left.length, right.length) >= 0.8;
};
const headerTokens = value => headerKey(value).toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\bpick\s+ups?\b/g, 'pickup').replace(/\bpickups?\b/g, 'pickup').replace(/\bpicup\b/g, 'pickup')
  .split(/\s+/).filter(Boolean);
const genericHeaderTokens = new Set(['in', 'the', 'for', 'of', 'and', 'a', 'an', 'per', 'status', 'location', 'date', 'link', 'name', 'number', 'id', 'value', 'check', 'data', 'url', 'record', 'update', 'address']);
const isPickupLocationHeader = value => /^(pick\s*[- ]?up|pickup)\s+location$/i.test(String(value ?? '').trim());
const relatedHeader = (left, right) => {
  if (headerKey(left) === headerKey(right)) return false;
  const a = headerTokens(left).filter(token => !genericHeaderTokens.has(token));
  const b = headerTokens(right).filter(token => !genericHeaderTokens.has(token));
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (!shorter.length) return false;
  if (shorter.length === 1 && shorter[0] === 'amount') return false;
  const matched = shorter.filter(token => longer.some(candidate => similarWord(token, candidate))).length;
  return matched / shorter.length >= 0.75;
};
export const isRelatedShipmentHeader = relatedHeader;

export function detectWorkbookType(sheets) {
  const scores = { master: 0, merge: 0 };
  for (const rows of sheets) {
    for (const type of Object.keys(scores)) {
      const required = requiredShipmentHeaders[type];
      let bestScore = 0;
      for (const row of rows) {
        const keys = new Set(row.map(value => String(value ?? '').trim()).filter(Boolean).map(headerKey));
        bestScore = Math.max(bestScore, required.filter(field => keys.has(headerKey(field))).length);
      }
      scores[type] += bestScore;
    }
  }
  if (Math.max(scores.master, scores.merge) < 3 || Math.abs(scores.master - scores.merge) < 3) return null;
  return scores.master > scores.merge ? 'master' : 'merge';
}

export function inspectWorkbookColumns(sheets, type, headers, acceptedMappings = {}, { allowedCompanies = null } = {}) {
  const required = requiredShipmentHeaders[type] || headers;
  const candidates = [];
  for (const rows of sheets) {
    let sheetBest = null;
    for (const [index, row] of rows.entries()) {
      const names = row.map(value => String(value ?? '').trim()).filter(Boolean);
      const keys = new Set(names.map(headerKey));
      const score = required.filter(field => keys.has(headerKey(field))).length;
      if (score >= 3 && (!sheetBest || score > sheetBest.score)) sheetBest = { rows, index, names, keys, score };
    }
    if (sheetBest) {
      const identityIndex = field => sheetBest.rows[sheetBest.index].findIndex(name =>
        headerKey(name) === headerKey(field) || (acceptedMappings[field] && headerKey(name) === headerKey(acceptedMappings[field])));
      const companyIndex = identityIndex('Company');
      // Debit notes and reference tabs are not shipment registers.
      if (companyIndex < 0 || identityIndex('Invoice Number') < 0 || identityIndex('Portal') < 0) continue;
      if (allowedCompanies) {
        const allowed = new Set(allowedCompanies.map(companyKey));
        if (!rows.slice(sheetBest.index + 1).some(row => allowed.has(companyKey(row[companyIndex])))) continue;
      }
      candidates.push(sheetBest);
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best) throw Error(allowedCompanies ? 'No shipment rows found for Rayom or Shelfesteem. Shipment sheets need Company, Portal and Invoice Number.' : 'Columns missing: could not identify the header row. Make sure the sheet includes Company, Portal and Invoice Number.');
  const relevantCandidates = candidates;
  const sourceHeaders = [...new Set(relevantCandidates.flatMap(item => item.names))];
  const sourceKeys = new Set(sourceHeaders.map(headerKey));
  const suggestedMappings = {};
  const acceptedPairs = Object.entries(acceptedMappings || {}).filter(([oldName, newName]) => oldName && newName && oldName !== newName &&
    sourceHeaders.some(name => headerKey(newName) === headerKey(name)));
  for (const [oldName, newName] of acceptedPairs) suggestedMappings[oldName] = newName;
  const hasAcceptedMapping = field => acceptedPairs.some(([oldName, newName]) => [oldName, newName].some(alias => headerKey(alias) === headerKey(field)));
  const approvedRenameAliases = { Location: ['Pick-up Location', 'Pickup Location', 'Pick up Location'] };
  for (const field of required) {
    if (suggestedMappings[field]) continue;
    const missingInSomeSheet = relevantCandidates.some(item => !item.keys.has(headerKey(field)));
    if (!missingInSomeSheet) continue;
    const knownAlias = (approvedRenameAliases[field] || []).find(alias =>
      relevantCandidates.filter(item => !item.keys.has(headerKey(field))).every(item => item.keys.has(headerKey(alias))));
    if (knownAlias) suggestedMappings[field] = knownAlias;
  }
  const missingSavedHeaders = headers.filter(field => !hasAcceptedMapping(field) && !required.some(item => headerKey(item) === headerKey(field)) &&
    relevantCandidates.some(item => !item.keys.has(headerKey(field))) && sourceHeaders.some(name => relatedHeader(field, name)));
  const savedRenamesForRequired = missingSavedHeaders.filter(saved => required.some(field => relatedHeader(field, saved)));
  const missingRequired = required.filter(field => !hasAcceptedMapping(field) && relevantCandidates.some(item => !item.keys.has(headerKey(field))) && !suggestedMappings[field] &&
    !savedRenamesForRequired.some(saved => relatedHeader(field, saved)));
  const knownHeaders = [...new Set([...headers, ...required])];
  const unknownSourceHeaders = sourceHeaders.filter(name => !knownHeaders.some(field => headerKey(field) === headerKey(name)));
  const inferredRenameTargets = unknownSourceHeaders.flatMap(name => knownHeaders.filter(field => !suggestedMappings[field] && relatedHeader(field, name)));
  const renameTargets = [...new Set([...missingRequired, ...missingSavedHeaders, ...inferredRenameTargets])].filter(field => !suggestedMappings[field]);
  const renameOptions = Object.fromEntries(renameTargets.map(field => [field, sourceHeaders.filter(name => headerKey(name) !== headerKey(field) && relatedHeader(field, name))]));
  const proposedRenameSources = new Set();
  for (const source of Object.values(suggestedMappings)) proposedRenameSources.add(headerKey(source));
  for (const [field, options] of Object.entries(renameOptions)) {
    const competingTargets = knownHeaders.filter(candidate => relatedHeader(candidate, options[0] || '')).length;
    if (options.length === 1 && competingTargets === 1) proposedRenameSources.add(headerKey(options[0]));
  }
  const acceptedNames = acceptedPairs.flatMap(([oldName, newName]) => [oldName, newName]);
  const newHeaders = sourceHeaders.filter(name => ![...headers, ...required, ...acceptedNames].some(field => headerKey(field) === headerKey(name)) &&
    !(type === 'master' && isPickupLocationHeader(name)) && !proposedRenameSources.has(headerKey(name)));
  return { candidates: relevantCandidates, sourceHeaders, missingRequired, missingSavedHeaders, renameTargets, renameOptions, newHeaders, required, suggestedMappings };
}

export function parseWorkbookRows(sheets, type, headers, { columnMapping = {}, includeNewHeaders = [], acceptedMappings = {}, allowedCompanies = null } = {}) {
  const schema = inspectWorkbookColumns(sheets, type, headers, acceptedMappings, { allowedCompanies });
  columnMapping = { ...schema.suggestedMappings, ...columnMapping };
  const aliasesFor = field => {
    const aliases = [columnMapping[field], field];
    const mappedField = Object.entries(columnMapping).find(([, target]) => headerKey(target) === headerKey(field))?.[0];
    if (mappedField) aliases.push(mappedField, ...Object.keys(acceptedMappings).filter(name => headerKey(name) === headerKey(mappedField)));
    aliases.push(...(schema.renameOptions[field] || []));
    if (headerKey(field) === headerKey('Location') || isPickupLocationHeader(field)) {
      aliases.push('Location');
      aliases.push('Pick-up Location', 'Pick up Location', 'Pickup Location');
    }
    return [...new Set(aliases.filter(Boolean))];
  };
  const required = schema.required;
  const unresolvedRequired = required.filter(field => !schema.suggestedMappings[field] && !columnMapping[field] &&
    schema.candidates.some(item => !item.keys.has(headerKey(field)) && !(schema.renameOptions[field] || []).some(alias => item.keys.has(headerKey(alias)))));
  if (unresolvedRequired.length) throw Error('Missing required workbook column: ' + unresolvedRequired.join(', '));
  const locationMapping = Object.entries(columnMapping).find(([field, source]) =>
    field === 'Location' && isPickupLocationHeader(source));
  const renamedHeaders = headers.map(field => type === 'master' && (
    field === 'Location' || (locationMapping && headerKey(field) === headerKey(locationMapping[1]))
  ) ? 'Location' : (columnMapping[field] || field));
  const outputHeaders = [...new Set([...renamedHeaders, ...includeNewHeaders])];
  const records = [];
  const allowedCompanyKeys = allowedCompanies ? new Set(allowedCompanies.map(companyKey)) : null;
  let skippedCompanyCount = 0;
  for (const item of schema.candidates) {
    const names = item.rows[item.index].map(value => String(value ?? '').trim());
    for (const [index, row] of item.rows.slice(item.index + 1).entries()) {
      if (!row.some(value => value !== '' && value != null)) continue;
      const values = Object.fromEntries(outputHeaders.map(field => {
        const sourceNames = aliasesFor(field);
        const sourceIndexes = sourceNames.map(sourceName => names.findIndex(name => headerKey(name) === headerKey(sourceName))).filter(index => index >= 0);
        const columnIndex = sourceIndexes.find(sourceIndex => row[sourceIndex] != null && String(row[sourceIndex]).trim() !== '') ?? sourceIndexes[0] ?? -1;
        let value = row[columnIndex] ?? '';
        if (field.includes('Date') && typeof value === 'number') value = new Date(Date.UTC(1899, 11, 30) + value * 86400000).toISOString().slice(0, 10);
        return [field, value];
      }));
      if (allowedCompanyKeys && !allowedCompanyKeys.has(companyKey(values.Company))) {
        skippedCompanyCount++;
        continue;
      }
      const record = normalizeRecord(values, outputHeaders);
      if (!record.Company || !record.Portal || !record['Invoice Number']) throw Error('Row ' + (item.index + index + 2) + ' needs Company, Portal and Invoice Number.');
      for (const field of numericFields) if (record[field] != null && (!Number.isFinite(record[field]) || record[field] < 0)) throw Error('Invalid number in ' + field + ' at row ' + (item.index + index + 2) + '.');
      if (type === 'merge' && !['SKU Code', 'ASIN', 'EAN', 'Product Name'].some(field => record[field])) throw Error('Each invoice line needs a SKU, ASIN, EAN or product name.');
      records.push(record);
    }
  }
  if (!records.length) throw Error(allowedCompanyKeys ? 'No shipment rows found for Rayom or Shelfesteem.' : 'No shipment rows found.');
  return { records, headers: outputHeaders, readCount: records.length, skippedCompanyCount, activeCount: type === 'master' ? records.filter(isActive).length : records.length, schemaReview: { newHeaders: schema.newHeaders, missingRequired: schema.missingRequired } };
}

export function filterShipments(
  shipments,
  filters
) {
  const search = String(
    filters?.search || ""
  )
    .trim()
    .toLowerCase();

  return shipments.filter(
    (shipment) => {
      const matchesSearch =
        !search ||
        Object.entries(
          shipment || {}
        ).some(
          ([, value]) =>
            String(
              value ?? ""
            )
              .toLowerCase()
              .includes(search)
        );

      const matchesCompany =
        !filters?.company ||
        String(
          shipment?.Company || ""
        ) ===
        String(
          filters.company
        );

      const matchesStatus =
        !filters?.status ||
        shipmentStatus(
          shipment
        ) ===
        filters.status;

      const matchesDate =
        !filters?.date ||
        String(
          shipment?.[
          "Invoice Date"
          ] || ""
        ) ===
        String(
          filters.date
        );

      return (
        matchesSearch &&
        matchesCompany &&
        matchesStatus &&
        matchesDate
      );
    }
  );
}
