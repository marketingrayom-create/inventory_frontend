import { useEffect, useState } from 'react';
import Modal from '../common/Modal.jsx';
import { authRequest } from '../../services/authService.js';
import PasswordField from './PasswordField.jsx';
import { pendingPasswordRules } from '../../utils/password.js';
export const roleLabels = { super_admin: 'Super Admin', admin: 'Admin', manager: 'Manager', executive: 'Executive', visitor: 'Visitor' };
export default function UserManagement({ user, onClose, onCreated }) {
  const roles = user.role === 'super_admin' ? ['admin', 'manager', 'executive', 'visitor'] : ['manager', 'executive', 'visitor'];
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try { setUsers((await authRequest('/users')).users); }
    catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function create(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const pending = pendingPasswordRules(values.password);
    if (pending.length) { setError(pending.join('. ') + '.'); setBusy(false); return; }
    try {
      const result = await authRequest('/users', values);
      onCreated(result.user);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function changeRole(id, role) {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await authRequest(`/users/${id}/role`, { role }, 'PATCH');
      setUsers(current => current.map(item => item.id === id ? result.user : item));
      setMessage('Role updated. This user must log in again.');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <Modal title="Manage users" eyebrow="TEAM ACCESS" onClose={onClose} onSubmit={create}
    footer={<button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Create user'}</button>}>
    <div className="portal-fields">
      <p>Create an account for your team member. Share their credentials with them directly.</p>
      <label>Name<input name="name" required maxLength={150} autoComplete="off" /></label>
      <label>Email<input name="email" type="email" required maxLength={254} autoComplete="off" /></label>
      <PasswordField />
      <label>Role<select name="role" defaultValue="executive">{roles.map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <h3>Team members</h3>
      {loading ? <p role="status">Loading users…</p> : !users.length ? <p>No team members yet.</p> : <ul className="team-list">{users.map(member => <li key={member.id}>
        <span><strong>{member.name}</strong><small>{member.email}</small></span>
        <select aria-label={`Role for ${member.name}`} value={member.role} disabled={busy} onChange={event => changeRole(member.id, event.target.value)}>{roles.map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}</select>
      </li>)}</ul>}
    </div>
  </Modal>;
}
