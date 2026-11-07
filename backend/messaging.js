const profile = row => ({ id: row.id, username: row.username, name: row.name, image: row.image, sellerVerified: row.seller_verified });
const message = row => ({ id: row.id, senderId: row.sender_id, recipientId: row.recipient_id, content: row.content, createdAt: row.created_at, readAt: row.read_at });
const fail = (status, text) => Object.assign(new Error(text), { status });

export async function handleMessaging({ req, send, user, sellerVerified, url, key, token, fetchImpl }) {
    const route = new URL(req.url, 'http://localhost');
    if (!/^\/api\/(users|conversations|messages)(\/|$)/.test(route.pathname)) return false;
    const db = async (table, params = {}, method = 'GET', body) => {
        const response = await fetchImpl(`${url}/rest/v1/${table}?${new URLSearchParams(params)}`, {
            method, headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
            ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) throw fail(503, 'Messaging is unavailable. Check that the messaging database migration has been applied.');
        return response.json();
    };
    const resolvePartner = async identifier => {
        if (typeof identifier !== 'string' || !/^[a-zA-Z0-9._-]{1,128}$/.test(identifier)) throw fail(400, 'Choose a valid recipient.');
        const isId = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(identifier);
        const rows = await db('messaging_profiles', { [isId ? 'id' : 'username']: `eq.${identifier.toLowerCase()}`, limit: 2 });
        if (!rows.length) throw fail(404, 'User not found.');
        if (rows.length > 1) throw fail(409, 'Several users have this username. Choose a user from search results.');
        if (rows[0].id === user.id) throw fail(400, 'Choose someone other than yourself.');
        return rows[0];
    };
    try {
        if (route.pathname === '/api/users' && req.method === 'GET') {
            const query = (route.searchParams.get('search') || '').trim().replace(/^@/, '').replace(/[^a-zA-Z0-9 ._-]/g, '').slice(0, 80);
            if (!query) { send(200, { data: [] }); return true; }
            const rows = await db('messaging_profiles', { id: `neq.${user.id}`, or: `(username.ilike.*${query}*,name.ilike.*${query}*)`, ...(!sellerVerified ? { seller_verified: 'eq.true' } : {}), order: 'username.asc,id.asc', limit: 8 });
            send(200, { data: rows.map(profile) });
        } else if (route.pathname === '/api/messages' && req.method === 'POST') {
            let raw = '';
            for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 20000) throw fail(413, 'Message is too large.'); }
            let body;
            try { body = JSON.parse(raw); } catch { throw fail(400, 'Invalid message.'); }
            const content = typeof body?.content === 'string' ? body.content.trim() : '';
            if (!content || [...content].length > 4000) throw fail(400, 'Messages must contain 1–4,000 characters.');
            const partner = await resolvePartner(body.recipientId || body.recipientUsername);
            if (!sellerVerified && !partner.seller_verified) throw fail(403, 'Buyers can only message sellers.');
            const rows = await db('messages', {}, 'POST', { sender_id: user.id, recipient_id: partner.id, content });
            send(201, { data: message(rows[0]) });
        } else if (route.pathname === '/api/conversations' && req.method === 'GET') {
            // Page through all visible rows so older conversations are not lost to the REST row cap.
            const rows = [];
            for (let offset = 0; ; offset += 500) {
                const batch = await db('messages', { or: `(sender_id.eq.${user.id},recipient_id.eq.${user.id})`, order: 'created_at.desc,id.desc', limit: 500, offset });
                rows.push(...batch);
                if (batch.length < 500) break;
            }
            const conversations = new Map();
            for (const row of rows) {
                const id = row.sender_id === user.id ? row.recipient_id : row.sender_id;
                if (!conversations.has(id)) conversations.set(id, { lastMessage: message(row), unreadCount: 0 });
                if (row.recipient_id === user.id && !row.read_at) conversations.get(id).unreadCount++;
            }
            const data = await Promise.all([...conversations].map(async ([id, conversation]) => {
                const [partner] = await db('messaging_profiles', { id: `eq.${id}` });
                return { ...conversation, partner: profile(partner) };
            }));
            send(200, { data });
        } else if (/^\/api\/conversations\/[^/]+(?:\/read)?$/.test(route.pathname)) {
            const partner = await resolvePartner(decodeURIComponent(route.pathname.split('/')[3]));
            if (route.pathname.endsWith('/read') && req.method === 'PUT') {
                await db('messages', { sender_id: `eq.${partner.id}`, recipient_id: `eq.${user.id}`, read_at: 'is.null' }, 'PATCH', { read_at: new Date().toISOString() });
                send(200, { data: null });
            } else if (!route.pathname.endsWith('/read') && req.method === 'GET') {
                const rows = await db('messages', { or: `(and(sender_id.eq.${user.id},recipient_id.eq.${partner.id}),and(sender_id.eq.${partner.id},recipient_id.eq.${user.id}))`, order: 'created_at.desc,id.desc', limit: 50 });
                send(200, { data: { partner: profile(partner), canMessage: sellerVerified || partner.seller_verified, messages: rows.reverse().map(message) } });
            } else send(405, { message: 'Method not allowed.' });
        } else if (/^\/api\/messages\/[a-f0-9-]{36}$/.test(route.pathname) && req.method === 'DELETE') {
            const rows = await db('messages', { id: `eq.${route.pathname.split('/')[3]}`, sender_id: `eq.${user.id}` }, 'DELETE');
            send(rows.length ? 200 : 404, rows.length ? { data: null } : { message: 'Message not found.' });
        } else send(404, { message: 'Not found.' });
    } catch (error) { send(error.status || 503, { message: error.status ? error.message : 'Messaging is unavailable. Please try again.' }); }
    return true;
}
