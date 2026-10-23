import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeRecords, shipmentViewRecords, saveRecord, portalCategory } from '../src/utils/shipments.js';

test('Amazon and MVR invoice lines stay visible and editable after master delivery', () => {
  const amazon = { Company: 'SHELFESTEEM BRAND LABS PRIVATE LIMITED', Portal: 'FBA (AMAZON)', 'Invoice Number': 'INS0419' };
  const mvr = { Company: 'RAYOM BUSINESS CASE PRIVATE LIMITED', Portal: 'RETAILEZ PRIVATE LIMITED (MVR)', 'Invoice Number': 'RBC0001' };
  const data = {
    master: [{ ...amazon, Status: 'Delivered' }, { ...mvr, Status: 'Delivered' }],
    merge: [amazon, mvr].flatMap(row => [1, 2].map(n => ({ ...row, 'SKU Code': `SKU${n}`, Qty: n }))),
  };
  const active = activeRecords(data);
  assert.equal(active.merge.length, 0);
  const shelf = shipmentViewRecords(data, active, 'merge', 'Shelfesteem Brand Labs Pvt. Ltd');
  assert.equal(shelf.length, 2);
  assert.ok(shelf.every(row => portalCategory(row) === 'Amazon'));
  assert.equal(shipmentViewRecords(data, active, 'merge', 'Rayom').length, 2);
  const next = saveRecord(data, 'merge', { ...data.merge[0], Qty: 10 }, 0);
  assert.equal(next.merge[0].Qty, 10);
  assert.equal(next.merge.length, 4);
});
