import { API_BASE_URL, apiFetch } from './apiClient.js';
import { readApiResponse } from './apiResponse.js';
export async function getDashboard(companyId = '', signal, page = 1, limit = 2) {
  const response = await apiFetch(`${API_BASE_URL}/dashboard?${new URLSearchParams({ companyId, page, limit })}`, { signal });
  const result = await readApiResponse(response);
  if (!response.ok) throw new Error(result.message || 'Could not load dashboard.');
  return result.data;
}
