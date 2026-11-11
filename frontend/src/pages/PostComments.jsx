import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const sampleComments = creator => [
    { id: 1, author: "@ava.collects", content: "This is so lovely!" },
    { id: 5, parent_id: 1, author: creator, content: "Thank you so much! I'm really glad you like it." },
    { id: 2, author: "@milo.buys", content: "Saving this for inspiration." },
    { id: 3, author: "@riley.student", content: "The color palette is perfect." },
    { id: 6, parent_id: 3, author: creator, content: "Thank you! Choosing the colors was one of my favorite parts." },
    { id: 4, author: "@nora.shops", content: "Can't wait to see what you make next." }
];

function CommentThread({ comment, replies, user, canReply, demo, productPreview, onOpenSeller, onMessageUser, onDelete, onReply, busy }) {
    const [replying, setReplying] = useState(false);
    const [draft, setDraft] = useState("");
    const isOwn = item => productPreview ? (item.author_id ? item.author_id === user?.id : item.author === "@you") : demo ? item.author === "@you" : item.author_id === user?.id;
    const authorButton = item => <button type="button" className="explore-comment-author" onClick={() => item.author !== "@you" && onOpenSeller?.(item.author)}>{item.author}</button>;
    return <article className="explore-comment-thread">
        <div className="explore-comment">
            <p>{authorButton(comment)} <span>{comment.content}</span></p>
            <div className="explore-comment-actions">
                {isOwn(comment) && <button type="button" disabled={busy} onClick={() => onDelete(comment.id)}>Delete</button>}
                {canReply && !isOwn(comment) && <><button type="button" onClick={() => setReplying(value => !value)}>{replying ? "Cancel reply" : "Reply publicly"}</button><button type="button" onClick={() => onMessageUser?.(comment.author)}>Reply in messages</button></>}
            </div>
        </div>
        {replies.length > 0 && <div className="explore-comment-replies">{replies.map(reply => <div className="explore-comment explore-comment-reply" key={reply.id}>
            <p>{authorButton(reply)} <span>{reply.content}</span></p>
            {isOwn(reply) && <div className="explore-comment-actions"><button type="button" disabled={busy} onClick={() => onDelete(reply.id)}>Delete</button></div>}
        </div>)}</div>}
        {replying && <form className="explore-comment-form explore-reply-form" onSubmit={async event => { event.preventDefault(); if (await onReply(comment.id, draft)) { setDraft(""); setReplying(false); } }}>
            <input aria-label={`Public reply to ${comment.author}`} value={draft} maxLength={1000} onChange={event => setDraft(event.target.value)} placeholder="Write a public reply" required />
            <button disabled={busy}>Reply</button>
        </form>}
    </article>;
}

function readProductComments(storageKey) {
    try {
        const saved = JSON.parse(window.localStorage.getItem(storageKey));
        if (Array.isArray(saved?.productComments)) return saved.productComments;
        return Array.isArray(saved?.comments)
            ? saved.comments.filter(item => typeof item.id === "string" && typeof item.text === "string").map(item => ({ id: item.id, author: "@you", content: item.text, parent_id: null }))
            : [];
    } catch {
        return [];
    }
}

export default function PostComments({ post, user, canReply, onOpenSeller, onMessageUser, onCountChange, productStorageKey = null }) {
    const productPreview = Boolean(productStorageKey);
    const demo = productPreview || !post.seller_id;
    const postId = demo ? null : Number(String(post.id).replace(/^post-/, ""));
    const [comments, setComments] = useState(() => productPreview ? readProductComments(productStorageKey) : demo ? sampleComments(post.creator) : []);
    const [draft, setDraft] = useState("");
    const [sheetOpen, setSheetOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const username = `@${user?.username || user?.email?.split("@")[0] || ""}`.toLowerCase();
    const mayReply = Boolean(canReply && (productPreview ? post.creator?.toLowerCase() === username : demo || post.seller_id === user?.id || (post.collaborators || []).some(name => name.toLowerCase() === username)));

    function saveProductComments(next) {
        try {
            const saved = JSON.parse(window.localStorage.getItem(productStorageKey)) || {};
            window.localStorage.setItem(productStorageKey, JSON.stringify({ ...saved, productComments: next }));
            setError("");
            return true;
        } catch {
            setError("Comments could not be saved on this device.");
            return false;
        }
    }

    const load = useCallback(async () => {
        const { data, error: failure } = await supabase.from("maker_post_comments").select("id, parent_id, author_id, author, content, created_at").eq("post_id", postId).order("created_at").order("id");
        if (failure) throw failure;
        return data;
    }, [postId]);

    useEffect(() => {
        if (demo || !supabase) return;
        let active = true;
        const refresh = () => load().then(data => { if (active) { setComments(data); setError(""); } }).catch(() => { if (active) setError("Comments could not be loaded."); });
        refresh();
        const timer = window.setInterval(refresh, 30000);
        return () => { active = false; window.clearInterval(timer); };
    }, [demo, load]);

    useEffect(() => { onCountChange(comments.length); }, [comments.length, onCountChange]);

    async function add(content, parentId = null) {
        const text = content.trim();
        if (!text || busy) return false;
        if (demo) {
            if (productPreview) {
                const next = [...comments, { id: crypto.randomUUID(), author_id: user?.id || null, author: user?.id ? username : "@you", content: text, parent_id: parentId }];
                if (!saveProductComments(next)) return false;
                setComments(next);
                return true;
            }
            setComments(current => [...current, { id: crypto.randomUUID(), author: "@you", content: text, parent_id: parentId }]);
            return true;
        }
        if (!user?.id || !supabase) { setError("Sign in to comment."); return false; }
        setBusy(true); setError("");
        try {
            const { data, error: failure } = await supabase.from("maker_post_comments").insert({ post_id: postId, parent_id: parentId, author_id: user.id, content: text }).select("id, parent_id, author_id, author, content, created_at").single();
            if (failure) throw failure;
            setComments(current => [...current.filter(item => item.id !== data.id), data]);
            return true;
        } catch { setError("Could not post your comment. Please try again."); return false; }
        finally { setBusy(false); }
    }

    async function remove(id) {
        if (busy) return;
        if (demo) {
            const next = comments.filter(item => item.id !== id && item.parent_id !== id);
            if (!productPreview || saveProductComments(next)) setComments(next);
            return;
        }
        setBusy(true); setError("");
        try {
            const { error: failure } = await supabase.from("maker_post_comments").delete().eq("id", id).eq("author_id", user.id);
            if (failure) throw failure;
            setComments(current => current.filter(item => item.id !== id && item.parent_id !== id));
        } catch { setError("Could not delete the comment. Please try again."); }
        finally { setBusy(false); }
    }

    const roots = comments.filter(comment => !comment.parent_id);
    const thread = comment => <CommentThread key={comment.id} comment={comment} replies={comments.filter(item => item.parent_id === comment.id)} user={user} canReply={mayReply} demo={demo} productPreview={productPreview} onOpenSeller={onOpenSeller} onMessageUser={onMessageUser} onDelete={remove} onReply={add} busy={busy} />;
    return <>
        <section className="explore-comments">
            <h2>Comments</h2>
            {demo && <p className="explore-comments-note">{productPreview ? "Comments are saved on this device." : "Example comments and replies are a preview."}</p>}
            {roots.slice(0, 2).map(thread)}
            {roots.length > 2 && <button className="explore-more-comments" type="button" onClick={() => setSheetOpen(true)}>See {roots.length - 2} more comments</button>}
            <form className="explore-comment-form" onSubmit={async event => { event.preventDefault(); if (await add(draft)) setDraft(""); }}>
                <input aria-label="Add a comment" value={draft} onChange={event => setDraft(event.target.value)} maxLength={1000} placeholder="Add a comment" required />
                <button disabled={busy}>Post</button>
            </form>
            {error && <p className="explore-comment-error" role="alert">{error}</p>}
        </section>
        {sheetOpen && <div className="explore-comments-sheet-backdrop" role="presentation" onClick={() => setSheetOpen(false)}>
            <section className="explore-comments-sheet" role="dialog" aria-modal="true" aria-label="All comments" onClick={event => event.stopPropagation()}>
                <div className="explore-comments-sheet-heading"><h2>Comments</h2><button type="button" aria-label="Close comments" onClick={() => setSheetOpen(false)}>×</button></div>
                <div className="explore-comments-sheet-list">{roots.map(thread)}{error && <p className="explore-comment-error" role="alert">{error}</p>}</div>
            </section>
        </div>}
    </>;
}
