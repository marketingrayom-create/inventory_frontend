import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import PodBackup from './PodBackup.jsx';
import { formSections, normalizeRecord, numericFields, shipmentStatus } from '../../utils/shipments.js';

function Field({ name, value, onChange, portals, companies }) {
  const props = { name, value, onChange: event => onChange(name, event.target.value), required: ['Company', 'Portal', 'Invoice Number'].includes(name) };
  let input;
  if (name === 'Company') input = <select {...props}><option value="">Select company</option>{[...new Set([...companies, value].filter(Boolean))].map(company => <option key={company}>{company}</option>)}</select>;
  else if (name === 'Portal') input = <select {...props}><option value="">Select portal</option>{[...new Set([...portals, value].filter(Boolean))].map(portal => <option key={portal}>{portal}</option>)}</select>;
  else if (name === 'Status') input = <select {...props}>{['In-transit', 'Delivered'].map(status => <option key={status}>{status}</option>)}</select>;
  else {
    const type = numericFields.has(name) || typeof value === 'number' ? 'number' : name === 'POD Link' ? 'url' : name.includes('Date') && !['Appointment Date', 'Delivered Date'].includes(name) ? 'date' : 'text';
    input = <input {...props} type={type} min={type === 'number' ? '0' : undefined} step={type === 'number' ? 'any' : undefined} placeholder={name} />;
  }
  return <label>{name}{props.required ? ' *' : ''}{input}</label>;
}

export default function ShipmentForm({ type, headers, record, portals, companies, selectedCompany, selectedPortal, onSave, onClose, onPodSaved }) {
  const [values, setValues] = useState(() => ({ ...Object.fromEntries(headers.map(name => [name, record?.[name] ?? ''])), Company: record?.Company || selectedCompany, Portal: record?.Portal || (selectedPortal === 'All portals' ? '' : selectedPortal), ...(type === 'master' ? { Status: shipmentStatus(record) === 'Delivered' ? 'Delivered' : 'In-transit' } : {}) }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError('');
    try { await onSave(normalizeRecord(values, headers)); } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }
  return <Modal id="recordDialog" title={`${record ? 'Edit' : 'Add'} ${type === 'master' ? 'master shipment' : 'invoice line'}`} eyebrow="IN-TRANSIT INVENTORY" onClose={() => { if (!saving) onClose(); }} onSubmit={submit} footer={<button disabled={saving} className="button primary" type="submit">{saving ? 'Saving…' : 'Save shipment'}</button>}>
    <div id="formFields">{formSections[type].map(([title, start, end]) => <section key={title}><h3 className="field-section">{title}</h3><div className="field-grid">{headers.slice(start, end).map(name => <Field key={name} name={name} value={values[name]} portals={portals} companies={companies} onChange={(field, value) => setValues(previous => ({ ...previous, [field]: value }))} />)}</div></section>)}{headers.length > formSections[type].at(-1)[2] && <section><h3 className="field-section">Additional information</h3><div className="field-grid">{headers.slice(formSections[type].at(-1)[2]).map(name => <Field key={name} name={name} value={values[name]} portals={portals} companies={companies} onChange={(field, value) => setValues(previous => ({ ...previous, [field]: value }))} />)}</div></section>}<p className="form-error" role="alert">{error}</p></div>
    {type === 'master' && <PodBackup record={record} onSaved={onPodSaved} />}
  </Modal>;
}

