import { useState } from 'react';
import { uploadPod, retryPod, podFileUrl } from '../../services/podService.js';

export default function PodBackup({ record, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function perform(action, success) {
    setBusy(true); setMessage('');
    try { await action(); await onSaved(); setMessage(success); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <section>
    <h3 className="field-section">POD server copy</h3>
    {!record?._id ? <p>Save the shipment first to attach a POD file. Public POD links are backed up automatically.</p> : <>
      {record._pod?.path && <p><a href={podFileUrl(record._pod.path)} target="_blank" rel="noopener noreferrer">Open saved POD</a>{record._pod.previousSource ? ' — copy from an earlier link.' : ' — stored on this server.'}</p>}
      <p>{record._pod?.status === 'failed' ? record._pod.error : ['pending', 'downloading'].includes(record._pod?.status) ? 'Saving the source file to this server…' : 'Upload an image or PDF if the source link requires login. Maximum 10 MB.'}</p>
      <label>Upload POD to server<input disabled={busy} type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" onChange={event => {
        const file = event.target.files[0]; event.target.value = '';
        if (file) perform(() => uploadPod(record._id, file), 'POD saved on the server.');
      }} /></label>
      {record['POD Link'] && <button type="button" className="button secondary" disabled={busy || ['pending', 'downloading'].includes(record._pod?.status)} onClick={() => perform(() => retryPod(record._id), 'Download queued. Status will update automatically.')}>Retry link backup</button>}
      <p role="status">{busy ? 'Saving…' : message}</p>
    </>}
  </section>;
}
