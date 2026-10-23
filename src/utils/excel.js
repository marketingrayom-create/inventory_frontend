// Local XLSX reader: standard ZIP container + Office Open XML. No network uploads.
export async function readShipmentExcel(file) {
 if(!file.name.toLowerCase().endsWith('.xlsx'))throw Error('Please choose an .xlsx workbook.');
 if(file.size>20*1024*1024)throw Error('Please use a workbook smaller than 20 MB.');
 const buffer=await file.arrayBuffer(), bytes=new Uint8Array(buffer), dv=new DataView(buffer), decoder=new TextDecoder();
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(dv.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0)throw Error('Invalid or encrypted workbook. Save it as a standard .xlsx file.');
 const files=new Map();let offset=dv.getUint32(end+16,true),count=dv.getUint16(end+10,true),expanded=0;
 for(let i=0;i<count;i++){
  if(dv.getUint32(offset,true)!==0x02014b50)throw Error('Invalid workbook ZIP directory.');
  const method=dv.getUint16(offset+10,true),size=dv.getUint32(offset+20,true),uncompressed=dv.getUint32(offset+24,true),nameLength=dv.getUint16(offset+28,true),extra=dv.getUint16(offset+30,true),comment=dv.getUint16(offset+32,true),local=dv.getUint32(offset+42,true),name=decoder.decode(bytes.slice(offset+46,offset+46+nameLength));
  expanded+=uncompressed;if(expanded>80*1024*1024)throw Error('Workbook contents are too large.');
  const start=local+30+dv.getUint16(local+26,true)+dv.getUint16(local+28,true);
  files.set(name,{method,bytes:bytes.slice(start,start+size)});offset+=46+nameLength+extra+comment;
 }
 async function xml(name){const entry=files.get(name);if(!entry)return null;let raw=entry.bytes;if(entry.method===8)raw=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());else if(entry.method!==0)throw Error('Unsupported workbook compression.');const doc=new DOMParser().parseFromString(decoder.decode(raw),'application/xml');if(doc.querySelector('parsererror'))throw Error('Workbook XML is damaged.');return doc;}
 const stringsDoc=await xml('xl/sharedStrings.xml');const strings=stringsDoc?Array.from(stringsDoc.getElementsByTagName('si'),si=>Array.from(si.getElementsByTagName('t'),t=>t.textContent).join('')):[];
 const result=[];
 for(const name of files.keys())if(/^xl\/worksheets\/sheet\d+\.xml$/.test(name)){
  const doc=await xml(name),rows=[];
  for(const row of doc.getElementsByTagName('row')){const cells=[];for(const cell of row.getElementsByTagName('c')){const ref=cell.getAttribute('r')||'A1';let col=0;for(const ch of ref.replace(/\d/g,''))col=col*26+ch.charCodeAt(0)-64;const type=cell.getAttribute('t'),v=cell.getElementsByTagName('v')[0]?.textContent;cells[col-1]=type==='s'?strings[Number(v)]:type==='inlineStr'?Array.from(cell.getElementsByTagName('t'),t=>t.textContent).join(''):v===undefined?'':type==='str'?v:Number.isFinite(Number(v))?Number(v):v;}if(cells.some(v=>v!==''&&v!=null))rows.push(cells);}
  if(rows.length)result.push(rows);
 }
 if(!result.length)throw Error('No worksheet data found.');return result;
};

