import {skipFolderEntry} from './browserFolderSync.js';
export async function listLocalDirectory(root,parts=[]){
 let handle=root;
 for(const part of parts){
  if(!part||part==='.'||part==='..'||/[\\/]/.test(part)||skipFolderEntry(part))throw Error('Invalid folder path.');
  handle=await handle.getDirectoryHandle(part);
 }
 const entries=[];
 for await(const entry of handle.values()){
  if(skipFolderEntry(entry.name))continue;
  entries.push({name:entry.name,kind:entry.kind,handle:entry});
 }
 return entries.sort((a,b)=>(a.kind===b.kind?0:a.kind==='directory'?-1:1)||a.name.localeCompare(b.name,undefined,{numeric:true}));
}
