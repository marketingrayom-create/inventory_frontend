import { companyKey } from './importIdentity.js';
const normalized = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

export function companyNames(data) {
  return [
    ...new Set(
      [...(data.companies || []), ...(data.master || []).map(row => row.Company), ...(data.merge || []).map(row => row.Company)].filter(
        (value) =>
          typeof value === 'string' &&
          value.trim()
      )
    ),
  ].sort((a, b) =>
    a.localeCompare(b)
  );
}

export function addCompany(data, value) {
  const name = normalized(value);

  if (!name) {
    throw Error('Enter a company name.');
  }

  if (name.length > 150) {
    throw Error(
      'Company name must be 150 characters or fewer.'
    );
  }

  if (
    companyNames(data).some(
      (company) =>
        normalized(company).toLowerCase() ===
        name.toLowerCase()
    )
  ) {
    throw Error(
      'This company already exists. Select it from the company dropdown.'
    );
  }

  return {
    ...data,

    companies: [
      ...companyNames(data),
      name,
    ],

    selectedCompany: name,
  };
}

export function companyRecords(
  active,
  company
) {
  if (!company) {
    return active;
  }

  return {
    master: active.master.filter(
      (row) => companyKey(row.Company) === companyKey(company)
    ),

    merge: active.merge.filter(
      (row) => companyKey(row.Company) === companyKey(company)
    ),
  };
}