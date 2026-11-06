import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

export const MAX_STORAGE_BYTES = 10_000_000_000;
export const UPLOAD_LOCK_KEY = '_system/upload-lock';
export class StorageLimitError extends Error {
    constructor() { super('Total photo storage has reached the 10 GB limit.'); }
}

// A bucket-wide conditional lock coordinates all backend processes. Never expire
// it automatically: an interrupted write may still be in flight at R2.
export async function putWithQuota(client, bucket, key, bytes, type) {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: UPLOAD_LOCK_KEY,
        Body: Buffer.alloc(0), IfNoneMatch: '*' }));
    let writeUncertain = false;
    try {
        let used = 0;
        let token;
        do {
            const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
            for (const object of page.Contents || []) {
                if (!Number.isSafeInteger(object.Size) || object.Size < 0) throw new Error('Invalid storage size');
                used += object.Size;
            }
            if (used + bytes.length > MAX_STORAGE_BYTES) throw new StorageLimitError();
            token = page.IsTruncated ? page.NextContinuationToken : undefined;
            if (page.IsTruncated && !token) throw new Error('Incomplete storage listing');
        } while (token);
        writeUncertain = true;
        await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: type }));
        writeUncertain = false;
    } finally {
        // On an ambiguous upload failure, retain the lock and fail closed.
        if (!writeUncertain) await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: UPLOAD_LOCK_KEY }));
    }
}

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export function imageType(bytes) {
    if (bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
    if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
    if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
    return null;
}
export function createPhotoStore(env = process.env) {
    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = env;
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) return null;
    const client = new S3Client({
        region: 'auto', endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }
    });
    return {
        async put(userId, bytes, type) {
            const key = `${userId}/${randomUUID()}`;
            await putWithQuota(client, R2_BUCKET_NAME, key, bytes, type);
            return `/api/photos/${key}`;
        },
        async get(key) {
            const object = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
            return { bytes: await object.Body.transformToByteArray(), type: object.ContentType };
        }
    };
}
