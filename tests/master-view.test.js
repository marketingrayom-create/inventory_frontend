import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeRecords, shipmentViewRecords } from '../src/utils/shipments.js';

test('both registers include delivered and flagged invoices with company isolation', () => {
  const delivered = { Company: 'RAYOM BUSINESS CASE PRIVATE LIMITED', Portal: 'Cocoblu', 'Invoice Number': 'INV1', Status: 'Delivered', Remark: 'wrong invoice in software' };
  const pending = { ...delivered, 'Invoice Number': 'INV2', Status: '', Remark: '' };
  const shelf = { ...delivered, Company: 'SHELFESTEEM BRAND LABS PRIVATE LIMITED', Portal: 'Amazon' };
  const data = { master: [delivered, pending, shelf], merge: [delivered, pending, shelf] };
  const active = activeRecords(data);
  assert.deepEqual(shipmentViewRecords(data, active, 'master', 'Rayom'), [delivered, pending]);
  assert.deepEqual(shipmentViewRecords(data, active, 'master', 'Shelfesteem Brand Labs Pvt. Ltd'), [shelf]);
  assert.deepEqual(shipmentViewRecords(data, active, 'master', ''), data.master);
  assert.deepEqual(shipmentViewRecords(data, active, 'merge', 'Rayom'), [delivered, pending]);
  assert.deepEqual(shipmentViewRecords(data, active, 'merge', 'Shelfesteem'), [shelf]);
  assert.deepEqual(shipmentViewRecords(data, active, 'merge', ''), data.merge);
  assert.deepEqual(active.master, [pending]);
});
