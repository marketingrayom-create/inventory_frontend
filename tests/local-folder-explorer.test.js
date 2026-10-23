import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listLocalDirectory} from '../src/services/localFolderExplorer.js';
function directory(name,entries){return {name,kind:'directory',async *values(){yield* entries;},async getDirectoryHandle(name){const child=entries.find(entry=>entry.kind==='directory'&&entry.name===name);if(!child)throw Error('Folder not found');return child;}};}
test('drive-style browsing opens one level at a time, preserves empty folders, and sorts folders first',async()=>{
 const root=directory('Selected',[{name:'root.txt',kind:'file'},directory('Invoices',[directory('2026',[{name:'bill.pdf',kind:'file'}])]),directory('Empty',[]),directory('.ssh',[{name:'secret',kind:'file'}])]);
 assert.deepEqual((await listLocalDirectory(root)).map(entry=>entry.name),['Empty','Invoices','root.txt']);
 assert.deepEqual((await listLocalDirectory(root,['Invoices'])).map(entry=>entry.name),['2026']);
 assert.deepEqual((await listLocalDirectory(root,['Invoices','2026'])).map(entry=>entry.name),['bill.pdf']);
 assert.deepEqual(await listLocalDirectory(root,['Empty']),[]);
});
test('navigation cannot escape the selected folder or enter protected folders',async()=>{
 const root=directory('Selected',[]);
 for(const part of ['..','.','a/b','a\\b','.ssh','.env'])await assert.rejects(listLocalDirectory(root,[part]),/Invalid folder path/);
});
