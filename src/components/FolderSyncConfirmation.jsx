import {useState} from 'react';
export default function FolderSyncConfirmation({folderSync}){
 const [includeSubfolders,setIncludeSubfolders]=useState(true);
 const folder=folderSync.pending;
 if(!folder)return null;
 return <div className="document-backdrop"><section className="document-dialog" role="dialog" aria-modal="true" aria-labelledby="folder-confirm-title">
  <header><h2 id="folder-confirm-title">Sync folder: {folder.handle.name}</h2><button className="button secondary" disabled={folderSync.connecting} onClick={folderSync.cancel}>Cancel</button></header>
  <p>Selected on this computer: <strong>{folder.handle.name}</strong>. Only files inside this selected folder will sync.</p>
  <p>{folder.fileCount} files directly in this folder · {folder.folderCount} subfolders.</p>
  <label><input type="checkbox" checked={includeSubfolders} onChange={event=>setIncludeSubfolders(event.target.checked)}/> Also sync files inside all subfolders</label>
  <p>{includeSubfolders?'This includes every nested folder below the selected folder.':'Only files directly inside the selected folder will sync. Subfolders are excluded.'} To choose a smaller folder, cancel and select it.</p>
  <ul className="document-picker-list">{folder.entries.map(entry=><li key={entry.name}>{entry.kind==='directory'?'📁':'📄'} {entry.name}{entry.kind==='directory'&&!includeSubfolders?' — excluded':''}</li>)}</ul>
  {(folder.fileCount+folder.folderCount)>folder.entries.length&&<p>Showing the first {folder.entries.length} entries.</p>}
  <button className="button primary" disabled={folderSync.connecting} onClick={()=>folderSync.confirm(includeSubfolders)}>{folderSync.connecting?'Connecting…':'Confirm and start sync'}</button>
 </section></div>;
}
