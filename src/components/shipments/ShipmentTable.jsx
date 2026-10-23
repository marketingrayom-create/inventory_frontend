import { formatDateDisplay, money, shipmentStatus } from '../../utils/shipments.js';
import { portalKey } from '../../utils/importIdentity.js';
import { podFileUrl } from '../../services/podService.js';

export default function ShipmentTable({ headers, rows, view, totals = {}, onEdit, showMasterStatus = false, canEdit = false }) {
  console.log(canEdit,"canEditcanEdit");
  
  const showActions = view !== 'merge';
  return <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable shipment table"><table><thead><tr>{headers.map(field => <th key={field}>{field}</th>)}{showMasterStatus && <th>Master Status</th>}{showActions && <th>Action</th>}</tr><tr className="totals-row"><th>TOTAL</th>{headers.slice(1).map(field => <th key={field}>{totals[field] == null ? '' : /Amount|Value|Cost/.test(field) ? money(totals[field]) : new Intl.NumberFormat('en-IN').format(totals[field])}</th>)}{showMasterStatus && <th />}{showActions && <th />}</tr></thead><tbody>{rows.length ? rows.map(({ record, index }) => <tr key={index}>{headers.map(field => {
    const raw = field === 'Pickup Location' ? (record[field] ?? record.Location) : record[field];
    const portal = portalKey(record.Portal);
    const vendorPortal = portal.includes('cocoblu') || portal.includes('mvr') || portal.includes('retailez');
    if (record['Import Source']!=='Invoice PDF' && field === 'Uploaded in Vendor Central' && vendorPortal && (raw == null || String(raw).trim() === '' || String(raw).trim() === '-')) {
      return <td key={field} title="Vendor Central update is blank"><span className="vendor-update-blink">Not Uploaded</span></td>;
    }
    if (field === 'POD Link' && record._pod?.path) return <td key={field} title={raw || 'Saved POD'}><a href={podFileUrl(record._pod.path)} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>{record._pod.previousSource ? 'View previous saved POD' : 'View saved POD'}</a>{record._pod.status === 'failed' && <small style={{ display: 'block' }}>New link not backed up. View / edit to upload.</small>}</td>;
    const value = raw == null || String(raw).trim() === '' ? '-' : field.endsWith('Date') ? formatDateDisplay(raw) : /Amount|Value|Cost/.test(field) ? money(raw) : raw;
    let href = null;
    if (field === 'Invoice Link' && typeof raw === 'string' && /^\/uploads\/invoices\/[a-f0-9]{64}\.pdf$/.test(raw)) href = podFileUrl(raw);
    if (typeof raw === 'string' && /^https?:\/\//i.test(raw.trim())) {
      try { href = new URL(raw.trim()).href; } catch { /* Keep malformed links as text. */ }
    }
    return <td key={field} title={String(value)}>{field === 'Status' ? <span className="pill">{raw==null||String(raw).trim()===''||raw==='-'?'-':shipmentStatus(record)}</span> : href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent, #2563eb)', textDecoration: 'underline' }}>{field === 'POD Link' ? 'Open original POD' : field === 'Invoice Link' ? 'View invoice' : value}</a> : value}{field === 'POD Link' && record._pod?.status && <small style={{ display: 'block' }}>{record._pod.status === 'failed' ? 'Not backed up — View / edit to upload' : ['pending', 'downloading'].includes(record._pod.status) ? 'Saving server copy…' : ''}</small>}</td>;
  })}{showMasterStatus && <td><span className="pill">{record['Import Source']==='Invoice PDF'?'-':record._masterStatus || '-'}</span></td>}{showActions && <td><button className="edit" disabled={!canEdit} title={canEdit ? "View / edit" : "Your role cannot edit existing records"} onClick={() => onEdit(index)}>View / edit</button></td>}</tr>) : <tr><td colSpan={headers.length + (showMasterStatus ? 1 : 0) + (showActions ? 1 : 0)} className="empty-table-cell">No shipments here yet. Try another filter.</td></tr>}</tbody></table></div>;
}

