import { apiFetch, API_BASE_URL } from './apiClient.js';
import { readApiResponse } from './apiResponse.js';

export const podFileUrl = path => new URL(path, new URL(API_BASE_URL, window.location.origin)).href;
async function send(path, options) {
  const response = await apiFetch(`${API_BASE_URL}/shipment-records${path}`, options);
  const result = await readApiResponse(response);
  if (!response.ok) throw new Error(result.message || 'POD backup failed.');
  return result;
}
export function uploadPod(id, file) {
  const body = new FormData(); body.append('pod', file);
  return send(`/${encodeURIComponent(id)}/pod`, { method: 'POST', body });
}
export const retryPod = id => send(`/${encodeURIComponent(id)}/pod/retry`, { method: 'POST' });
