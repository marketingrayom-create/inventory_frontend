import { useEffect, useState } from 'react';
import Modal from '../common/Modal.jsx';
import { readShipmentExcel } from '../../utils/excel.js';
import { detectWorkbookType, inspectWorkbookColumns, parseWorkbookRows, requiredShipmentHeaders } from '../../utils/shipments.js';
import { downloadExcel } from '../../utils/exportExcel.js';
import { getShipmentRecords } from '../../services/shipmentService.js';
import { horizontalChanges } from '../../utils/importChanges.js';

// Start a fresh upload-history generation after changing the column detection flow.
// Earlier development imports should not make a user's first real upload look like a re-upload.
const allowedCompanies = ['Rayom', 'Shelfesteem'];
const IMPORTED_WORKBOOKS_KEY = 'Kuber-imported-workbook-names-v2';
function workbookIdentity(file, type) {
  return `${type}:${file.name.normalize('NFKC').trim().toLowerCase()}`;
}
function hasImportedWorkbook(identity) {
  try { return (JSON.parse(localStorage.getItem(IMPORTED_WORKBOOKS_KEY)) || []).includes(identity); }
  catch { return false; }
}
function rememberImportedWorkbook(identity) {
  if (!identity) return;
  try {
    const remembered = JSON.parse(localStorage.getItem(IMPORTED_WORKBOOKS_KEY)) || [];
    if (!remembered.includes(identity)) localStorage.setItem(IMPORTED_WORKBOOKS_KEY, JSON.stringify([...remembered, identity]));
  } catch {
    /* Import still succeeds if browser storage is unavailable. */
}
}

export default function ExcelUploadModal({ initialType, headers, columnMappings = {}, master, onPreview, onImport, onClose, onSchemaApproved, newOnly = false }) {
  const [type, setType] = useState(initialType);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [changes, setChanges] = useState([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [error, setError] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [columnReview, setColumnReview] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [approvedNewHeaders, setApprovedNewHeaders] = useState([]);
  const [initialSchemaApproval, setInitialSchemaApproval] = useState(null);
  const [workbookKey, setWorkbookKey] = useState('');
  useEffect(() => {
    let cancelled = false;
    setPreview(null); setChanges([]); setMatchedCount(0); setError(''); setColumnReview(null); setColumnMapping({}); setApprovedNewHeaders([]); setWorkbook(null); setInitialSchemaApproval(null); setWorkbookKey(''); setBusy(Boolean(file));
    if (file) readShipmentExcel(file)
      .then(async sheets => {
        if (cancelled) return;
        const detectedType = detectWorkbookType(sheets);
        if (detectedType && detectedType !== type) {
          setType(detectedType);
          return;
        }
        const identity = workbookIdentity(file, type);
        setWorkbookKey(identity);
        let freshDatabase = false;
        try {
          const existing = await getShipmentRecords({ page: 1, limit: 1, type });
          if (cancelled) return;
          freshDatabase = Number(existing.pagination?.total || 0) === 0;
        } catch {
          // Continue using the saved schema if the database count cannot be checked.
        }
        const freshSchema = freshDatabase ? requiredShipmentHeaders[type] : headers[type];
        const acceptedMappings = freshDatabase ? {} : (columnMappings[type] || {});
        const review = inspectWorkbookColumns(sheets, type, freshSchema, acceptedMappings, { allowedCompanies });
        setWorkbook(sheets);
        if (!hasImportedWorkbook(identity) || freshDatabase) {
          const automaticMapping = { ...review.suggestedMappings };
          for (const field of review.renameTargets) {
            if (!automaticMapping[field] && review.renameOptions[field]?.length) automaticMapping[field] = review.renameOptions[field][0];
          }
          const additions = review.newHeaders;
          const firstImport = parseWorkbookRows(sheets, type, freshSchema, { columnMapping: automaticMapping, includeNewHeaders: additions, acceptedMappings, allowedCompanies });
          setPreview(firstImport);
          setInitialSchemaApproval({ columnMapping: automaticMapping, additions, reset: freshDatabase });
        } else if (review.newHeaders.length || review.renameTargets.length) setColumnReview(review);
        else setPreview(parseWorkbookRows(sheets, type, headers[type], { acceptedMappings, allowedCompanies }));
      })
      .catch(failure => { if (!cancelled) setError(failure.message); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [file, type, master]);
  function changeType(value) { setPreview(null); setChanges([]); setMatchedCount(0); setType(value); }
  async function submit(event) {
    event.preventDefault();
    if (busy || importing) return;
    setImporting(true); setError('');
    try {
      let ready = preview;
      if (columnReview && !ready) {
        const effectiveMapping = { ...columnReview.suggestedMappings, ...columnMapping };
        ready = parseWorkbookRows(workbook, type, headers[type], { columnMapping: effectiveMapping, includeNewHeaders: approvedNewHeaders, acceptedMappings: columnMappings[type] || {}, allowedCompanies });
        onSchemaApproved?.(type, { columnMapping: effectiveMapping, additions: approvedNewHeaders });
        setPreview(ready);
        setColumnReview(null);
      }
      if (!ready) return;
      const approvalAfterImport = initialSchemaApproval;
      const result = await onPreview(type, ready.records, newOnly);
      if (!newOnly && result.matchedCount > 0) { setChanges(result.changes || []); setMatchedCount(result.matchedCount); return; }
      await onImport(type, ready.records, newOnly);
      if (approvalAfterImport) { onSchemaApproved?.(type, approvalAfterImport); setInitialSchemaApproval(null); }
      rememberImportedWorkbook(workbookKey);
    }
    catch (failure) { setError(failure.message); }
    finally { setImporting(false); }
  }
  const changeSheet = horizontalChanges(changes);
  const downloadChanges = () => downloadExcel('shipment-import-changes.xlsx', 'Changed Fields', changeSheet.columns, changeSheet.rows);
  return <Modal
    id="uploadDialog"
    title={matchedCount ? 'Confirm existing record updates' : newOnly ? 'New upload — add new records only' : 'Upload Excel — add or update'}
    eyebrow="IMPORT YOUR WORKBOOK"
    onClose={() => { if (!importing) onClose(); }}
    onSubmit={submit}
    footer={<>
      {matchedCount > 0 && <>
        {changes.length > 0 && <button className="button secondary" type="button" onClick={downloadChanges}>Download changes Excel</button>}
        <button className="button primary" type="button" disabled={importing} onClick={async () => { setImporting(true); setError(''); try { await onImport(type, preview.records); if (initialSchemaApproval) { onSchemaApproved?.(type, initialSchemaApproval); setInitialSchemaApproval(null); } rememberImportedWorkbook(workbookKey); } catch (failure) { setError(failure.message); } finally { setImporting(false); } }}>Update records</button>
      </>}
      <button className="button primary" type="submit" disabled={(!preview && !columnReview) || busy || importing || matchedCount > 0}>{importing ? 'Importing…' : matchedCount ? 'Review updates above' : columnReview ? 'Approve columns & import' : 'Import records'}</button>
    </>}
  >
    <div className="portal-fields">
      <p>{newOnly ? 'Only new records will be added. Existing records are skipped and remain unchanged, even if the workbook contains different values. No old data is deleted.' : 'New records are added and matching records can be updated after review. No old data is deleted.'}</p>
      <label>Sheet type<select disabled={importing} value={type} onChange={event => changeType(event.target.value)}><option value="master">Master Shipment (25 fields)</option><option value="merge">Merge Invoice Excel Sheet</option></select></label>
      <label className="upload-zone">Choose Excel workbook<input disabled={importing} type="file" accept=".xlsx" required onChange={event => { setPreview(null); setChanges([]); setMatchedCount(0); setFile(event.target.files[0] || null); }} /></label>
      <p>Only Rayom and Shelfesteem rows are imported. Other companies are skipped.</p>
      <p>Merge can be imported before Master. Blank status means Pending. Delivered master shipments and their invoice lines stay out of the in-transit list. Missing portals are created for the matching company.</p>
      <div id="importPreview" role="status">{busy ? 'Reading workbook…' : preview ? `${preview.readCount} rows ready across ${new Set(preview.records.map(row => row.Company)).size} companies. ${preview.skippedCompanyCount || 0} rows from other companies skipped. Original column values are preserved.` : columnReview ? 'Workbook columns found. Review the requested changes below.' : ''}</div>
      {columnReview && <div className="import-changes column-review">
        <h3>Review workbook columns</h3>
        <p>Approve new columns to add them to the table and form. Map missing required columns to renamed Excel columns.</p>
        {columnReview.newHeaders.filter(name => !Object.values(columnMapping).includes(name)).length > 0 && <section>
          <strong>New columns</strong>
          {columnReview.newHeaders.filter(name => !Object.values(columnMapping).includes(name)).map(name => <label className="column-choice" key={name}><input type="checkbox" checked={approvedNewHeaders.includes(name)} onChange={event => setApprovedNewHeaders(previous => event.target.checked ? [...previous, name] : previous.filter(item => item !== name))} /> Add “{name}”</label>)}
        </section>}
        {columnReview.renameTargets.length > 0 && <section>
          <strong>Rename existing columns</strong>
          {columnReview.renameTargets.map(field => <label key={field}>{field} → <select value={columnMapping[field] || ''} onChange={event => setColumnMapping(previous => ({ ...previous, [field]: event.target.value }))}><option value="">Choose renamed Excel column</option>{(columnReview.renameOptions[field] || []).filter(name => !Object.values(columnMapping).includes(name) || columnMapping[field] === name).map(name => <option key={name} value={name}>{name}</option>)}</select></label>)}
        </section>}
      </div>}
      {matchedCount > 0 && <div className="import-changes">
        <p>{matchedCount} row(s) already exist and will be updated. {type === 'merge' ? 'Changed and newly filled fields are listed below.' : 'Changed fields with existing nonblank values are listed below; blank existing fields are omitted.'}</p>
        {changes.length > 0 ? <><p>Each record has two rows: Existing and Excel. Changed fields run across the columns.</p><div className="import-changes-scroll" tabIndex={0} role="region" aria-label="Excel changes comparison"><table className="horizontal-changes"><thead><tr>{changeSheet.columns.map(field=><th key={field}>{field}</th>)}</tr></thead><tbody>{changeSheet.rows.map((row,index)=><tr key={index} className={row.Version==='Excel'?'incoming-change':''}>{changeSheet.columns.map(field=><td key={field}>{row[field]===undefined?'—':row[field]===null||row[field]===''?'(blank)':String(row[field])}</td>)}</tr>)}</tbody></table></div></> : <p>No field changes found.</p>}
      </div>}
      <p className="form-error" role="alert">{error}</p>
    </div>
  </Modal>;
}
