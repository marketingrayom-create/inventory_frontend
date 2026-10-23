export async function readExcelPreview(arrayBuffer){
 const XLSX=await import('xlsx');
 const workbook=XLSX.read(arrayBuffer,{type:'array',sheetRows:501,cellHTML:false,cellFormula:false});
 return workbook.SheetNames.map(name=>({name,rows:XLSX.utils.sheet_to_json(workbook.Sheets[name],{header:1,defval:'',raw:false}).slice(0,500).map(row=>row.slice(0,100))}));
}
export async function readWordPreview(arrayBuffer){
 const imported=await import('mammoth/mammoth.browser.js');
 const result=await (imported.default||imported).convertToHtml({arrayBuffer});
 return result.value;
}
