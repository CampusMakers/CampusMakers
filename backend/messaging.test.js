import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './server.js';

async function setup(t, seller, recipientSeller) {
    const calls = [];
    const server = createApp({ url: 'https://test.invalid', key: 'test', photoStore: null, fetchImpl: async (url, options) => {
        if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'sender', email: seller ? 'sender@school.edu' : 'sender@example.com', email_confirmed_at: 'today', user_metadata: { role: 'seller' } });
        calls.push({ url: new URL(url), options });
        if (url.includes('/messaging_profiles?')) return Response.json([{ id: 'recipient', username: 'recipient', seller_verified: recipientSeller }]);
        if (options.method === 'POST') return Response.json([{ id: 'message', ...JSON.parse(options.body), created_at: 'today' }]);
        return Response.json([]);
    } });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    return { calls, request: (path, method = 'GET', body) => fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }) };
}
for (const [senderSeller, recipientSeller, status] of [[false, false, 403], [false, true, 201], [true, false, 201], [true, true, 201]]) {
    test(`send permissions: seller=${senderSeller}, recipient seller=${recipientSeller}`, async t => {
        const { request, calls } = await setup(t, senderSeller, recipientSeller);
        const result = await request('/messages', 'POST', { recipientUsername: 'recipient', content: ' hello ', sender_id: 'forged' });
        assert.equal(result.status, status);
        const write = calls.find(call => call.options.method === 'POST');
        if (status === 403) assert.equal(write, undefined);
        else assert.deepEqual(JSON.parse(write.options.body), { sender_id: 'sender', recipient_id: 'recipient', content: 'hello' });
    });
}
test('buyer recipient search excludes self and buyers', async t => {
    const { request, calls } = await setup(t, false, true);
    assert.equal((await request('/users?search=maker')).status, 200);
    assert.equal(calls[0].url.searchParams.get('seller_verified'), 'eq.true');
    assert.equal(calls[0].url.searchParams.get('id'), 'neq.sender');
});
test('seller search allows either role', async t => {
    const { request, calls } = await setup(t, true, false);
    await request('/users?search=buyer');
    assert.equal(calls[0].url.searchParams.has('seller_verified'), false);
});
test('thread is scoped to both participants and reports permission', async t => {
    const { request, calls } = await setup(t, false, false);
    const result = await request('/conversations/recipient');
    assert.equal((await result.json()).data.canMessage, false);
    assert.equal(calls[1].url.searchParams.get('or'), '(and(sender_id.eq.sender,recipient_id.eq.recipient),and(sender_id.eq.recipient,recipient_id.eq.sender))');
});
test('read receipts only update incoming messages', async t => {
    const { request, calls } = await setup(t, false, true);
    await request('/conversations/recipient/read', 'PUT');
    assert.equal(calls[1].url.searchParams.get('recipient_id'), 'eq.sender');
    assert.equal(calls[1].url.searchParams.get('sender_id'), 'eq.recipient');
});
test('deletion is scoped to authenticated sender', async t => {
    const { request, calls } = await setup(t, true, true);
    const response = await request('/messages/12345678-1234-1234-1234-123456789012', 'DELETE');
    assert.equal(response.status, 404);
    assert.equal(calls[0].url.searchParams.get('sender_id'), 'eq.sender');
});
test('empty and oversized messages do not write', async t => {
    const { request, calls } = await setup(t, true, true);
    for (const content of ['  ', 'x'.repeat(4001)]) assert.equal((await request('/messages', 'POST', { recipientUsername: 'recipient', content })).status, 400);
    assert.equal(calls.length, 0);
});
