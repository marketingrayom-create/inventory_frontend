import {uploadProgressRequest} from './uploadProgress.js';
export const API_BASE_URL = (
  import.meta.env?.VITE_API_BASE_URL || '/api'
).replace(/\/+$/, '');

let authenticatedUserId = null;

export function setApiUser(user) {
  authenticatedUserId = user?.id || null;
}

export async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers);

  if (authenticatedUserId) {
    headers.set('X-User-Id', authenticatedUserId);
  }

  // Relative URL ko backend URL ke saath combine karo
  const finalUrl = /^https?:\/\//i.test(url) || url === API_BASE_URL || url.startsWith(`${API_BASE_URL}/`)
    ? url
    : `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;

  const requestUserId = authenticatedUserId;
  const isPublicAuth = /\/auth\/(login|register|setup|me)\/?$/.test(finalUrl.split('?')[0]);

  const response = options.onUploadProgress ? await uploadProgressRequest(finalUrl,{...options,headers}) : await fetch(finalUrl, {
    ...options,
    headers,
    credentials: 'include',
  });

  // A saved folder token can be revoked independently of the login cookie.
  let folderAuthorizationFailed = false;
  if (response.status === 401 && headers.has('Authorization') && /\/document-agent(?:\/|$)/.test(finalUrl.split('?')[0])) {
    try { folderAuthorizationFailed = (await response.clone().json()).code === 'SYNC_AUTH_INVALID'; }
    catch { /* Unclassified 401 responses still expire the login session. */ }
  }
  if (
    response.status === 401 &&
    requestUserId && requestUserId === authenticatedUserId && !isPublicAuth && !folderAuthorizationFailed
  ) {
    window.dispatchEvent(new Event('kuber-session-expired'));
  }

  return response;
}
