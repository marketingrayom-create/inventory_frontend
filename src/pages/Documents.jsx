import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, API_BASE_URL } from '../services/apiClient.js';
import './Documents.css';
import useBrowserFolders from '../hooks/useBrowserFolders.js';
import FolderSyncConfirmation from '../components/FolderSyncConfirmation.jsx';
import SavedFolderExplorer from '../components/SavedFolderExplorer.jsx';

async function request(path, options = {}) {
  const response = await apiFetch(`/documents${path}`, options);
  const result = await response.json();
  if (!response.ok) throw Error(result.message || 'Document request failed.');
  return result;
}
const formatSize = size => size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;


function OwnerDocuments({ user }) {
  const [state, setState] = useState({ files: [], sources: [], total: 0, limit: 50, canManage: false }), [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [page, setPage] = useState(1), [limit, setLimit] = useState(25), [search, setSearch] = useState(''), [refresh, setRefresh] = useState(0), [preview, setPreview] = useState(null), [notice, setNotice] = useState('');
  const canManage = user.role === 'super_admin' && state.canManage;
  const canDownload = ['super_admin', 'visitor', 'executive'].includes(user.role);
  const folderSync = useBrowserFolders(user, canManage, () => setRefresh(value => value + 1));
  const folderSyncRef = useRef(folderSync); folderSyncRef.current = folderSync;
  const reloadRef = useRef(() => { }), liveRef = useRef(false);
  useEffect(()=>{reloadRef.current=()=>setRefresh(value=>value+1);const timer=setInterval(()=>reloadRef.current(),30000);return()=>clearInterval(timer);},[]);
  const libraryLoaded=useCallback(async result=>{setState(result);setError('');await folderSyncRef.current.reconcile(result.sources,folderSyncRef.current.folders.map(folder=>folder.sourceId));},[]);
  useEffect(() => {
    const controller = new AbortController(); let retryTimer, updateTimer, reader, terminal = false;
    const changed = () => { clearTimeout(updateTimer); updateTimer = setTimeout(() => reloadRef.current(), 300); };
    async function connect() {
      try {
        const response = await apiFetch('/documents/events', { signal: controller.signal, headers: { Accept: 'text/event-stream' } });
        if (response.status === 401 || response.status === 403) { terminal = true; return; }
        if (!response.ok || !response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw Error('Live updates unavailable');
        liveRef.current = true; reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
        while (!controller.signal.aborted) {
          const result = await reader.read(); if (result.done) break;
          buffer += decoder.decode(result.value, { stream: true });
          let boundary;
          while ((boundary = buffer.indexOf('\n\n')) !== -1) {
            const event = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
            if (event.split('\n').includes('event: changed')) changed();
          }
          if (buffer.length > 65536) throw Error('Invalid update stream');
        }
      } catch { /* Reconnect through the authenticated API after a network interruption. */ }
      finally { liveRef.current = false; if (!controller.signal.aborted && !terminal) retryTimer = setTimeout(connect, 5000 + Math.random() * 2000); }
    }
    connect();
    return () => { controller.abort(); reader?.cancel().catch(() => { }); clearTimeout(retryTimer); clearTimeout(updateTimer); liveRef.current = false; };
  }, [user.id]);
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);
  async function action(path, options) {
    setBusy(true); setError('');
    try { const result = await request(path, options); if (result.message) setNotice(result.message); if (options?.method === 'DELETE') { if (path.startsWith('/sources/')) await folderSync.forgetSource(path.split('/')[2]); if (path.startsWith('/agents/')) { for (const source of state.sources.filter(source => String(source.agentId) === path.split('/')[2])) await folderSync.forgetSource(source._id); } } setRefresh(value => value + 1); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function view(file) {
    const supported = /\.(pdf|png|jpe?g|gif|webp|txt|csv)$/i.test(file.name);
    if (!supported || file.size > 25 * 1024 * 1024) { setPreview({ file, url: null }); return; }
    setBusy(true); setError('');
    try { const response = await apiFetch(`/documents/files/${file._id}/view`); if (!response.ok) throw Error('Could not load this document.'); setPreview({ file, url: URL.createObjectURL(await response.blob()) }); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  const downloadUrl = file => `${API_BASE_URL}/documents/files/${file._id}/download`;
  return <div className="documents-page">
    <div className="page-title"><div><div className="eyebrow">SHARED WORKSPACE</div><h1>Documents</h1><p>{canManage ? 'Your saved library is available on every computer. Add new folders from the computer you are using.' : canDownload ? 'View and download files saved by your Super Admin.' : 'View files saved by your Super Admin.'}</p></div><div className="page-actions">
      {/* <button className="button secondary" onClick={() => setRefresh(value => value + 1)}>Refresh</button> */}
      {canManage && <><button className="button primary" disabled={busy || folderSync.connecting} onClick={folderSync.select}>＋ Select my folder</button></>}</div></div>
    {canManage && <div><p role="status">{folderSync.status || 'No installation needed. Select your folder and allow browser access.'}</p>{folderSync.folders.filter(record => !record.archiveOnly).map(record => <button key={record.key} className="button secondary" onClick={() => folderSync.allow(record)}>Allow folder access: {record.handle.name}</button>)}</div>}
    {notice && <p className="document-action-notice" role="status">{notice}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}{busy && <p role="status">Processing…</p>}
    {canManage && <section className="document-sources"><h2>Connected sources</h2><p>Sync uses your selected local folder. Keep this Documents page open for automatic sync. Closing the page stops sync; stored copies remain available.</p>{!state.sources.length && <p>No saved folders yet. Select a folder to upload its files.</p>}{state.sources.map(source => <article key={source._id}><div><strong>{source.name}</strong><small>{source.agentId ? `${source.deviceName || 'My computer'} · ${source.path.replace(/^agent:[^:]+:/, '')}` : `Server source · ${source.path}`}</small><span>{source.localMissing ? 'Local folder removed — saved copy retained' : source.deviceAccessRemoved ? 'Device access removed — sync stopped' : source.disconnected ? 'Disconnected' : source.paused ? 'Paused' : source.agentId ? (!source.lastSyncAt || Date.now() - new Date(source.lastSyncAt).getTime() > 120000 ? source.syncMode === 'browser' ? 'Open Documents on the connected computer' : 'Waiting for device agent' : source.syncMode === 'browser' ? 'Browser folder sync' : 'Background sync on') : 'Server sync on'}{source.lastSyncAt && ` · Last scan ${new Date(source.lastSyncAt).toLocaleString()}`}</span>{(source.localMissing || source.disconnected) && <p className="document-sync-complete" role="status">{source.localMissing ? 'Local folder removed.' : source.deviceAccessRemoved ? 'Device access removed. Sync is stopped.' : 'Folder disconnected.'} Saved files and subfolders remain available below. Connecting again is optional.</p>}{!source.localMissing && !source.disconnected && source.syncState === 'complete' && <p className="document-sync-complete" role="status">✅ Sync complete — {source.syncedFiles || 0} files checked and saved safely. {source.includeSubfolders ? 'Included nested files are saved too. Check Saved folders before removing local copies.' : 'Only direct files were included. Enable nested subfolder sync before deleting the whole local folder.'}</p>}{source.syncInterrupted && <p className="document-sync-pending" role="status">Sync connection is inactive. Previously saved files are retained. Allow folder access on the connected computer to check remaining files.</p>}{!source.localMissing && !source.disconnected && source.syncState === 'syncing' && <p className="document-sync-pending" role="status">⏳ Sync in progress. Keep this page open and do not delete the local folder yet.</p>}{!source.localMissing && !source.disconnected && source.syncState === 'incomplete' && <p className="document-sync-incomplete" role="status">⚠ Sync incomplete — {source.failedFiles || 0} files or folders could not be saved. Restore missing files and sync again before deleting the local folder.</p>}{!source.localMissing && !source.disconnected && source.syncState && <span>{source.syncState === 'complete' ? 'Sync complete — saved copy retained' : source.syncState === 'syncing' ? 'Sync in progress — keep the local folder' : source.syncState === 'incomplete' ? 'Sync incomplete — some files were not saved' : 'Waiting for sync'}{source.syncedFiles > 0 && ` · ${source.syncedFiles} files saved`}{source.failedFiles > 0 && ` · ${source.failedFiles} failed`}</span>}{!source.localMissing && !source.disconnected && source.error && <details className="document-sync-errors"><summary>Sync error details</summary><p className="form-error">{source.error}</p></details>}</div><div className="document-source-actions">{source.disconnected || source.localMissing ? <button className="button secondary" disabled={busy} onClick={() => folderSync.select(source._id)}>Connect again (optional)</button> : <><button className="button secondary" disabled={busy || source.paused} onClick={() => source.syncMode === 'browser' ? folderSync.syncNow() : action(`/sources/${source._id}/sync`, { method: 'POST' })}>Sync now</button><button className="button secondary" disabled={busy} onClick={() => action(`/sources/${source._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paused: !source.paused }) })}>{source.paused ? 'Resume' : 'Pause'}</button>{source.agentId && <button className="button secondary" disabled={busy} onClick={() => action('/agents/' + source.agentId, { method: 'DELETE' })}>Remove device access</button>}<button className="button secondary" disabled={busy} onClick={() => action(`/sources/${source._id}`, { method: 'DELETE' })}>Disconnect</button></>}</div></article>)}</section>}
    <SavedFolderExplorer onLibraryLoaded={libraryLoaded} canDownload={canDownload} canDownloadFolders={user.role === 'super_admin'} canManage={canManage} folders={folderSync.folders} sources={state.sources} onAllow={folderSync.allow} syncTick={refresh} onIncludeSubfolders={async (sourceId, includeSubfolders) => { await action('/sources/' + sourceId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ includeSubfolders }) }); folderSync.syncNow(); }} />
    {folderSync.pending && <FolderSyncConfirmation key={folderSync.pending.handle.name} folderSync={folderSync} />}
    {preview && <div className="document-backdrop"><section className="document-dialog document-preview" role="dialog" aria-modal="true" aria-label="Document preview"><header><h2>{preview.file.name}</h2><button className="button secondary" onClick={() => setPreview(null)}>Close</button></header>{preview.url ? /\.(png|jpe?g|gif|webp)$/i.test(preview.file.name) ? <img src={preview.url} alt={preview.file.name} /> : <iframe src={preview.url} title={preview.file.name} sandbox="" /> : <p>Preview is unavailable for this file type or size. Download it to open.</p>}{canDownload && <a className="button primary" href={downloadUrl(preview.file)}>Download</a>}</section></div>}
  </div>;
}

export default function Documents({ user }) {
  return <OwnerDocuments key={user.id} user={user} />;
}
