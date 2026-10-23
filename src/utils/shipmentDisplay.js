import { portalKey, portalName } from './importIdentity.js';

export function orderLocationColumns(headers) {
  const pickup = headers.find(field => /^(pick\s*[- ]?up|pickup)\s+location$/i.test(field.trim()))
    || headers.find(field => field === 'Location');
  const destination = headers.filter(field => /^destination\s+location$/i.test(field.trim()));
  if (!pickup || !destination.length) return headers;
  const ordered = headers.filter(field => !destination.includes(field));
  ordered.splice(ordered.indexOf(pickup) + 1, 0, ...destination);
  return ordered;
}

export function excelPortalLabel(name, sourceNames = []) {
  const key = portalKey(name);
  if([portalKey('Cocoblu'),portalKey('MVR')].includes(key))return portalName(name);
  const source = sourceNames.find(value => portalKey(value) === key && !/^(amazon|flipkart)$/i.test(value.trim()));
  if (source) return source;
  // Template labels are presentation only. Existing portal IDs and matching stay unchanged.
  if (/^amazon$/i.test(String(name).trim())) return 'FBA (AMAZON)';
  if (/^flipkart$/i.test(String(name).trim())) return 'FBF (FLIPKART)';
  return name;
}
