import { test } from 'node:test';
import assert from 'node:assert/strict';
import { putWithQuota, MAX_STORAGE_BYTES, UPLOAD_LOCK_KEY, StorageLimitError } from './photos.js';

function fakeStore(sizes, { failWrite = false } = {}) {
    let locked = false;
    const writes = [];
    return { writes, get locked() { return locked; }, async send(command) {
        const { Key, Body, ContinuationToken, IfNoneMatch } = command.input;
        if (command.constructor.name === 'ListObjectsV2Command') {
            const index = Number(ContinuationToken || 0);
            return { Contents: [{ Size: sizes[index] }], IsTruncated: index < sizes.length - 1,
                NextContinuationToken: index < sizes.length - 1 ? String(index + 1) : undefined };
        }
        if (command.constructor.name === 'DeleteObjectCommand') { locked = false; return {}; }
        if (Key === UPLOAD_LOCK_KEY) {
            assert.equal(IfNoneMatch, '*');
            if (locked) throw new Error('PreconditionFailed');
            locked = true; return {};
        }
        if (failWrite) throw new Error('Connection lost');
        writes.push({ Key, size: Body.length }); return {};
    } };
}
test('allows exact 10 GB boundary and releases lock', async () => {
    const client = fakeStore([MAX_STORAGE_BYTES - 8]);
    await putWithQuota(client, 'bucket', 'photo', Buffer.alloc(8), 'image/png');
    assert.equal(client.writes.length, 1); assert.equal(client.locked, false);
});
test('counts all pages and rejects over-limit upload without writing', async () => {
    const client = fakeStore([MAX_STORAGE_BYTES - 10, 3]);
    await assert.rejects(putWithQuota(client, 'bucket', 'photo', Buffer.alloc(8), 'image/png'), StorageLimitError);
    assert.equal(client.writes.length, 0); assert.equal(client.locked, false);
});
test('concurrent writers cannot both enter quota check', async () => {
    const client = fakeStore([MAX_STORAGE_BYTES - 8]);
    const results = await Promise.allSettled([1, 2].map(id => putWithQuota(client, 'bucket', String(id), Buffer.alloc(8), 'image/png')));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(client.writes.length, 1);
});
test('ambiguous write failure retains lock to prevent overspending', async () => {
    const client = fakeStore([0], { failWrite: true });
    await assert.rejects(putWithQuota(client, 'bucket', 'photo', Buffer.alloc(8), 'image/png'));
    assert.equal(client.locked, true);
    await assert.rejects(putWithQuota(client, 'bucket', 'other', Buffer.alloc(8), 'image/png'), /PreconditionFailed/);
});
test('listing failure fails closed without writing', async () => {
    const client = fakeStore([undefined]);
    await assert.rejects(putWithQuota(client, 'bucket', 'photo', Buffer.alloc(8), 'image/png'));
    assert.equal(client.writes.length, 0);
});
