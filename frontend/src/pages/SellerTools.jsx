import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { uploadPhoto } from '../services/photos';

export function PostComposer({ user, onPublished, onCancel }) {
    const [caption, setCaption] = useState('');
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function publish(event) {
        event.preventDefault();
        if (busy || !caption.trim()) return;
        setBusy(true); setError('');
        try {
            if (!supabase) throw new Error('Please log in to publish a post.');
            const image = file ? await uploadPhoto(file) : null;
            const { data, error: failure } = await supabase.from('maker_posts').insert({
                seller_id: user.id, creator: `@${user.username || user.email.split('@')[0]}`,
                caption: caption.trim(), image
            }).select().single();
            if (failure) throw failure;
            onPublished(data);
        } catch (failure) { setError(`Could not publish your post. ${failure.message}`); }
        finally { setBusy(false); }
    }
    return <section className="profile-panel seller-panel">
        <div className="profile-panel-heading"><h3>Create a post</h3></div>
        <p className="seller-section-description">Share your work with the campus. Published posts appear on Explore.</p>
        <form className="seller-tool-form" onSubmit={publish}>
            <label>Caption<textarea required maxLength={2000} value={caption} onChange={e => setCaption(e.target.value)} /></label>
            <label>Photo (optional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
            {error && <p role="alert">{error}</p>}
            <div className="profile-appointment-actions">
                <button className="profile-action-button" type="button" disabled={busy} onClick={onCancel}>Cancel</button>
                <button className="profile-action-button profile-action-primary" disabled={busy || !caption.trim()}>{busy ? 'Publishing…' : 'Publish to Explore'}</button>
            </div>
        </form>
    </section>;
}

export function AppointmentManager({ user }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        let active = true;
        async function load() {
            try {
                if (!supabase) throw new Error('Please log in to manage appointments.');
                const { data, error: failure } = await supabase.from('maker_appointments').select('*').eq('seller_id', user.id).order('starts_at');
                if (failure) throw failure;
                if (active) setItems(data);
            } catch (failure) { if (active) setError(`Could not load appointments. ${failure.message}`); }
            finally { if (active) setLoading(false); }
        }
        load();
        return () => { active = false; };
    }, [user.id]);
    async function save(event) {
        event.preventDefault();
        if (busy) return;
        const form = event.currentTarget;
        const fields = new FormData(form);
        const startsAt = new Date(fields.get('starts_at'));
        if (startsAt <= new Date()) { setError('Choose a future appointment time.'); return; }
        setBusy(true); setError('');
        try {
            const { data, error: failure } = await supabase.from('maker_appointments').insert({
                seller_id: user.id, title: fields.get('title').trim(), buyer: fields.get('buyer').trim(),
                location: fields.get('location').trim(), starts_at: startsAt.toISOString()
            }).select().single();
            if (failure) throw failure;
            setItems(current => [...current, data].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
            form.reset();
        } catch (failure) { setError(`Could not save appointment. ${failure.message}`); }
        finally { setBusy(false); }
    }
    async function update(item, status) {
        setBusy(true); setError('');
        try {
            const { data, error: failure } = await supabase.from('maker_appointments').update({ status }).eq('id', item.id).eq('seller_id', user.id).select().single();
            if (failure) throw failure;
            setItems(current => current.map(row => row.id === data.id ? data : row));
        } catch (failure) { setError(`Could not update appointment. ${failure.message}`); }
        finally { setBusy(false); }
    }
    return <section className="profile-panel seller-panel">
        <div className="profile-panel-heading"><h3>Your appointments</h3><span className="profile-count">{loading || error ? "—" : items.length} appointments</span></div>
        <p className="seller-section-description">Keep track of your pickups and meetings. These entries are private to you.</p>
        <form className="seller-tool-form" onSubmit={save}>
            <label>Appointment<input name="title" required maxLength={120} placeholder="Custom order pickup" /></label>
            <label>Buyer<input name="buyer" required maxLength={120} placeholder="Name or username" /></label>
            <label>Date and time<input name="starts_at" type="datetime-local" required /></label>
            <label>Meeting location<input name="location" required maxLength={200} /></label>
            <button className="profile-action-button profile-action-primary" disabled={busy || loading}>{busy ? 'Saving…' : '+ Add appointment'}</button>
        </form>
        {error && <p role="alert">{error}</p>}
        {loading ? <p role="status">Loading appointments…</p> : !items.length && !error ? <p className="seller-empty-state">No appointments yet. Add your first one above.</p> : null}
        <div className="profile-card-stack">
            {items.map(item => <article key={item.id} className="profile-appointment-card">
                <h4>{item.title}</h4><p>{item.buyer} · {new Date(item.starts_at).toLocaleString()}</p>
                <p>{item.location}</p><span className={`profile-status ${item.status === "Completed" ? "profile-status-confirmed" : item.status === "Scheduled" ? "profile-status-pending" : "seller-status-neutral"}`}>{item.status}</span>
                {item.status === 'Scheduled' && <div className="profile-appointment-actions">
                    <button className="profile-action-button" disabled={busy} onClick={() => update(item, 'Completed')}>Mark completed</button>
                    <button className="profile-action-button" disabled={busy} onClick={() => update(item, 'Cancelled')}>Cancel appointment</button>
                </div>}
            </article>)}
        </div>
    </section>;
}
