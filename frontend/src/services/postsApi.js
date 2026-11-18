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
export async function savePost(p, id) {
    return fromPost(
        await api(`/posts${id ? `/${id}` : ""}`, {
            method: id ? "PATCH" : "POST",
            body: JSON.stringify(postBody(p))
        })
    );
}
