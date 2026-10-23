import { money, number } from '../../utils/shipments.js';
export default function StatsCards({ summary }) {
  const cards = [
    ['Active shipments', '↗', number(summary.activeShipments), 'Pending, dispatched & in-transit'],
    ['Units in transit', '▦', number(summary.unitsInTransit), 'Across all active shipments'],
    ['Shipment value', '₹', <><span className="shipment-value-line"><small>Master (all)</small>{money(summary.masterShipmentValue)}</span><span className="shipment-value-line"><small>Merge (all)</small>{money(summary.mergeShipmentValue)}</span></>, 'Both totals include Delivered shipments'],
    ['Connected portals', '◫', number(summary.connectedPortals), 'Your marketplace network'],
  ];
  return <div className="stats">{cards.map(([title, icon, value, note]) => <article key={title}><div className="stat-label">{title}<span>{icon}</span></div><strong>{value}</strong><small>{note}</small></article>)}</div>;
}
