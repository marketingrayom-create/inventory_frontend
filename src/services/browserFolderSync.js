import {apiFetch} from './apiClient.js';
const excluded=new Set(['node_modules','.git','$recycle.bin','system volume information','.aws','.ssh','.codex']);
export const skipFolderEntry=name=>excluded.has(name.toLowerCase())||name.startsWith('~$')||/^\.env(?:\.|$)/i.test(name);
async function database(){
 return new Promise((resolve,reject)=>{const req=indexedDB.open('kuber-local-folders',1);req.onupgradeneeded=()=>req.result.createObjectStore('folders',{keyPath:'key'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(Error('Browser storage is unavailable. Allow site storage to remember your folder.'));});
}
export async function folderStore(action,value){
 const db=await database();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('folders',action==='list'?'readonly':'readwrite'),store=tx.objectStore('folders');
  const req=action==='list'?store.getAll():action==='remove'?store.delete(value):store.put(value);
  tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Could not remember folder.'));
 });}finally{db.close();}
}
export async function syncRequest(route,{token,signal,...options}={}){
 const response=await apiFetch(route,{...options,signal,headers:{...options.headers,...(token?{Authorization:`Bearer ${token}`}:{})}});
 const result=await response.json();if(!response.ok)throw Object.assign(Error(result.message||'Folder sync failed.'),{status:response.status,code:result.code});return result;
}
export function staleFolderRecords(records,sources,checkedSourceIds){
 const checked=new Set(checkedSourceIds),active=new Set(sources.map(source=>String(source._id)));
 return records.filter(record=>checked.has(record.sourceId)&&!active.has(record.sourceId));
}
export async function matchingFolderRecord(records,userId,handle){
 for(const record of records){if(record.userId!==userId)continue;try{if(await handle.isSameEntry(record.handle))return record;}catch{/* A deleted directory handle cannot be matched. */}}
 return null;
}
export async function connectBrowserFolder(userId,handle,includeSubfolders=false,sourceId=null){
 if(!handle.name||/^[a-z]:[\\/]?$/i.test(handle.name)||/^[\\/]$/.test(handle.name))throw Error('Select a specific folder inside the drive, instead of the entire drive.');
 if(skipFolderEntry(handle.name))throw Error('Choose a document folder, outside protected locations.');
 if(!sourceId){const previous=await matchingFolderRecord(await folderStore('list'),userId,handle);sourceId=previous?.sourceId||null;}
 const {token,agentId}=await syncRequest('/documents/agents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'browser',name:'This browser'})});
 try{
  const {source}=await syncRequest('/document-agent/sources',{token,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:handle.name,includeSubfolders,...(sourceId?{sourceId}:{})})});
  const record={key:`${userId}:${source._id}`,userId,sourceId:source._id,agentId,token,handle,includeSubfolders};await folderStore('save',record);return record;
 }catch(error){await syncRequest(`/documents/agents/${agentId}`,{method:'DELETE'}).catch(()=>{});throw error;}
}
export async function scanBrowserFolder(record,{signal,request=syncRequest,onProgress=()=>{}}={}){
 const call=(route,options={})=>request(`/document-agent/sources/${record.sourceId}${route}`,{token:record.token,signal,cache:'no-store',...options});
 const {source}=await call('');const errors=[],folders=[];
 let syncedFiles=0,failedFiles=0,localMissing=false,uploadStarted=false;

 const saved=new Map();let hasManifest=false,next;
 do{const result=await call('/manifest'+(next?'?'+new URLSearchParams({after:next}):''));if(!Array.isArray(result.files))break;hasManifest=true;for(const file of result.files)saved.set(file.relativePath,file);next=result.next;}while(next);
 const includeSubfolders=source?source.includeSubfolders===true:record.includeSubfolders===true;
 const activityTimer=setInterval(()=>{if(uploadStarted&&!signal?.aborted)call('/activity',{method:'POST'}).catch(()=>{});},30000);
 async function walk(handle,prefix=''){
  for await(const entry of handle.values()){
   if(signal?.aborted)throw new DOMException('Sync stopped','AbortError');
   if(skipFolderEntry(entry.name))continue;
   const relativePath=prefix+entry.name;
   try{
    if(entry.kind==='directory'){if(folders.length<10000)folders.push(relativePath);if(includeSubfolders)await walk(entry,relativePath+'/');}
    else{
     const file=await entry.getFile();
     if(file.size>1024*1024*1024)throw Error('File exceeds 1 GB');
     const stored=hasManifest?saved.get(relativePath):(await call(`/file?${new URLSearchParams({path:relativePath})}`)).file;
     if(stored&&stored.sourceSize===file.size&&stored.mtimeMs===file.lastModified){syncedFiles++;continue;}
     // Snapshot small/medium files before upload so deleting the local file after
     // this read cannot invalidate the request's body halfway through a transfer.
     if(!uploadStarted){await call('/start',{method:'POST'});uploadStarted=true;}
     onProgress({syncedFiles,failedFiles,path:relativePath,stage:'reading',total:file.size});
     const snapshot=file.size<=64*1024*1024?new Blob([await file.arrayBuffer()],{type:file.type}):file;
     const body=new FormData();body.append('path',relativePath);body.append('mtimeMs',String(file.lastModified));body.append('file',snapshot,entry.name);
     await call('/file',{method:'POST',body,onUploadProgress:progress=>onProgress({syncedFiles,failedFiles,path:relativePath,...progress})});
     syncedFiles++;onProgress({syncedFiles,failedFiles,path:relativePath});
    }
   }catch(error){if(error.name==='AbortError'||[401,403,404,409].includes(error.status))throw error;failedFiles++;onProgress({syncedFiles,failedFiles,path:relativePath});if(errors.length<5)errors.push(`${relativePath}: ${error.message}`);}
  }
 }
 try{await walk(record.handle);}catch(error){if(error.name==='AbortError'||[401,403,404,409].includes(error.status))throw error;if(error.name==='NotFoundError')localMissing=true;else{failedFiles++;errors.push('Local folder unavailable. Previously saved copies are retained.');}}finally{clearInterval(activityTimer);}
 await call('/heartbeat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({error:errors.join('; '),folders,syncedFiles,failedFiles,complete:!localMissing&&failedFiles===0,...(localMissing?{localMissing:true}:{})})});
 return localMissing?'Local folder removed — saved copy retained.':errors.join('; ');
}
