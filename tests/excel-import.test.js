import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importRecords, parseWorkbookRows, activeRecords, portalCategory, requiredShipmentHeaders } from '../src/utils/shipments.js';
import { companyRecords } from '../src/utils/companies.js';
const row = { Company: 'RAYOM BUSINESS CASE PRIVATE LIMITED', Portal: 'FBA (AMAZON)', 'Invoice Number': 'INV1', 'PO Number': 'PO1', 'SKU Code': 'SKU1', Qty: 5 };
test('repeat imports update the same line across company and portal aliases', () => {
  const first = importRecords({ master: [], merge: [] }, 'merge', [row, row]);
  const next = importRecords(first.data, 'merge', [{ ...row, Company: 'Rayom', Portal: 'amazon', Qty: 8 }]);
  assert.equal(next.data.merge.length, 1);
  assert.equal(next.data.merge[0].Qty, 8);
  assert.equal(next.added, 0);
});
test('same invoice stays separate across companies, portals, POs and products', () => {
  const rows = [row, { ...row, Company: 'SHELFESTEEM BRAND LABS PRIVATE LIMITED' },
    { ...row, Portal: 'Flipkart' }, { ...row, 'PO Number': 'PO2' }, { ...row, 'SKU Code': 'SKU2' }];
  const result = importRecords({ master: [], merge: [] }, 'merge', rows);
  assert.equal(result.data.merge.length, 5);
  assert.equal(companyRecords(result.data, 'Shelfsteem').merge.length, 1);
  assert.equal(activeRecords(result.data).merge.length, 5);
  assert.equal(portalCategory(row), 'Amazon');
  assert.equal(row.Portal, 'FBA (AMAZON)');
});
test('matching tabs import despite unrelated sheets and title rows', () => {
  const headers = Object.keys(row);
  const sheets = [[['Summary'], ['Other']], [['Title'], headers, Object.values(row)], [headers, Object.values({ ...row, Company: 'Shelfesteem' })]];
  assert.equal(parseWorkbookRows(sheets, 'merge', headers).records.length, 2);
});
test('restricted import accepts only Rayom and Shelfesteem and skips invalid other-company rows', () => {
  const headers = [...new Set([...requiredShipmentHeaders.merge, ...Object.keys(row)])];
  const rows = [row, { ...row, Company: 'SHELFESTEEM BRAND LABS PRIVATE LIMITED' },
    { ...row, Company: 'Kuber Mart Global Hub Pvt. Ltd.', Portal: '', Qty: -1 },
    { ...row, Company: 'BALAJI INCORPORATION' }, { ...row, Company: 'Gleam Laboratories' }];
  const preview = parseWorkbookRows([[headers, ...rows.map(item => headers.map(field => item[field]))]], 'merge', headers, { allowedCompanies: ['Rayom', 'Shelfsteem'] });
  assert.equal(preview.records.length, 2);
  assert.equal(preview.skippedCompanyCount, 3);
  assert.deepEqual(preview.records.map(item => item.Company), [row.Company, 'SHELFESTEEM BRAND LABS PRIVATE LIMITED']);
  assert.throws(() => parseWorkbookRows([[headers, headers.map(field => ({ ...row, Company: 'Other' })[field])]], 'merge', headers, { allowedCompanies: ['Rayom', 'Shelfesteem'] }), /No shipment rows found for Rayom or Shelfesteem/);
});
test('restricted Master import ignores other-company formats and debit-note tabs before column validation', () => {
  const headers = requiredShipmentHeaders.master.map(field => field === 'Location' ? 'Pick-up Location' : field);
  const shipment = company => headers.map(field => ({ ...row, Company: company })[field] ?? '');
  const sheets = [
    [headers, shipment('Rayom')], [headers, shipment('Shelfesteem')],
    [['Company', 'Vendor', 'Invoice Number', 'Invoice Date', 'Parcel'], ['Kuber Mart', 'Kuber Mart', 'K1', '', 4]],
    [['Company', 'Vendor', 'Debit Note', 'Location', 'Status', 'Remark'], ['Rayom', 'Vendor', 'D1', 'Jaipur', 'Delivered', '']],
  ];
  const result = parseWorkbookRows(sheets, 'master', requiredShipmentHeaders.master, { allowedCompanies: ['Rayom', 'Shelfesteem'] });
  assert.equal(result.records.length, 2);
  assert.equal(result.records[0]['Invoice Number'], 'INV1');
  assert.ok(!result.headers.includes('Debit Note'));
});
