import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addCompany, companyNames, companyRecords } from '../src/utils/companies.js';

const data = { master: [{ Company: 'Existing Ltd' }], merge: [{ Company: 'Invoice Ltd' }], portals: [] };
test('company dropdown derives existing and imported companies without a registry migration', () => {
  assert.deepEqual(companyNames(data), ['Existing Ltd', 'Invoice Ltd']);
});
test('new company is available without shipments and selected automatically', () => {
  const next = addCompany(data, '  New   Company  ');
  assert.equal(next.selectedCompany, 'New Company');
  assert.ok(companyNames(next).includes('New Company'));
  assert.equal(data.companies, undefined);
});
test('blank and case/whitespace duplicate names are rejected', () => {
  assert.throws(() => addCompany(data, '  '), /Enter a company/);
  assert.throws(() => addCompany(data, ' existing   LTD '), /already exists/);
});
test('selected company scopes both views; all companies restores all data', () => {
  const active = { master: [{ Company: 'A' }, { Company: 'B' }], merge: [{ Company: 'A' }, { Company: 'B' }] };
  assert.equal(companyRecords(active, 'A').master.length, 1);
  assert.equal(companyRecords(active, 'A').merge[0].Company, 'A');
  assert.equal(companyRecords(active, ''), active);
  assert.equal(companyRecords(active, 'New Company').master.length, 0);
});
