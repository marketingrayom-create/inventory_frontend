import { roleLabels } from '../auth/UserManagement.jsx';
import { useEffect, useRef, useState } from 'react';
export default function Header({ screen, user, onLogout, onManageUsers, onActivity }) {
  const [open, setOpen] = useState(false);
  const menu = useRef(null);
  const trigger = useRef(null);
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!menu.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const initials = user.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <header>
    <div className="breadcrumb">Workspace <span>/</span> {screen === 'documents' ? 'Documents' : screen === 'dashboard' ? 'Overview' : 'Shipments'} <span>/</span> <b>{screen === 'documents' ? 'Shared files' : screen === 'dashboard' ? 'Dashboard' : 'In-transit'}</b></div>
    <div className="header-right">
      <span className="user-summary">{user.name}<small>{roleLabels[user.role]}</small></span>
      <div className="account-menu" ref={menu} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
        <button ref={trigger} type="button" className="avatar account-trigger" aria-label="Account options" aria-expanded={open} aria-controls="account-options" onClick={() => setOpen(value => !value)}>{initials}</button>
        {open && <div id="account-options" className="account-dropdown">
          <div className="account-identity"><strong>{user.name}</strong><small>{roleLabels[user.role]}</small></div>
          {onManageUsers && <button type="button" onClick={() => { setOpen(false); onManageUsers(); }}>Create user</button>}
          {onActivity && <button type="button" onClick={() => { setOpen(false); onActivity(); }}>Activity history</button>}
          <button type="button" onClick={() => { setOpen(false); onLogout(); }}>Log out</button>
        </div>}
      </div>
    </div>
  </header>;
}
