import { api } from "./api.js";
export const fromPost = (p) => ({
    ...p.metadata,
    id: p.id,
    seller_id: p.author.id,
    creator: `@${p.author.username}`,
    caption: p.caption,
    image: p.mediaUrl,
    post_type: p.type,
    type: p.type,
    tags: p.tags,
    created_at: p.createdAt,
    moderationStatus: p.moderationStatus,
    pinned: p.pinned,
    announcement: p.announcement,
    likeCount: p.likeCount,
    likedByMe: p.likedByMe,
    commentCount: p.commentCount
});
export const postBody = (p) => ({
    type: p.post_type || p.type || "text",
    caption: p.caption,
    mediaUrl: p.image || null,
    tags: p.tags || [],
    metadata: Object.fromEntries(
        Object.entries(p).filter(
            ([key]) =>
                key.startsWith("event_") ||
                key === "is_event" ||
                key === "collaborators"
        )
    )
});
export async function loadPosts() {
    return (await api("/posts?includeOwn=true&limit=100")).map(
        fromPost
    );
}
// Event posts are backed by a row in the events table (the one the Map and
// Calendar read). The post keeps that row's id in metadata.event_id.
const eventBody = (p) => ({
    title: (p.event_title || "").trim(),
    description: p.caption?.trim() || null,
    ...(p.event_location?.trim()
        ? { locationName: p.event_location.trim() }
        : {}),
    startsAt: p.event_starts_at,
    endsAt: p.event_ends_at || null
});
async function syncEvent(p) {
    if (p.is_event) {
        const event = await api(
            `/events${p.event_id ? `/${p.event_id}` : ""}`,
            {
                method: p.event_id ? "PATCH" : "POST",
                body: JSON.stringify(eventBody(p))
            }
        );
        return { ...p, event_id: event.id };
    }
    if (p.event_id) await deleteEvent(p.event_id);
    return { ...p, event_id: null };
}
export async function deleteEvent(eventId) {
    if (!eventId) return;
    try {
        await api(`/events/${eventId}`, { method: "DELETE" });
    } catch (error) {
        if (!/not found/i.test(error.message)) throw error;
    }
}
export async function savePost(p, id) {
    const synced = await syncEvent(p);
    try {
        return fromPost(
            await api(`/posts${id ? `/${id}` : ""}`, {
                method: id ? "PATCH" : "POST",
                body: JSON.stringify(postBody(synced))
            })
        );
    } catch (error) {
        // Don't leave an orphaned event behind if the new post failed.
        if (!p.event_id && synced.event_id)
            await deleteEvent(synced.event_id).catch(() => {});
        throw error;
    }
}
