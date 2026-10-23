import { API_BASE_URL, apiFetch } from './apiClient.js';
import { readApiResponse } from './apiResponse.js';
export async function authRequest(path, body, method = 'POST') {
  const response = await apiFetch(`${API_BASE_URL}/auth${path}`, {
    cache: 'no-store',
    method: body === undefined ? 'GET' : method,
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const result = await readApiResponse(response);
  if (!response.ok) throw Object.assign(new Error(result.message || 'Account request failed.'), { status: response.status });
  return result;
}
