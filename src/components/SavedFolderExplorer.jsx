import { useEffect, useState } from 'react';
import { apiFetch, API_BASE_URL } from '../services/apiClient.js';
import DocumentIcon from './DocumentIcon.jsx';
import SavedDocumentPreview from './SavedDocumentPreview.jsx';
export default function SavedFolderExplorer({ sources, onIncludeSubfolders, syncTick, canDownload = false, canDownloadFolders = false, canManage = false, onLibraryLoaded }) {
    const [location, setLocation] = useState({ sourceId: null, parts: [] }), [entries, setEntries] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(false), [search, setSearch] = useState(''), [preview, setPreview] = useState(null), [refresh, setRefresh] = useState(0), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(25), [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
    const source = sources.find(source => source._id === location.sourceId);
    const directory = location.parts.join('/');
    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            setLoading(true); setError('');
            try { const query = new URLSearchParams({ page, limit: pageSize, search, ...(source ? { path: directory } : { view: 'folders' }) }); const response = await apiFetch(`${source ? `/documents/sources/${source._id}/browse` : '/documents/'}?${query}`, { signal: controller.signal }); const result = await response.json(); if (!response.ok) throw Error(result.message || 'Saved folder could not be loaded.'); if (!controller.signal.aborted) { setEntries(result.entries); setPagination(result); if (!source) onLibraryLoaded?.(result); if (result.page !== page) setPage(result.page); } }
            catch (e) { if (!controller.signal.aborted) { setEntries([]); setError(e.message); } }
            finally { if (!controller.signal.aborted) setLoading(false); }
        }
        load(); return () => controller.abort();
    }, [source?._id, source?.lastSyncAt, directory, refresh, syncTick, page, pageSize, search]);
    function navigate(sourceId, parts = []) {
        setPage(1); setSearch(''); setError(''); setEntries([]); setLoading(true);
        setLocation({ sourceId, parts });
        // Re-clicking the current breadcrumb must reload after clearing its rows.
        setRefresh(value => value + 1);
    }
    const folderDownload = (sourceId, path = '') => `${API_BASE_URL}/documents/sources/${sourceId}/download?${new URLSearchParams({ path })}`;
    const listing = { entries, total: pagination.total, page, pages: pagination.totalPages, start: pagination.total ? (page - 1) * pageSize + 1 : 0, end: Math.min(page * pageSize, pagination.total) };
    useEffect(() => {
        if (!source) return;
        const controller = new AbortController();
        apiFetch('/documents/?view=folders&page=1&limit=' + pageSize, { signal: controller.signal }).then(async response => { const result = await response.json(); if (!response.ok) throw Error(result.message || 'Could not refresh saved folders.'); if (!controller.signal.aborted) onLibraryLoaded?.(result); }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
        return () => controller.abort();
    }, [Boolean(source), refresh, syncTick, onLibraryLoaded]);
    return <section className="document-library">
        <div className="document-library-header"><h2>Saved folders and files</h2><input aria-label={source ? "Search current folder" : "Search saved folders"} placeholder={source ? "Search this folder…" : "Search saved folders…"} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></div>
        <p>These are synced database copies. Deleting local files does not remove them here. Files must finish syncing before they are available in the portal.</p>
        <nav className="document-picker-toolbar" aria-label="Folder path">
            {source &&
            <button
                className="button secondary"
                    onClick={() => location.parts.length ? navigate(source._id, location.parts.slice(0, -1)) : navigate(null)}> ← Back</button>}

            <button className="button secondary" onClick={() => navigate(null)}>Saved folders</button>{source && <><button className="button secondary" onClick={() => navigate(source._id)}>{source.name}</button>{location.parts.map((part, index) => <button key={index} className="button secondary" onClick={() => navigate(source._id, location.parts.slice(0, index + 1))}>{part}</button>)}

                <button className="button secondary" onClick={() => setRefresh(value => value + 1)}>Refresh folder</button>{canDownloadFolders && <a className="button primary" href={folderDownload(source._id, directory)}>Download this folder (ZIP)</a>}</>}</nav>
        {canManage && source && !source.disconnected && <label className="document-sync-checkbox"><input type="checkbox" checked={source.includeSubfolders === true} onChange={event => onIncludeSubfolders(source._id, event.target.checked)} /> Automatically sync files in all nested subfolders</label>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {loading && !entries.length ? <p role="status">Loading saved folder…</p> : !source ? <ul className="document-picker-list">{listing.entries.map(root => <li key={root._id}><button onClick={() => navigate(root._id)}><DocumentIcon folder /><strong>{root.name}</strong><small>Open saved folder</small></button>{canDownloadFolders && <a className="button secondary" href={folderDownload(root._id)}>Download folder (ZIP)</a>}</li>)}{!listing.total && <li>{search.trim() ? 'No matching saved folders.' : 'Select and sync a folder to save its files here.'}</li>}</ul> : loading && !entries.length ? <p role="status">Loading saved folder…</p> : <div className="document-table-scroll"><table><thead><tr><th>Name</th><th>Type</th><th>Actions</th></tr></thead><tbody>{listing.entries.map(entry => <tr key={`${entry.kind}:${entry.name}`}><td><DocumentIcon name={entry.name} folder={entry.kind === 'directory'} /> {entry.kind === 'directory' ? <button className="button secondary" onClick={() => navigate(source._id, [...location.parts, entry.name])}>{entry.name}</button> : entry.name}</td><td>{entry.kind === 'directory' ? 'Folder' : entry.name.split('.').at(-1).toUpperCase()}</td><td>{entry.kind === 'directory' ? <><button className="button secondary" onClick={() => navigate(source._id, [...location.parts, entry.name])}>Open folder</button> {canDownloadFolders && <a className="button secondary" href={folderDownload(source._id, entry.path)}>Download ZIP</a>}</> : <><button className="button secondary" onClick={() => setPreview(entry)}>View</button> {canDownload && <a className="button secondary" href={`${API_BASE_URL}/documents/files/${entry._id}/download`}>Download</a>}</>}</td></tr>)}</tbody></table>{!listing.total && <p>{search ? 'No matching files or folders.' : 'No saved files here yet. Allow the folder to finish syncing.'}</p>}</div>}
        {!(source && loading && !entries.length) && <nav className="document-pagination" aria-label="Document pagination"><div className="document-page-summary"><label>Rows per page<select aria-label="Rows per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label><span>{listing.start}–{listing.end} of {listing.total} {source ? 'items' : 'folders'}</span></div><div className="document-page-controls"><button className="button secondary" disabled={listing.page === 1} onClick={() => setPage(1)}>First</button><button className="button secondary" disabled={listing.page === 1} onClick={() => setPage(listing.page - 1)}>Previous</button><span aria-live="polite">Page {listing.page} of {listing.pages}</span><button className="button secondary" disabled={listing.page === listing.pages} onClick={() => setPage(listing.page + 1)}>Next</button><button className="button secondary" disabled={listing.page === listing.pages} onClick={() => setPage(listing.pages)}>Last</button></div></nav>}
        {preview && <SavedDocumentPreview canDownload={canDownload} key={preview._id} file={preview} onClose={() => setPreview(null)} />}
    </section>;
}
