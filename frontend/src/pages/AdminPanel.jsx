import AdminMembers from "./AdminMembers";
import { useEffect, useState } from "react";
import { api } from "../services/api";
import "./AdminPanel.css";
export default function AdminPanel() {
    const [queue, setQueue] = useState({
        posts: [],
        listings: []
    });
    const [caption, setCaption] = useState("");
    const [pinned, setPinned] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const refresh = () => api("/admin/queue").then(setQueue);
    useEffect(() => {
        let active = true;
        api("/admin/queue")
            .then((data) => {
                if (active) setQueue(data);
            })
            .catch((e) => {
                if (active) setError(e.message);
            });
        return () => {
            active = false;
        };
    }, []);
    async function act(path, method, body) {
        setBusy(true);
        setError("");
        try {
            await api(path, {
                method,
                body: JSON.stringify(body)
            });
            await refresh();
            window.dispatchEvent(
                new Event("campus-makers-preview")
            );
            return true;
        } catch (e) {
            setError(e.message);
            return false;
        } finally {
            setBusy(false);
        }
    }
    return (
        <section className="admin-panel">
            <h2>Community administration</h2>
            <p>
                Review posts and listings before they appear
                publicly. Editing approved content sends it back
                for review.
            </p>
            {error && <p role="alert">{error}</p>}
            {["posts", "listings"].map((kind) => (
                <section key={kind}>
                    <h3>
                        {kind === "posts"
                            ? "Posts and announcements"
                            : "Listings awaiting approval"}
                    </h3>
                    {!queue[kind].length && (
                        <p>No content waiting for review.</p>
                    )}
                    {queue[kind].map((item) => (
                        <article key={item.id}>
                            <h4>
                                {item.title ||
                                    `Post by @${item.username}`}
                            </h4>
                            <p>
                                @{item.username} · {item.status}
                                {item.pinned ? " · Pinned" : ""}
                            </p>
                            <p>
                                {item.caption ||
                                    item.description}
                            </p>
                            {(item.image ||
                                (item.type === "image" &&
                                    item.mediaUrl)) && (
                                <img
                                    src={
                                        item.image ||
                                        item.mediaUrl
                                    }
                                    alt="Submitted for review"
                                />
                            )}
                            {item.type === "video" && (
                                <a
                                    href={item.mediaUrl}
                                    target="_blank"
                                    rel="noreferrer">
                                    Review video
                                </a>
                            )}
                            <div className="admin-actions">
                                <button
                                    disabled={busy}
                                    onClick={() =>
                                        act(
                                            `/admin/${kind}/${item.id}`,
                                            "PATCH",
                                            {
                                                status: "approved"
                                            }
                                        )
                                    }>
                                    Approve
                                </button>
                                <button
                                    disabled={busy}
                                    onClick={() =>
                                        act(
                                            `/admin/${kind}/${item.id}`,
                                            "PATCH",
                                            {
                                                status: "rejected"
                                            }
                                        )
                                    }>
                                    Reject
                                </button>
                                {kind === "posts" && (
                                    <button
                                        disabled={busy}
                                        onClick={() =>
                                            act(
                                                `/admin/posts/${item.id}`,
                                                "PATCH",
                                                {
                                                    status: "approved",
                                                    pinned: !item.pinned
                                                }
                                            )
                                        }>
                                        {item.pinned
                                            ? "Unpin"
                                            : "Approve and pin"}
                                    </button>
                                )}
                            </div>
                        </article>
                    ))}
                </section>
            ))}
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                        await act(
                            "/admin/announcements",
                            "POST",
                            { caption, pinned }
                        )
                    )
                        setCaption("");
                }}>
                <h3>Community announcement</h3>
                <label htmlFor="announcement">
                    Message for everyone
                </label>
                <textarea
                    id="announcement"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={2200}
                    required
                    rows={4}
                />
                <label>
                    <input
                        type="checkbox"
                        checked={pinned}
                        onChange={(e) =>
                            setPinned(e.target.checked)
                        }
                    />{" "}
                    Pin at the top of Home
                </label>
                <button disabled={busy}>
                    Publish announcement
                </button>
            </form>
            <AdminMembers />
        </section>
    );
}
