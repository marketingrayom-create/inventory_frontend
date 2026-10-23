export function paginateDocumentEntries(entries, search, page, pageSize) {
 const query=search.trim().toLocaleLowerCase();
 const filtered=entries.filter(entry=>String(entry.name||'').toLocaleLowerCase().includes(query));
 const size=Math.max(1,Math.floor(Number(pageSize)||25));
 const total=filtered.length,pages=Math.max(1,Math.ceil(total/size));
 const current=Math.min(pages,Math.max(1,Math.floor(Number(page)||1)));
 const offset=(current-1)*size;
 return {entries:filtered.slice(offset,offset+size),total,pages,page:current,start:total?offset+1:0,end:Math.min(offset+size,total)};
}
