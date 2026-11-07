import { handleMessaging } from './messaging.js';
import { createPhotoStore, imageType, MAX_PHOTO_BYTES, StorageLimitError } from './photos.js';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

export function createApp({ url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY, fetchImpl = fetch, photoStore = createPhotoStore() } = {}) {
    return createServer(async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        const send = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
        if (req.url === '/api/health' && req.method === 'GET') return send(200, { ok: true });
        if (!req.url?.startsWith('/api/')) return send(404, { message: 'Not found.' });
        // Photos are public profile/listing assets, served from a private R2 bucket.
        if (req.method === 'GET' && /^\/api\/photos\/[a-zA-Z0-9-]+\/[a-f0-9-]{36}$/.test(req.url)) {
            if (!photoStore) return send(503, { message: 'Cloudflare photo storage is not configured yet.' });
            try {
                const photo = await photoStore.get(req.url.slice('/api/photos/'.length));
                res.setHeader('Content-Type', photo.type);
                res.setHeader('X-Content-Type-Options', 'nosniff');
                res.setHeader('Cache-Control', 'public, max-age=86400');
                res.writeHead(200);
                return res.end(photo.bytes);
            } catch { return send(404, { message: 'Picture not found.' }); }
        }
        const token = req.headers.authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];
        if (!token) return send(401, { message: 'Please log in to continue.' });
        if (!url || !key) return send(503, { message: 'Authentication is not configured.' });
        try {
            // Verify with Auth on every request. Never trust browser-supplied user IDs or roles.
            const response = await fetchImpl(`${url}/auth/v1/user`, {
                headers: { apikey: key, Authorization: `Bearer ${token}` },
                signal: AbortSignal.timeout(10000)
            });
            if (!response.ok) return send(response.status >= 500 || response.status === 429 ? 503 : 401, { message: 'Unable to verify your session. Please try logging in again.' });
            const user = await response.json();
            if (!user.id || !user.email_confirmed_at) return send(403, { message: 'Please verify your email before continuing.' });
            const sellerVerified = /^[^\s@]+@[^\s@]+\.edu$/i.test(user.email || '');
            if (req.url === '/api/auth/me' && req.method === 'GET') {
                return send(200, { data: { id: user.id, email: user.email, name: user.user_metadata?.full_name || '', username: user.user_metadata?.username || user.email.split('@')[0], bio: user.user_metadata?.bio || '', image: user.user_metadata?.avatar_url || '', sellerVerified } });
            }
            if (req.url === '/api/photos' && req.method === 'POST') {
                if (!photoStore) return send(503, { message: 'Cloudflare photo storage is not configured yet.' });
                if (!['image/jpeg', 'image/png', 'image/webp'].includes(req.headers['content-type'])) return send(415, { message: 'Choose a JPEG, PNG, or WebP picture.' });
                let size = 0;
                const chunks = [];
                for await (const chunk of req) {
                    size += chunk.length;
                    if (size > MAX_PHOTO_BYTES) return send(413, { message: 'Pictures must be 5 MB or smaller.' });
                    chunks.push(chunk);
                }
                const bytes = Buffer.concat(chunks);
                const type = imageType(bytes);
                if (!type || type !== req.headers['content-type']) return send(415, { message: 'The file is not a supported picture.' });
                try {
                    const photoUrl = await photoStore.put(user.id, bytes, type);
                    return send(201, { data: { url: photoUrl } });
                } catch (error) {
                    if (error instanceof StorageLimitError) return send(507, { message: error.message });
                    return send(503, { message: 'Picture upload failed. Please try again.' });
                }
            }
            if (await handleMessaging({ req, send, user, sellerVerified, url, key, token, fetchImpl })) return;
            return send(404, { message: 'This feature is not connected yet.' });
        } catch {
            return send(503, { message: 'Authentication service is unavailable. Please try again.' });
        }
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) throw new Error('Configure backend/.env before starting the server.');
    createApp().listen(Number(process.env.PORT || 3001), '127.0.0.1', () => console.log('Campus Makers API listening on http://127.0.0.1:3001'));
}
