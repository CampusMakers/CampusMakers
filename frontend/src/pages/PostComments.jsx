import { requestLogin } from "../services/loginFlow";
import { useEffect, useState } from "react";
import { api } from "../services/api";

function CommentThread({
    comment,
    replies,
    user,
    canReply,
    demo,
    productPreview,
    onOpenSeller,
    onMessageUser,
    onDelete,
    onReply,
    busy
}) {
    const [replying, setReplying] = useState(false);
    const [draft, setDraft] = useState("");
    const isOwn = (item) =>
        productPreview
            ? item.author_id
                ? item.author_id === user?.id
                : item.author === "@you"
            : demo
              ? item.author === "@you"
              : item.author_id === user?.id;
    const authorButton = (item) => (
        <button
            type="button"
            className="explore-comment-author"
            onClick={() =>
                item.author !== "@you" &&
                onOpenSeller?.(item.author)
            }>
            {item.author}
        </button>
    );
    return (
        <article className="explore-comment-thread">
            <div className="explore-comment">
                <p>
                    {authorButton(comment)}{" "}
                    <span>{comment.content}</span>
                </p>
                <div className="explore-comment-actions">
                    {isOwn(comment) && (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                                onDelete(comment.id)
                            }>
                            Delete
                        </button>
                    )}
                    {canReply && !isOwn(comment) && (
                        <>
                            <button
                                type="button"
                                onClick={() =>
                                    setReplying(
                                        (value) => !value
                                    )
                                }>
                                {replying
                                    ? "Cancel reply"
                                    : "Reply publicly"}
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    onMessageUser?.(
                                        comment.author
                                    )
                                }>
                                Reply in messages
                            </button>
                        </>
                    )}
                </div>
            </div>
            {replies.length > 0 && (
                <div className="explore-comment-replies">
                    {replies.map((reply) => (
                        <div
                            className="explore-comment explore-comment-reply"
                            key={reply.id}>
                            <p>
                                {authorButton(reply)}{" "}
                                <span>{reply.content}</span>
                            </p>
                            {isOwn(reply) && (
                                <div className="explore-comment-actions">
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() =>
                                            onDelete(reply.id)
                                        }>
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {replying && (
                <form
                    className="explore-comment-form explore-reply-form"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        if (await onReply(comment.id, draft)) {
                            setDraft("");
                            setReplying(false);
                        }
                    }}>
                    <input
                        aria-label={`Public reply to ${comment.author}`}
                        value={draft}
                        maxLength={1000}
                        onChange={(event) =>
                            setDraft(event.target.value)
                        }
                        placeholder="Write a public reply"
                        required
                    />
                    <button disabled={busy}>Reply</button>
                </form>
            )}
        </article>
    );
}

export default function PostComments({
    post,
    user,
    onOpenSeller,
    onMessageUser,
    onCountChange
}) {
    const listing = post.type === "listing";
    const id = String(post.id).replace(/^(post|listing)-/, "");
    const real =
        /^\d+$/.test(id) &&
        (listing || Boolean(post.seller_id));
    const path = listing
        ? `/listings/${id}/activity/comments`
        : `/posts/${id}/comments`;
    const [comments, setComments] = useState([]);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const normalize = (rows) =>
        rows.map((row) => ({
            ...row,
            author_id: row.author_id || row.author?.id,
            author:
                typeof row.author === "string"
                    ? row.author
                    : `@${row.author.username}`
        }));
    useEffect(() => {
        if (!real) return;
        let active = true;
        const refresh = () =>
            api(`${path}${listing ? "" : "?limit=100"}`)
                .then((rows) => {
                    if (active) setComments(normalize(rows));
                })
                .catch((e) => {
                    if (active) setError(e.message);
                });
        refresh();
        const poll = setInterval(refresh, 15000);
        return () => {
            active = false;
            clearInterval(poll);
        };
    }, [real, path, listing]);
    useEffect(() => {
        onCountChange?.(comments.length);
    }, [comments.length, onCountChange]);
    async function add(content, parentId = null) {
        if (!user) return requestLogin("comment", true);
        if (!real) {
            setError(
                "This sample post does not accept comments. Choose a community post or listing."
            );
            return false;
        }
        if (busy || !content.trim()) return false;
        setBusy(true);
        setError("");
        try {
            const row = await api(path, {
                method: "POST",
                body: JSON.stringify({
                    content: content.trim(),
                    parentId
                })
            });
            setComments((current) => [
                ...current,
                ...normalize([row])
            ]);
            return true;
        } catch (e) {
            setError(e.message);
            return false;
        } finally {
            setBusy(false);
        }
    }
    async function remove(id) {
        setBusy(true);
        try {
            await api(`${path}/${id}`, { method: "DELETE" });
            setComments((current) =>
                current.filter(
                    (row) =>
                        row.id !== id && row.parent_id !== id
                )
            );
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }
    return (
        <section className="explore-comments">
            <h2>Comments</h2>
            {!real && (
                <p>
                    Sample post. Comments are available on
                    community posts and listings.
                </p>
            )}
            {comments
                .filter((c) => !c.parent_id)
                .map((comment) => (
                    <CommentThread
                        key={comment.id}
                        comment={comment}
                        replies={comments.filter(
                            (c) => c.parent_id === comment.id
                        )}
                        user={user}
                        canReply={Boolean(user)}
                        onOpenSeller={onOpenSeller}
                        onMessageUser={onMessageUser}
                        onDelete={remove}
                        onReply={add}
                        busy={busy}
                    />
                ))}
            <form
                className="explore-comment-form"
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (await add(draft)) setDraft("");
                }}>
                <input
                    aria-label="Add a comment"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={1000}
                    placeholder="Add a comment"
                    required
                />
                <button disabled={busy}>Post</button>
            </form>
            {error && <p role="alert">{error}</p>}
        </section>
    );
}
