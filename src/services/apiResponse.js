export async function readApiResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (response.status >= 500 && !contentType.includes('json')) {
    throw new Error('Cannot reach the backend server. Check that the backend is running on port 5000, then retry.');
  }
  if (contentType.includes('text/html')) {
    throw new Error(
      'The API returned an HTML page instead of JSON. Check VITE_API_BASE_URL in .env: it must point to your backend API, or use a configured API proxy. Restart Vite after changing .env.'
    );
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`The API returned invalid JSON (HTTP ${response.status}). Check the backend response.`);
  }
}
