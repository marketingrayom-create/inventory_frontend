import {useEffect,useState} from 'react';
import {apiFetch,API_BASE_URL} from '../services/apiClient.js';
import DocumentIcon from './DocumentIcon.jsx';
import {readExcelPreview,readWordPreview} from '../services/documentPreview.js';
export default function SavedDocumentPreview({file,onClose,canDownload=false}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[sheet,setSheet]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let url;
  async function load(){
   try{
    const extension=file.name.split('.').at(-1).toLowerCase();
    if(file.size>25*1024*1024)throw Error('Preview supports files up to 25 MB. Download the original to open it.');
    if(extension==='doc'){
     const response=await apiFetch(`/documents/files/${file._id}/preview`,{signal:controller.signal});const result=await response.json();if(!response.ok)throw Error(result.message||'Word preview failed.');if(!controller.signal.aborted)setData({kind:'text',text:result.text});return;
    }
    const response=await apiFetch(`/documents/files/${file._id}/view`,{signal:controller.signal});if(!response.ok)throw Error('Saved file could not be loaded.');
    const blob=await response.blob();
    if(['xls','xlsx','xlsm','xlsb','csv'].includes(extension)){
     const sheets=await readExcelPreview(await blob.arrayBuffer());if(!controller.signal.aborted)setData({kind:'excel',sheets});
    }else if(extension==='docx'){
     const [rawHtml,purify]=await Promise.all([readWordPreview(await blob.arrayBuffer()),import('dompurify')]);
     const html=purify.default.sanitize(rawHtml,{FORBID_TAGS:['style','script','iframe','form'],FORBID_ATTR:['style'],ALLOWED_URI_REGEXP:/^(?:data:image\/(?:png|jpeg|gif|webp);base64,|#)/i});if(!controller.signal.aborted)setData({kind:'word',html});
    }else if(extension==='pdf'||['png','jpg','jpeg','gif','webp'].includes(extension)){
     const type=extension==='pdf'?'application/pdf':`image/${extension==='jpg'?'jpeg':extension}`;url=URL.createObjectURL(new Blob([blob],{type}));if(!controller.signal.aborted)setData({kind:extension==='pdf'?'pdf':'image',url});
    }else if(extension==='txt'){const text=await blob.text();if(!controller.signal.aborted)setData({kind:'text',text});}
    else throw Error('Preview is unavailable for this file type. Download the original to open it.');
   }catch(e){if(!controller.signal.aborted)setError(e.message);}
  }
  load();return()=>{controller.abort();if(url)URL.revokeObjectURL(url);};
 },[file._id]);
 const selected=data?.sheets?.[sheet];
 return <div className="document-backdrop"><section className="document-dialog document-preview" role="dialog" aria-modal="true" aria-label="Saved document preview"><header><h2><DocumentIcon name={file.name}/> {file.name}</h2><button className="button secondary" onClick={onClose}>Close</button></header>
  {error?<p className="form-error" role="alert">{error}</p>:!data?<p role="status">Loading saved preview…</p>:data.kind==='pdf'?<iframe title={file.name} src={canDownload ? data.url : data.url+'#toolbar=0&navpanes=0'}/>:data.kind==='image'?<img src={data.url} alt={file.name}/>:data.kind==='text'?<pre className="document-word-preview">{data.text}</pre>:data.kind==='word'?<div className="document-word-preview" dangerouslySetInnerHTML={{__html:data.html}}/>:data.kind==='excel'?<><nav className="document-picker-toolbar" aria-label="Workbook sheets">{data.sheets.map((item,index)=><button key={index} className={`button ${index===sheet?'primary':'secondary'}`} onClick={()=>setSheet(index)}>{item.name}</button>)}</nav><p>Preview shows up to 500 rows and 100 columns per sheet. The original workbook remains saved in the portal.</p><div className="document-excel-preview"><table><tbody>{selected?.rows.map((row,index)=><tr key={index}><th>{index+1}</th>{row.map((cell,column)=><td key={column}>{String(cell)}</td>)}</tr>)}</tbody></table>{!selected?.rows.length&&<p>This sheet is empty.</p>}</div></>:null}
  {canDownload && <a className="button primary" href={`${API_BASE_URL}/documents/files/${file._id}/download`}>Download original</a>}
 </section></div>;
}
