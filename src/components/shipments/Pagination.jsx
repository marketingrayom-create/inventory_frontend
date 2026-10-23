export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, label }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, index) => start + index);
  return <footer className="pagination"><span id="resultCount">Showing {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total} {label}</span><div><label>Rows per page <select value={pageSize} onChange={event => onPageSizeChange(Number(event.target.value))}>{[5, 10, 25, 50, 100].map(size => <option key={size}>{size}</option>)}</select></label><div id="pages"><button disabled={page === 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">‹</button>{numbers.map(value => <button key={value} className={page === value ? 'active' : ''} aria-label={`Page ${value}`} aria-current={page === value ? 'page' : undefined} onClick={() => onPageChange(value)}>{value}</button>)}<button disabled={page === pages} onClick={() => onPageChange(page + 1)} aria-label="Next page">›</button></div></div></footer>;
}
