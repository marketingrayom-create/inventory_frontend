export default function Sidebar({ screen, view, onNavigate }) {
  return <aside className="sidebar">
    <a className="brand" href="#dashboard" onClick={event => { event.preventDefault(); onNavigate('dashboard'); }}><span>S</span> Kuber ERP<span className="brand-dot">.</span></a>
    <div className="workspace"><span className="avatar">R</span><div><strong>Rayom Business</strong><small>Operations workspace</small></div><span>⌄</span></div>
    <p className="nav-label">WORKSPACE</p>
    <button className={`nav-item ${screen === 'dashboard' ? 'active' : ''}`} id="dashboardNav" onClick={() => onNavigate('dashboard')}>▦ &nbsp; Dashboard</button>
    <div className="nav-heading">▣ <span>Shipments</span><span>⌃</span></div>
    <div className="nav-tree">
      {/* <div className="transit">
        ↗ &nbsp; In-transit inventory
      </div> */}

      <button
        className={`nav-item ${screen === 'shipments' && view === 'master'
            ? 'active'
            : ''
          }`}
        onClick={() => onNavigate('shipments', 'master')}
      >
        Master Shipment
      </button>

      <button
        className={`nav-item ${screen === 'shipments' && view === 'merge'
            ? 'active'
            : ''
          }`}
        onClick={() => onNavigate('shipments', 'merge')}
      >
        Merge invoice excel sheet
      </button>
    </div>
    <button className={`nav-item ${screen === 'documents' ? 'active' : ''}`} onClick={() => onNavigate('documents')}>▤ &nbsp; Documents</button>
    <div className="sidebar-note"><span className="live-dot" /> Everything in motion.<p>Your shipments, all in one place.</p></div>
    <div className="profile"><span className="avatar">RK</span><div><strong>Operations team</strong><small>Local workspace</small></div></div>
  </aside>;
}
