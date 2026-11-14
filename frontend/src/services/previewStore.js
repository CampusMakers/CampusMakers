// Browser-only storage for the pre-authentication demo. Never contacts a server.
import { explorePosts } from '../pages/Explore Page/exploreData.js';
import { eventStatusAt } from './eventStatus.js';
const KEY = 'campusMakersCelestePreview';
export function previewUser() {
    let profile = {};
    try { profile = JSON.parse(localStorage.getItem('campusMakersDemoProfile')) || {}; } catch { /* Use the demo defaults. */ }
    return { id: 'preview-user', username: profile.username || 'username', name: profile.name || 'Your Name', email: '', bio: profile.bio || '', image: profile.image || '', sellerVerified: localStorage.getItem('campusMakersDemoSeller') === 'true' };
}
function read() {
    const saved = localStorage.getItem(KEY);
    return saved ? JSON.parse(saved) : {};
}
function write(db) {
    localStorage.setItem(KEY, JSON.stringify(db));
    window.dispatchEvent(new Event('campus-makers-preview'));
}
function profiles() {
    const names = [...new Set(explorePosts.flatMap(post => [post.creator, ...(post.collaborators || [])]).filter(Boolean))];
    const user = previewUser();
    return [{ ...user, seller_verified: user.sellerVerified }, ...names.filter(name => name !== `@${user.username}`).map(name => ({ id: `preview:${name}`, username: name.slice(1), name: name.slice(1), seller_verified: true }))];
}
class Query {
    constructor(table) { this.table = table; this.filters = []; this.sorts = []; this.action = 'select'; }
    select(columns = '*', options = {}) { this.columns = columns; this.options = options; return this; }
    eq(key, value) { this.filters.push(row => String(row[key]) === String(value)); return this; }
    in(key, values) { this.filters.push(row => values.some(value => String(row[key]) === String(value))); return this; }
    ilike(key, value) { this.filters.push(row => String(row[key]).toLowerCase() === value.toLowerCase()); return this; }
    order(key, options = {}) { this.sorts.push([key, options.ascending !== false]); return this; }
    insert(value) { this.action = 'insert'; this.value = value; return this; }
    update(value) { this.action = 'update'; this.value = value; return this; }
    delete() { this.action = 'delete'; return this; }
    upsert(value, options) { this.action = 'upsert'; this.value = value; this.conflicts = options.onConflict.split(','); return this; }
    single() { this.one = true; return this; }
    maybeSingle() { this.one = true; return this; }
    then(resolve, reject) { return Promise.resolve().then(() => this.execute()).then(resolve, reject); }
    execute() {
        try {
            const db = read();
            let rows = this.table === 'messaging_profiles' ? profiles() : db[this.table] || [];
            const matches = row => this.filters.every(filter => filter(row));
            let result = rows.filter(matches);
            if (this.action === 'insert' || this.action === 'upsert') {
                const values = Array.isArray(this.value) ? this.value : [this.value];
                result = values.map(value => {
                    const existing = this.action === 'upsert' && rows.find(row => this.conflicts.every(key => String(row[key]) === String(value[key])));
                    if (existing) { Object.assign(existing, value); return existing; }
                    const row = { id: Math.max(Date.now(), ...rows.map(item => Number(item.id) + 1 || 0)), created_at: new Date().toISOString(), ...value };
                    if (this.table === 'maker_post_comments') row.author = `@${previewUser().username}`;
                    if (this.table === 'maker_appointments') row.status ||= 'Scheduled';
                    rows.push(row); return row;
                });
            } else if (this.action === 'update') result.forEach(row => Object.assign(row, this.value));
            else if (this.action === 'delete') {
                const removed = new Set(result.map(row => row.id));
                rows = rows.filter(row => !matches(row) && !(this.table === 'maker_post_comments' && removed.has(row.parent_id)));
            }
            if (this.action !== 'select') { db[this.table] = rows; write(db); }
            if (this.table === 'maker_follows') {
                const people = profiles();
                result = result.map(row => ({ ...row, followee: people.find(person => person.id === row.followee_id), follower: people.find(person => person.id === row.follower_id) }));
            }
            result = [...result].sort((a, b) => {
                for (const [key, ascending] of this.sorts) {
                    const diff = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
                    if (diff) return ascending ? diff : -diff;
                }
                return 0;
            });
            return { data: this.one ? result[0] || null : result, count: result.length, error: null };
        } catch (error) { return { data: null, error }; }
    }
}
export const previewStore = {
    from: table => new Query(table),
    rpc(name, args) {
        const run = () => {
            try {
                const db = read();
                if (name === 'maker_product_rating_summary') {
                    const rows = (db.maker_product_ratings || []).filter(row => row.product_id === args.p_product_id);
                    return { data: { average_rating: rows.length ? rows.reduce((sum, row) => sum + row.rating, 0) / rows.length : null, rating_count: rows.length, own_rating: rows.find(row => row.user_id === previewUser().id)?.rating || null }, error: null };
                }
                if (name !== 'update_maker_event') throw new Error('Unsupported preview operation.');
                const post = (db.maker_posts || []).find(row => row.id === args.p_id);
                if (!post) throw new Error('This event is not saved in this browser.');
                if (eventStatusAt(post) === 'Event Ended') throw new Error('Ended events cannot be edited.');
                if (args.p_changes.event_status === 'Event Ended' && !args.p_confirm_finished) throw new Error('Confirm ending this event first.');
                Object.assign(post, args.p_changes);
                write(db);
                return { data: post, error: null };
            } catch (error) { return { data: null, error }; }
        };
        return { single() { return this; }, then(resolve, reject) { return Promise.resolve().then(run).then(resolve, reject); } };
    }
};
