import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readApiResponse } from '../src/services/apiResponse.js';

test('rejects a successful Vite HTML fallback instead of treating it as API data', async () => {
  const response = new Response('<!doctype html><html><div id="root"></div></html>', {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
  await assert.rejects(readApiResponse(response), /Check VITE_API_BASE_URL/);
});

test('preserves JSON data and backend error messages', async () => {
  for (const status of [200, 400]) {
    const data = { message: 'Backend message', data: [] };
    assert.deepEqual(await readApiResponse(Response.json(data, { status })), data);
  }
});

test('invalid JSON cannot silently become an empty successful result', async () => {
  await assert.rejects(readApiResponse(new Response('invalid', { status: 502, headers: { 'Content-Type': 'application/json' } })), /invalid JSON \(HTTP 502\)/);
});

test('plain-text proxy failures explain the backend connection problem', async () => {
  await assert.rejects(readApiResponse(new Response('', { status: 500 })), /backend is running on port 5000/);
});
