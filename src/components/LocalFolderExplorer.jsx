import {useEffect,useState} from 'react';
import {listLocalDirectory} from '../services/localFolderExplorer.js';
export default function LocalFolderExplorer({folders,sources,onIncludeSubfolders,onAllow,syncTick}){
 const [location,setLocation]=useState({sourceId:null,parts:[]}),[entries,setEntries]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(false),[search,setSearch]=useState(''),[preview,setPreview]=useState(null),[refresh,setRefresh]=useState(0);
 const source=sources.find(source=>source._id===location.sourceId);
 const record=folders.find(folder=>folder.sourceId===location.sourceId);
 useEffect(()=>{
  let active=true;
  async function load(){
   if(!record||!source){setEntries([]);return;}
   setLoading(true);setError('');
   try{
    if(await record.handle.queryPermission({mode:'read'})!=='granted')throw Error('Click Allow folder access to browse this folder.');
    const listing=await listLocalDirectory(record.handle,location.parts);if(active)setEntries(listing);
   }catch(e){if(active){setEntries([]);setError(e.message);}}
   finally{if(active)setLoading(false);}
  }
  load();const timer=setInterval(load,30000);return()=>{active=false;clearInterval(timer);};
 },[record,source,location,refresh,syncTick]);
 useEffect(()=>()=>{if(preview?.url)URL.revokeObjectURL(preview.url);},[preview]);
 function navigate(sourceId,parts=[]){setSearch('');setError('');setLocation({sourceId,parts});}
 async function openFile(entry){
  try{const file=await entry.handle.getFile();const url=URL.createObjectURL(file);setPreview({name:file.name,size:file.size,url});}catch(e){setError(e.message);}
 }
 async function download(entry){
  try{const file=await entry.handle.getFile(),url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(e.message);}
 }
 const roots=sources.filter(source=>folders.some(folder=>folder.sourceId===source._id));
 const filtered=entries.filter(entry=>entry.name.toLowerCase().includes(search.toLowerCase()));
 return <section className="document-library">
  <div className="document-library-header"><h2>Folders and files on this computer</h2><input aria-label="Search current folder" placeholder="Search this folder…" value={search} onChange={event=>setSearch(event.target.value)}/></div>
  <nav className="document-picker-toolbar" aria-label="Folder path"><button className="button secondary" onClick={()=>navigate(null)}>Connected folders</button>{source&&<><button className="button secondary" onClick={()=>navigate(source._id)}>{source.name}</button>{location.parts.map((part,index)=><button key={index} className="button secondary" onClick={()=>navigate(source._id,location.parts.slice(0,index+1))}>{part}</button>)}<button className="button secondary" onClick={()=>location.parts.length?navigate(source._id,location.parts.slice(0,-1)):navigate(null)}>↑ Up</button><button className="button secondary" onClick={()=>setRefresh(value=>value+1)}>Refresh folder</button></>}</nav>
  {source&&<label className="document-sync-checkbox"><input type="checkbox" checked={source.includeSubfolders===true} onChange={event=>onIncludeSubfolders(source._id,event.target.checked)}/> Automatically sync files in all nested subfolders</label>}
  {source && <p>You can open every subfolder. This checkbox controls automatic upload of nested files.</p>}
  {error&&<p className="form-error" role="alert">{error}</p>}
  {record&&<button className="button secondary" onClick={()=>onAllow(record)}>Allow folder access</button>}
  {!source?<ul className="document-picker-list">{roots.map(root=><li key={root._id}><button onClick={()=>navigate(root._id)}><span>📁</span><strong>{root.name}</strong><small>Open folder</small></button></li>)}{!roots.length&&<li>Select your folder to start browsing.</li>}</ul>:loading?<p role="status">Loading folder…</p>:<div className="document-table-scroll"><table><thead><tr><th>Name</th><th>Type</th><th>Actions</th></tr></thead><tbody>{filtered.map(entry=><tr key={entry.name}><td>{entry.kind==='directory'?'📁':'📄'} {entry.kind==='directory'?<button className="button secondary" onClick={()=>navigate(source._id,[...location.parts,entry.name])}>{entry.name}</button>:entry.name}</td><td>{entry.kind==='directory'?'Folder':'File'}</td><td>{entry.kind==='directory'?<button className="button secondary" onClick={()=>navigate(source._id,[...location.parts,entry.name])}>Open folder</button>:<><button className="button secondary" onClick={()=>openFile(entry)}>View</button> <button className="button secondary" onClick={()=>download(entry)}>Download</button></>}</td></tr>)}</tbody></table>{!filtered.length&&<p>{search?'No matching files or folders.':'This folder is empty.'}</p>}</div>}
  {preview&&<div className="document-backdrop"><section className="document-dialog document-preview" role="dialog" aria-modal="true" aria-label="Local file preview"><header><h2>{preview.name}</h2><button className="button secondary" onClick={()=>setPreview(null)}>Close</button></header>{preview.size<=25*1024*1024&&/\.(pdf|png|jpe?g|gif|webp|txt|csv)$/i.test(preview.name)?/\.(png|jpe?g|gif|webp)$/i.test(preview.name)?<img src={preview.url} alt={preview.name}/>:<iframe title={preview.name} src={preview.url} sandbox=""/>:<p>Download this file to open it.</p>}<a className="button primary" href={preview.url} download={preview.name}>Download</a></section></div>}
 </section>;
}
