import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { eventStatusAt } from "../services/eventStatus";

const localDateTime = value => {
    if (!value) return "";
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function EventManager({ post, user, onUpdated, listings = [], posts = [] }) {
    const [now, setNow] = useState(() => Date.now());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [confirmEnd, setConfirmEnd] = useState(false);
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(post.event_title || "");
    const [location, setLocation] = useState(post.event_location || "");
    const [caption, setCaption] = useState(post.caption || "");
    const [starts, setStarts] = useState(() => localDateTime(post.event_starts_at));
    const [ends, setEnds] = useState(() => localDateTime(post.event_ends_at));
    const [slots, setSlots] = useState(() => (post.event_slots || []).join("\n"));
    const [linkedListings, setLinkedListings] = useState(() => post.event_listings || []);
    const [linkedPosts, setLinkedPosts] = useState(() => (post.event_posts || []).map(String));
    const [newListingId, setNewListingId] = useState("");
    const [newListingAvailability, setNewListingAvailability] = useState("");
    const [newPostId, setNewPostId] = useState("");

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 15000);
        return () => window.clearInterval(timer);
    }, []);
    useEffect(() => {
        if (!confirmEnd || busy) return;
        const onKeyDown = event => { if (event.key === "Escape") setConfirmEnd(false); };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [confirmEnd, busy]);

    const status = eventStatusAt(post, now);
    const mode = post.event_status_mode || "manual";
    const username = `@${user?.username || user?.email?.split("@")[0] || ""}`.toLowerCase();
    const canManage = Boolean(post.seller_id && user?.sellerVerified && (
        post.seller_id === user.id || (post.collaborators || []).some(name => name.toLowerCase() === username)
    ));
    const choices = listings.filter(item => !linkedListings.some(link => String(link.id) === String(item.id)));
    const postChoices = posts.filter(item => item.seller_id === user?.id && !item.is_event && !linkedPosts.some(id => id.replace(/^post-/, "") === String(item.id).replace(/^post-/, "")));

    async function save(changes, confirmed = false) {
        if (busy) return false;
        setBusy(true); setError("");
        try {
            if (!supabase) throw new Error("Please sign in to manage this event.");
            const { data, error: failure } = await supabase.rpc("update_maker_event", {
                p_id: Number(String(post.id).replace(/^post-/, "")), p_changes: changes, p_confirm_finished: confirmed
            });
            if (failure) throw failure;
            const updated = Array.isArray(data) ? data[0] : data;
            if (!updated?.id) throw new Error("The event update could not be confirmed. Refresh and try again.");
            onUpdated(updated);
            return true;
        } catch (failure) {
            setError(failure.message || "Could not update this event.");
            return false;
        } finally { setBusy(false); }
    }

    async function saveDetails(event) {
        event.preventDefault();
        if (!title.trim() || !location.trim() || !caption.trim() || !starts) { setError("Enter an event name, location, start time, and post caption."); return; }
        if (ends && new Date(ends) <= new Date(starts)) { setError("The event end time must be after its start time."); return; }
        if (mode === "automatic" && (!ends || new Date(ends) <= new Date())) { setError("Automatic status requires an end time in the future."); return; }
        const saved = await save({ event_title: title.trim(), event_location: location.trim(), caption: caption.trim(), event_starts_at: new Date(starts).toISOString(), event_ends_at: ends ? new Date(ends).toISOString() : null, event_slots: slots.split("\n").map(slot => slot.trim()).filter(Boolean), event_listings: linkedListings, event_posts: linkedPosts });
        if (saved) setEditing(false);
    }

    return <>
        <div className="event-status-row"><span className="event-status-label">{status}</span>{canManage && status !== "Event Ended" && <span>{mode === "automatic" ? "Automatic" : "Manual"} status</span>}</div>
        {canManage && status !== "Event Ended" && <div className="event-management">
            <label>Status updates<select disabled={busy} value={mode} onChange={event => {
                const nextMode = event.target.value;
                if (nextMode === "automatic" && (!post.event_ends_at || new Date(post.event_ends_at).getTime() <= Date.now())) { setError("Set a future end time before enabling automatic status."); return; }
                save({ event_status_mode: nextMode, event_status: nextMode === "manual" ? status : "Upcoming" });
            }}><option value="manual">Manual</option><option value="automatic">Automatic</option></select></label>
            {mode === "automatic" && <p>At the end time, this event will be marked finished and can no longer be edited.</p>}
            {mode === "manual" && <label>Event status<select disabled={busy} value={status} onChange={event => event.target.value === "Event Ended" ? setConfirmEnd(true) : save({ event_status: event.target.value })}><option>Upcoming</option><option>In Progress</option><option>Event Ended</option></select></label>}
            <button type="button" disabled={busy} onClick={() => setEditing(value => !value)}>{editing ? "Close editor" : "Edit event"}</button>
            {mode === "automatic" && <button type="button" disabled={busy} onClick={() => setConfirmEnd(true)}>Mark event finished</button>}
        </div>}
        {canManage && status === "Event Ended" && <p className="event-locked">This event is finished and can no longer be edited.</p>}
        {error && <p className="event-error" role="alert">{error}</p>}
        {canManage && status !== "Event Ended" && editing && <form className="event-editor" onSubmit={saveDetails}>
            <h3>Edit event</h3>
            <label>Event name<input value={title} maxLength={120} required onChange={e => setTitle(e.target.value)} /></label>
            <label>Location<input value={location} maxLength={200} required onChange={e => setLocation(e.target.value)} /></label>
            <label>Post caption<textarea value={caption} maxLength={2000} required onChange={e => setCaption(e.target.value)} /></label>
            <label>Starts<input type="datetime-local" required value={starts} onChange={e => setStarts(e.target.value)} /></label>
            <label>Ends<input type="datetime-local" required={mode === "automatic"} value={ends} onChange={e => setEnds(e.target.value)} /></label>
            <label>Appointment slots (one per line)<textarea value={slots} onChange={e => setSlots(e.target.value)} /></label>
            <div><strong>Linked listings</strong>{linkedListings.length ? linkedListings.map(item => <div className="event-editor-item" key={item.id}><span>{item.name}</span><button type="button" onClick={() => setLinkedListings(current => current.filter(link => String(link.id) !== String(item.id)))}>Remove</button></div>) : <p>No listings linked.</p>}</div>
            {choices.length > 0 && <div className="event-editor-add"><label>Add a listing<select value={newListingId} onChange={e => setNewListingId(e.target.value)}><option value="">Choose a listing</option>{choices.map(item => <option key={item.id} value={String(item.id)}>{item.name}</option>)}</select></label><label>Availability<select value={newListingAvailability} onChange={e => setNewListingAvailability(e.target.value)}><option value="">Choose availability</option><option value="event">Available at the event</option><option value="preorder">Available for preorder</option><option value="both">At the event and for preorder</option></select></label><button type="button" disabled={!newListingId || !newListingAvailability} onClick={() => { const item = choices.find(choice => String(choice.id) === newListingId); if (!item) return; setLinkedListings(current => [...current, { id: String(item.id), name: item.name, price: Number(item.price) || 0, image: item.images?.[0] || item.image || null, creator: username, quantity: item.quantity, maxPerOrder: item.maxPerOrder, availability: newListingAvailability }]); setNewListingId(""); setNewListingAvailability(""); }}>Add listing</button></div>}
            <div><strong>Linked posts</strong>{linkedPosts.length ? linkedPosts.map(id => { const item = posts.find(candidate => String(candidate.id).replace(/^post-/, "") === id.replace(/^post-/, "")); return <div className="event-editor-item" key={id}><span>{item?.caption || "Linked post"}</span><button type="button" onClick={() => setLinkedPosts(current => current.filter(value => value !== id))}>Remove</button></div>; }) : <p>No posts linked.</p>}</div>
            {postChoices.length > 0 && <div className="event-editor-add"><label>Add a post<select value={newPostId} onChange={e => setNewPostId(e.target.value)}><option value="">Choose a post</option>{postChoices.map(item => <option key={item.id} value={String(item.id)}>{item.caption.slice(0, 80)}</option>)}</select></label><button type="button" disabled={!newPostId} onClick={() => { setLinkedPosts(current => [...current, newPostId]); setNewPostId(""); }}>Add post</button></div>}
            <button type="submit" disabled={busy}>Save changes</button>
        </form>}
        {confirmEnd && <div className="event-confirm-backdrop" onClick={() => !busy && setConfirmEnd(false)}><div className="event-confirm" role="dialog" aria-modal="true" aria-labelledby="event-confirm-title" onClick={event => event.stopPropagation()}><h3 id="event-confirm-title">Are you sure you want to mark your Event as finished?</h3><p>Once finished, this event can no longer be edited. No more posts, appointments, or listings can be added.</p><div><button type="button" disabled={busy} autoFocus onClick={() => setConfirmEnd(false)}>No</button><button type="button" disabled={busy} onClick={async () => { if (await save({ event_status: "Event Ended", event_status_mode: "manual" }, true)) { setConfirmEnd(false); setEditing(false); } }}>Yes</button></div>{error && <p role="alert">{error}</p>}</div></div>}
    </>;
}
