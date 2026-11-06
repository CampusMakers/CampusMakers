import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './server.js';
async function request(t, { token, user, status = 200, failure = false } = {}) {
 const server = createApp({ url: 'https://example.supabase.co', key: 'public-test-key', fetchImpl: async (_url, options) => {
  assert.equal(options.headers.Authorization, `Bearer ${token}`);
  if (failure) throw new Error('offline');
  return new Response(JSON.stringify(user), { status });
 } });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 t.after(() => new Promise(resolve => server.close(resolve)));
 return fetch(`http://127.0.0.1:${server.address().port}/api/auth/me`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}
test('rejects missing tokens', async t => assert.equal((await request(t)).status, 401));
test('rejects forged or expired tokens', async t => assert.equal((await request(t, { token: 'forged', status: 401 })).status, 401));
test('rejects unconfirmed email', async t => assert.equal((await request(t, { token: 'token', user: { id: '1', email: 'maker@school.edu' } })).status, 403));
test('does not trust seller role metadata', async t => {
 const response = await request(t, { token: 'token', user: { id: '1', email: 'buyer@example.com', email_confirmed_at: 'today', user_metadata: { role: 'seller' } } });
 assert.equal(response.status, 200);
 assert.equal((await response.json()).data.sellerVerified, false);
});
test('confirmed school email grants seller eligibility', async t => {
 const response = await request(t, { token: 'token', user: { id: '2', email: 'maker@school.edu', email_confirmed_at: 'today', user_metadata: { full_name: 'Maker' } } });
 assert.deepEqual((await response.json()).data, { id: '2', email: 'maker@school.edu', name: 'Maker', username: 'maker', bio: '', image: '', sellerVerified: true });
});
test('fails closed when Supabase is unavailable', async t => assert.equal((await request(t, { token: 'token', failure: true })).status, 503));

async function photoRequest(t, { token = 'token', type = 'image/png', body = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), store = null, path = '/api/photos', method = 'POST' } = {}) {
 const server = createApp({ url: 'https://example.supabase.co', key: 'test', photoStore: store,
  fetchImpl: async () => new Response(JSON.stringify({ id: 'user-1', email: 'buyer@example.com', email_confirmed_at: 'today' })) });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 t.after(() => new Promise(resolve => server.close(resolve)));
 return fetch(`http://127.0.0.1:${server.address().port}${path}`, { method,
  headers: { 'Content-Type': type, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  ...(method === 'POST' ? { body } : {}) });
}
test('photo uploads require authentication', async t => {
 assert.equal((await photoRequest(t, { token: null })).status, 401);
});
test('unconfigured photo storage reports a setup error', async t => {
 assert.equal((await photoRequest(t)).status, 503);
});
test('uploads use the verified account ID and return a cloud URL', async t => {
 const response = await photoRequest(t, { store: { put: async (id, bytes, type) => {
  assert.equal(id, 'user-1'); assert.equal(type, 'image/png'); assert.equal(bytes.length, 8);
  return '/api/photos/user-1/12345678-1234-1234-1234-123456789012';
 } } });
 assert.equal(response.status, 201);
 assert.match((await response.json()).data.url, /^\/api\/photos\/user-1\//);
});
test('rejects a file pretending to be a picture', async t => {
 assert.equal((await photoRequest(t, { store: {}, body: '<script>bad</script>' })).status, 415);
});
test('rejects oversized uploads', async t => {
 assert.equal((await photoRequest(t, { store: {}, body: Buffer.alloc(5 * 1024 * 1024 + 1) })).status, 413);
});
test('serves stored pictures without exposing storage credentials', async t => {
 const response = await photoRequest(t, { method: 'GET', token: null, path: '/api/photos/user-1/12345678-1234-1234-1234-123456789012',
 store: { get: async key => { assert.equal(key, 'user-1/12345678-1234-1234-1234-123456789012'); return { bytes: Buffer.from('photo'), type: 'image/png' }; } } });
 assert.equal(response.status, 200);
 assert.equal(response.headers.get('content-type'), 'image/png');
 assert.equal(await response.text(), 'photo');
});

test('quota rejection returns a clear storage-full response', async t => {
 const { StorageLimitError } = await import('./photos.js');
 const response = await photoRequest(t, { store: { put: async () => { throw new StorageLimitError(); } } });
 assert.equal(response.status, 507);
 assert.match((await response.json()).message, /10 GB/);
});
