import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiFetch, setApiUser } from '../src/services/apiClient.js';

test('API URLs and public auth failures do not trigger session expiry', async () => {
 const previousFetch = globalThis.fetch;
 const previousWindow = globalThis.window;
 const urls = []; const events = [];
 globalThis.fetch = async (url) => { urls.push(url); return new Response('{}', {status:401}); };
 globalThis.window = {dispatchEvent: event => events.push(event.type)};
 try {
  setApiUser(null);
  await apiFetch('/api/auth/setup');
  assert.equal(urls.at(-1), '/api/auth/setup');
  await apiFetch('/auth/setup');
  assert.equal(urls.at(-1), '/api/auth/setup');
  assert.equal(events.length, 0);
  setApiUser({id:'user-1'});
  for (const path of ['setup','register','login','me']) await apiFetch(`/api/auth/${path}?test=1`);
  assert.equal(events.length, 0);
  await apiFetch('/api/dashboard');
  assert.deepEqual(events, ['kuber-session-expired']);
 } finally {globalThis.fetch=previousFetch;globalThis.window=previousWindow;setApiUser(null);}
});
test('revoked folder tokens do not log out a valid session, but expired login still does', async () => {
 const previousFetch=globalThis.fetch,previousWindow=globalThis.window;const events=[];
 globalThis.window={dispatchEvent:event=>events.push(event.type)};
 let body={code:'SYNC_AUTH_INVALID',message:'Reconnect folder'};
 globalThis.fetch=async()=>new Response(JSON.stringify(body),{status:401});
 try{
  setApiUser({id:'owner'});
  const response=await apiFetch('/document-agent/sources/source',{headers:{Authorization:'Bearer token'}});
  assert.deepEqual(events,[]);assert.equal((await response.json()).code,'SYNC_AUTH_INVALID');
  body={message:'Please log in to continue.'};
  await apiFetch('/document-agent/sources/source',{headers:{Authorization:'Bearer token'}});
  assert.deepEqual(events,['kuber-session-expired']);
  events.length=0;body={code:'SYNC_AUTH_INVALID'};
  await apiFetch('/documents');assert.deepEqual(events,['kuber-session-expired']);
 }finally{globalThis.fetch=previousFetch;globalThis.window=previousWindow;setApiUser(null);}
});
