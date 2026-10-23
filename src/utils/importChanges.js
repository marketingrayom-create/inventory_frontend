export function horizontalChanges(changes) {
 const fields=[...new Set(changes.flatMap(change=>change.differences.map(diff=>diff.field)))];
 const identity=['Excel Row','Company','Portal','Invoice Number','SKU / ASIN / EAN','Version'];
 const rows=changes.flatMap(change=>['Existing','Excel'].map(version=>({
  'Excel Row':change.row,Company:change.company,Portal:change.portal,'Invoice Number':change.invoiceNumber,
  'SKU / ASIN / EAN':change.sku,Version:version,
  ...Object.fromEntries(fields.map(field=>{
   const diff=change.differences.find(item=>item.field===field);
   return [field,diff?(version==='Existing'?diff.existing:diff.incoming):undefined];
  })),
 })));
 return {fields,columns:[...identity,...fields],rows};
}
