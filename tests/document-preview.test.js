import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readExcelPreview,readWordPreview} from '../src/services/documentPreview.js';
import * as XLSX from 'xlsx';
import {ZipArchive} from '../../Inventory_backend/node_modules/archiver/index.js';
test('Excel preview reads XLS and XLSX workbooks with multiple sheets and caps large previews',async()=>{
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Invoice','Amount'],['A',42]]),'Invoices');XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(Array.from({length:510},(_,i)=>[i])),'Large');
 for(const bookType of ['xlsx','xls']){
  const sheets=await readExcelPreview(XLSX.write(book,{type:'array',bookType}));assert.equal(sheets[0].name,'Invoices');assert.deepEqual(sheets[0].rows,[['Invoice','Amount'],['A','42']]);assert.equal(sheets[1].rows.length,500);
 }
});
test('Word preview extracts formatted content from an actual DOCX ZIP',async()=>{
 const archive=new ZipArchive(),chunks=[];archive.on('data',chunk=>chunks.push(chunk));const finished=new Promise((resolve,reject)=>{archive.on('end',resolve);archive.on('error',reject);});
 archive.append('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',{name:'[Content_Types].xml'});
 archive.append('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',{name:'_rels/.rels'});
 archive.append('<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Saved invoice</w:t></w:r></w:p><w:p><w:r><w:t>Kept after local deletion</w:t></w:r></w:p></w:body></w:document>',{name:'word/document.xml'});
 await archive.finalize();await finished;const buffer=Buffer.concat(chunks);const html=await readWordPreview(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));assert.match(html,/<strong>Saved invoice<\/strong>/);assert.match(html,/Kept after local deletion/);
});
