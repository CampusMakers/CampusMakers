export function eventStatusAt(post, now = Date.now()) {
    if (post.event_status === "Event Ended") return "Event Ended";
    if (post.event_status_mode !== "automatic") return post.event_status || "Upcoming";
    if (post.event_ends_at && now >= new Date(post.event_ends_at).getTime()) return "Event Ended";
    if (post.event_starts_at && now >= new Date(post.event_starts_at).getTime()) return "In Progress";
    return "Upcoming";
}
