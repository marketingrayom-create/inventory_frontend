import { useEffect, useState } from 'react';
import Modal from '../common/Modal.jsx';
import { getShipmentActivity } from '../../services/shipmentService.js';
import { authRequest } from '../../services/authService.js';
const labels = { new_record: 'Added record', excel_update: 'Excel update', manual_edit: 'Manual edit', pod_upload: 'POD upload' };
export default function ActivityHistory({ user, onClose }) {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ rows: [], total: 0 });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { authRequest('/users').then(data => setUsers(data.users)).catch(failure => setError(failure.message)); }, []);
  useEffect(() => {
    let cancelled = false; setBusy(true); setError('');
    getShipmentActivity({ page, userId }).then(data => { if (!cancelled) setResult(data); })
      .catch(failure => { if (!cancelled) setError(failure.message); }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [page, userId]);
  return <Modal title="Activity history" eyebrow="WHO CHANGED WHAT" onClose={onClose} onSubmit={event => event.preventDefault()} footer={null}>
    <div className="portal-fields">
      <label>User<select value={userId} onChange={event => { setUserId(event.target.value); setPage(1); }}><option value="">All users</option>{[user, ...users].map(item => <option key={item.id} value={item.id}>{item.name} ({item.email})</option>)}</select></label>
      <p>History starts when tracking is enabled. User identity is verified by the server.</p>
      {error && <p role="alert" className="form-error">{error}</p>}
      {busy ? <p role="status">Loading activity…</p> : <div className="activity-list">{result.rows.length ? result.rows.map(row => <article key={`${row._id}-${row.eventIndex}`}>
        <strong>{row.history.actor.name} · {labels[row.history.action] || row.history.action}</strong>
        <small>{row.history.actor.email} · {row.history.actor.role} · {new Date(row.history.at).toLocaleString()}</small>
        <p>{row.company} · {row.type} · Invoice {row.invoice}</p>
        <details><summary>{row.history.changes.length} field changes</summary><table><thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>{row.history.changes.map((change, index) => <tr key={index}><td>{change.field}</td><td>{String(change.before ?? '—')}</td><td>{String(change.after ?? '—')}</td></tr>)}</tbody></table></details>
      </article>) : <p>No activity recorded yet.</p>}</div>}
      <div className="page-actions"><button type="button" className="button secondary" disabled={busy || page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button type="button" className="button secondary" disabled={busy || page * 30 >= result.total} onClick={() => setPage(page + 1)}>Next</button></div>
    </div>
  </Modal>;
}
