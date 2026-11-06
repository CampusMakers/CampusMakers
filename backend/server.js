import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

export function createApp({ url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY, fetchImpl = fetch } = {}) {
    return createServer(async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        const send = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
        if (req.url === '/api/health' && req.method === 'GET') return send(200, { ok: true });
        if (!req.url?.startsWith('/api/')) return send(404, { message: 'Not found.' });
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
                return send(200, { data: { id: user.id, email: user.email, name: user.user_metadata?.full_name || '', sellerVerified } });
            }
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
