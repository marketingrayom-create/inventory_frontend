export function documentType(name){
 const extension=name.split('.').at(-1).toLowerCase();
 if(extension==='pdf')return {label:'PDF',kind:'pdf'};
 if(['xls','xlsx','xlsm','xlsb','csv'].includes(extension))return {label:'XLS',kind:'excel'};
 if(['doc','docx'].includes(extension))return {label:'DOC',kind:'word'};
 return {label:extension.slice(0,4).toUpperCase()||'FILE',kind:'file'};
}
export default function DocumentIcon({name,folder=false}){
 if(folder)return <span className="document-folder-icon" aria-label="Folder">📁</span>;
 const type=documentType(name);return <span className={`document-type-icon document-type-${type.kind}`} aria-label={`${type.label} file`}>{type.label}</span>;
}
