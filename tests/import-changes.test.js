import {test} from 'node:test';
import assert from 'node:assert/strict';
import {horizontalChanges} from '../src/utils/importChanges.js';
test('horizontal comparison aligns changed columns and preserves blanks and zero',()=>{
 const sheet=horizontalChanges([
  {row:2,invoiceNumber:'INV1',differences:[{field:'Qty',existing:1,incoming:0},{field:'Status',existing:'Pending',incoming:''}]},
  {row:3,invoiceNumber:'INV2',differences:[{field:'Status',existing:'Pending',incoming:'Delivered'}]},
 ]);
 assert.deepEqual(sheet.fields,['Qty','Status']);
 assert.equal(sheet.rows.length,4);
 assert.equal(sheet.rows[0].Version,'Existing');
 assert.equal(sheet.rows[1].Qty,0);
 assert.equal(sheet.rows[1].Status,'');
 assert.equal(sheet.rows[2].Qty,undefined);
 assert.equal(sheet.rows[3].Status,'Delivered');
});
