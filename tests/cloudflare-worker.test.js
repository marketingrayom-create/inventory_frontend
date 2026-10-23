import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.js';
test('API routes never fall back to frontend assets when backend is missing', async () => {
  const response = await worker.fetch(new Request('https://app.example/api/auth/me'), {});
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /BACKEND_ORIGIN/);
});
test('proxy preserves cookies, origin, query and response cookies', async t => {
  t.mock.method(globalThis, 'fetch', async (request, options) => {
    assert.equal(request.url, 'https://backend.example/api/auth/me?page=1');
    assert.equal(options.headers.get('cookie'), 'kuber_session=test');
    assert.equal(options.headers.get('origin'), 'https://app.example');
    assert.equal(options.redirect, 'manual');
    return Response.json({ user: { id: '1' } }, { headers: { 'Set-Cookie': 'kuber_session=next; HttpOnly; Secure' } });
  });
  const response = await worker.fetch(new Request('https://app.example/api/auth/me?page=1', { headers: { Cookie: 'kuber_session=test', Origin: 'https://app.example' } }), { BACKEND_ORIGIN: 'https://backend.example' });
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
