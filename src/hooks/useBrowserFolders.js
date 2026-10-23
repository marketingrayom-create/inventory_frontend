import {useEffect,useState} from 'react';
import {folderStore,connectBrowserFolder,scanBrowserFolder,staleFolderRecords} from '../services/browserFolderSync.js';
export default function useBrowserFolders(user,canManage,onChange){
 const [folders,setFolders]=useState([]),[status,setStatus]=useState(''),[tick,setTick]=useState(0),[connecting,setConnecting]=useState(false),[pending,setPending]=useState(null);
 useEffect(()=>{
  let active=true;setFolders([]);
  if(user.role==='super_admin')folderStore('list').then(records=>{if(active)setFolders(records.filter(record=>record.userId===user.id));}).catch(e=>{if(active)setStatus(e.message);});
  return ()=>{active=false;};
 },[user.id,user.role]);
 useEffect(()=>{
  if(!canManage||!folders.length){if(!folders.length)setStatus('');return;}
  const controller=new AbortController();let running=false;
  async function scan(){
   if(running)return;running=true;const messages=[];
   try{
    for(const record of folders){
     if(controller.signal.aborted)return;
     if(record.archiveOnly)continue;

     try{
      if(await record.handle.queryPermission({mode:'read'})!=='granted'){messages.push(`${record.handle.name}: click Allow folder access to resume syncing. Saved copies remain available.`);continue;}
      const warning=await scanBrowserFolder(record,{signal:controller.signal,onProgress:progress=>{if(!controller.signal.aborted)setStatus(`${record.handle.name}: ${progress.stage==='reading'?'Reading '+progress.path:progress.stage==='saving'?'Saving '+progress.path+' to database':progress.stage==='uploading'?'Uploading '+progress.path+' · '+(progress.total?Math.min(100,Math.floor(progress.loaded/progress.total*100)):0)+'%':''} · ${progress.syncedFiles} files saved; ${progress.failedFiles} failed. Keep the local folder until Sync complete.`);}});if(!controller.signal.aborted)onChange();if(warning==='Local folder removed — saved copy retained.'){messages.push(`${record.handle.name}: ${warning}`);await forgetSource(record.sourceId);onChange();continue;}messages.push(warning?`${record.handle.name}: sync incomplete. Check source details. Saved copies are retained.`:`${record.handle.name}: Sync complete. Saved files are safe in the portal.`);
     }
     catch(e){
      if(controller.signal.aborted)return;
      if(e.code==='SYNC_AUTH_INVALID'){await forgetSource(record.sourceId);continue;}
      if(e.name==='NotFoundError'){messages.push(`${record.handle.name}: local folder was removed. Previously synced files remain in Saved folders.`);continue;}
      messages.push(`${record.handle.name}: ${e.message}`);if([401,403].includes(e.status))break;
     }
    }
    if(!controller.signal.aborted)setStatus(messages.join(' '));
   }catch(e){if(!controller.signal.aborted)setStatus(e.message);}finally{running=false;}
  }
  const resume=()=>{if(document.visibilityState!=='hidden')scan();};
  scan();const timer=setInterval(scan,15000);window.addEventListener('focus',resume);document.addEventListener('visibilitychange',resume);
  return ()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',resume);};
 },[canManage,folders,tick]);
 async function select(sourceId=null){
  if(!window.isSecureContext){setStatus('Open this site over HTTPS. Plain HTTP on a shared IP cannot open the local folder picker.');return;}
  if(!window.showDirectoryPicker){setStatus('Use desktop Chrome or Edge for automatic folder sync.');return;}
  try{
   const handle=await window.showDirectoryPicker({mode:'read'});
   if(!handle.name||/^[a-z]:[\\/]?$/i.test(handle.name)||/^[\\/]$/.test(handle.name)){setStatus('Select a specific folder inside the drive, instead of the entire drive.');return;}
   setConnecting(true);
   const entries=[];let fileCount=0,folderCount=0;
   for await(const entry of handle.values()){
    if(entry.kind==='directory')folderCount++;else fileCount++;
    if(entries.length<50)entries.push({name:entry.name,kind:entry.kind});
   }
   setPending({handle,entries,fileCount,folderCount,sourceId:typeof sourceId==='string'?sourceId:null});
  }catch(e){if(e.name!=='AbortError')setStatus(e.message);}finally{setConnecting(false);}
 }
 async function confirm(includeSubfolders){
  if(!pending)return;setConnecting(true);
  try{
   const record=await connectBrowserFolder(user.id,pending.handle,includeSubfolders,pending.sourceId);
   setFolders(records=>[...records.filter(folder=>folder.sourceId!==record.sourceId),record]);setPending(null);onChange();
  }catch(e){setStatus(e.message);}finally{setConnecting(false);}
 }
 async function forgetSource(sourceId){
  const record=folders.find(folder=>folder.sourceId===sourceId);
  if(record){const archived={...record,archiveOnly:true,token:null};await folderStore('save',archived);setFolders(records=>records.map(folder=>folder.sourceId===sourceId?archived:folder));}
 }
 async function reconcile(sources,checkedIds){
  const stale=staleFolderRecords(folders,sources,checkedIds);
  if(!stale.length)return;
  await Promise.all(stale.map(record=>folderStore('remove',record.key)));
  const removed=new Set(stale.map(record=>record.sourceId));
  setFolders(records=>records.filter(record=>!removed.has(record.sourceId)));setStatus('');
 }
 async function allow(record){try{if(await record.handle.requestPermission({mode:'read'})==='granted')setTick(value=>value+1);else setStatus('Folder permission was not granted.');}catch(e){setStatus(e.message);}}
 return {folders,status,select,allow,connecting,pending,confirm,cancel:()=>setPending(null),forgetSource,reconcile,syncNow:()=>setTick(value=>value+1)};
}
