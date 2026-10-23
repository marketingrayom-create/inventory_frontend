import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeRecords, importRecords, saveRecord, shipmentStatus, parseWorkbookRows } from '../src/utils/shipments.js';

const master = { Company: 'Example', Portal: 'Flipkart', 'Invoice Number': 'INV-1', Status: '' };
const line = { ...master, 'SKU Code': 123, ASIN: 'ABC', EAN: 456 };

test('blank status is Pending and delivered records and their lines are excluded', () => {
  assert.equal(shipmentStatus(master), 'Pending');
  const delivered = { ...master, 'Invoice Number': 'INV-2', Status: 'Delivered' };
  assert.deepEqual(activeRecords({ master: [master, delivered], merge: [line, delivered] }), { master: [master], merge: [line] });
});
test('re-import normalizes numeric identifiers and updates instead of duplicating', () => {
  const initial = { master: [master], merge: [line], portals: [] };
  const result = importRecords(initial, 'merge', [{ ...line, 'SKU Code': '123', EAN: '456' }]);
  assert.equal(result.data.merge.length, 1);
  assert.equal(result.updated, 1);
  assert.equal(result.added, 0);
});
test('master edits update linked invoice information without mutating source', () => {
  const initial = { master: [master], merge: [line], portals: [] };
  const result = saveRecord(initial, 'master', { ...master, 'Invoice Number': 'INV-3' }, 0);
  assert.equal(result.merge[0]['Invoice Number'], 'INV-3');
  assert.equal(initial.merge[0]['Invoice Number'], 'INV-1');
});
test('merge records can precede master; duplicate masters are rejected', () => {
  const data = { master: [master], merge: [], portals: [] };
  assert.equal(saveRecord(data, 'merge', { ...line, Company: 'Other' }).merge.length, 1);
  assert.throws(() => saveRecord(data, 'master', master), /already exists/);
});
test('Excel rows preserve blank status and retain unmatched merge lines', () => {
  const headers = ['Company', 'Portal', 'Invoice Number', 'Status', 'SKU Code'];
  const sheets = [[headers, ['Example', 'Flipkart', 'INV-1', '', 'SKU1'], ['Other', 'Flipkart', 'INV-2', '', 'SKU2']]];
  const parsed = parseWorkbookRows(sheets, 'merge', headers, [master]);
  assert.equal(parsed.readCount, 2);
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.records[0].Status, '');
  assert.throws(() => parseWorkbookRows([[['Company'], ['Example']]], 'master', headers, []), /Columns missing/);
});
