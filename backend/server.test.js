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
 assert.deepEqual((await response.json()).data, { id: '2', email: 'maker@school.edu', name: 'Maker', sellerVerified: true });
});
test('fails closed when Supabase is unavailable', async t => assert.equal((await request(t, { token: 'token', failure: true })).status, 503));
