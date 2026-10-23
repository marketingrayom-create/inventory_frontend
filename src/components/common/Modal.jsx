import { useEffect, useId, useRef } from 'react';

export default function Modal({ id, title, eyebrow, onClose, children, onSubmit, footer }) {
  const dialog = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog id={id} ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <form onSubmit={onSubmit}>
      <div className="modal-header"><div><div className="eyebrow">{eyebrow}</div><h2 id={titleId}>{title}</h2></div><button type="button" className="close" aria-label="Close dialog" onClick={onClose}>×</button></div>
      {children}
      <div className="modal-footer"><button type="button" className="button secondary" onClick={onClose}>Cancel</button>{footer}</div>
    </form>
  </dialog>;
}
