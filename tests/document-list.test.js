import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paginateDocumentEntries} from '../src/services/documentList.js';
test('search includes saved folder roots and filters all rows before pagination',()=>{
 const entries=Array.from({length:60},(_,i)=>({name:i%2?'Invoice '+i:'Other '+i}));
 const result=paginateDocumentEntries(entries,'  INVOICE  ',2,10);
 assert.equal(result.total,30);
 assert.equal(result.entries.length,10);
 assert.equal(result.entries[0].name,'Invoice 21');
 assert.equal(result.start,11);assert.equal(result.end,20);
});
test('removed rows and empty search results clamp page and show valid counts',()=>{
 const result=paginateDocumentEntries([{name:'Reports'}],'report',8,25);
 assert.equal(result.page,1);assert.equal(result.start,1);assert.equal(result.end,1);
 const empty=paginateDocumentEntries([{name:'Reports'}],'missing',8,25);
 assert.equal(empty.page,1);assert.equal(empty.pages,1);
 assert.equal(empty.start,0);assert.equal(empty.end,0);assert.deepEqual(empty.entries,[]);
});
