import { useRef } from 'react';
import { portalKey } from '../../utils/importIdentity.js';
import { portalCategory } from '../../utils/shipments.js';
import { excelPortalLabel } from '../../utils/shipmentDisplay.js';

export default function PortalTabs({ view, portalRecords = [], portalCounts = [], rows = [], selected, onChange }) {
  const fallbackCounts = useRef(new Map());
  const sourceLabels = useRef(new Map());
  rows.forEach(row => {
    if (typeof row.Portal === 'string' && row.Portal.trim()) {
      const key = portalKey(row.Portal);
      if (!sourceLabels.current.has(key) || !/^(amazon|flipkart)$/i.test(row.Portal.trim())) sourceLabels.current.set(key, row.Portal);
    }
  });
  const countByPortalId = new Map(portalCounts.map(({ portalId, count }) => [portalId, count]));
  const pageCounts = new Map();
  rows.forEach(row => {
    const key = portalKey(portalCategory(row));
    if (key) pageCounts.set(key, (pageCounts.get(key) || 0) + 1);
  });
  if (selected === 'All portals') {
    portalRecords.forEach(portal => {
      const key = portalKey(portal?.name);
      if (pageCounts.has(key)) fallbackCounts.current.set(`${view}:${portal?._id}`, pageCounts.get(key));
    });
  }
  const visiblePortals = portalRecords.flatMap(portal => {
    const id = String(portal?._id);
    const key = portalKey(portal?.name);
    if (countByPortalId.has(id)) return [{ name: portal.name, count: countByPortalId.get(id) }];
    // Fallback to this sheet's unfiltered page totals, never to another sheet's portals.
    const count = fallbackCounts.current.get(`${view}:${id}`) ?? pageCounts.get(key);
    return count === undefined ? [] : [{ name: portal.name, count }];
  });
  const visibleTotal = visiblePortals.reduce((sum, portal) => sum + portal.count, 0);

  return <nav id="portalTabs" className="portal-tabs" aria-label="Filter by portal">{[
    { name: 'All portals' },
    ...visiblePortals,
  ].map(({ name: portal }) => <button key={portal} data-portal={portal} className={`portal-tab ${selected === portal ? 'active' : ''}`} aria-pressed={selected === portal} onClick={() => onChange(portal)}><span className="portal-icon">{portal === 'All portals' ? '▦' : portal[0]?.toLowerCase()}</span>{excelPortalLabel(portal, [...sourceLabels.current.values()])}</button>)}</nav>;
}
