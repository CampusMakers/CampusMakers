import test from 'node:test';
import assert from 'node:assert/strict';
import { withAvailableUsername, USERNAME_TAKEN } from '../src/services/usernames.js';

test('taken usernames block the auth write', async () => {
    let saved = false;
    await assert.rejects(withAvailableUsername({ rpc: async () => ({ data: false }) }, 'maker', async () => { saved = true; }), { message: USERNAME_TAKEN });
    assert.equal(saved, false);
});

test('available username saves successfully', async () => {
    const result = { data: { user: { id: 'one' } }, error: null };
    const client = { rpc: async (name, args) => {
        assert.equal(name, 'username_available');
        assert.deepEqual(args, { candidate: 'maker' });
        return { data: true };
    } };
    assert.equal(await withAvailableUsername(client, 'maker', async () => result), result);
});

test('a concurrent claim gets friendly feedback after auth rejects it', async () => {
    let calls = 0;
    const client = { rpc: async () => ({ data: ++calls === 1 }) };
    await assert.rejects(withAvailableUsername(client, 'maker', async () => ({ error: new Error('Database error') })), { message: USERNAME_TAKEN });
    assert.equal(calls, 2);
});

test('unrelated auth failures retain their original error', async () => {
    const client = { rpc: async () => ({ data: true }) };
    await assert.rejects(withAvailableUsername(client, 'maker', async () => ({ error: new Error('Invalid password') })), { message: 'Invalid password' });
});

test('availability service failure prevents saving', async () => {
    await assert.rejects(withAvailableUsername({ rpc: async () => ({ error: new Error('Offline') }) }, 'maker', () => assert.fail('must not save')), { message: 'Offline' });
});
