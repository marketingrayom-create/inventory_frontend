export default function CompanySelector({ companies, value, onChange, onAdd, canAdd = false }) {
  return <div className="company-selector">
    <label>Company workspace<select aria-label="Select company" value={value} onChange={event => onChange(event.target.value)}><option value="">All companies</option>{companies.map(company => <option key={company} value={company}>{company.toUpperCase()}</option>)}</select></label>
    <button className="button secondary" disabled={!canAdd} title={canAdd ? 'Add company' : 'Only Admin and Super Admin can add companies'} onClick={onAdd}>＋ Add company</button>
  </div>;
}
