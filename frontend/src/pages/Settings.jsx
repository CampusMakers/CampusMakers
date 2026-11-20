import { useCallback, useEffect, useState } from "react";
import "./Settings.css";
import { previewStore } from "../services/previewStore";
import { signOut } from "../services/authApi";
import { api } from "../services/api";

const sections = [
    {
        id: "account",
        title: "Account Information",
        description:
            "View your profile and school information.",
        icon: "👤"
    },
    {
        id: "activities",
        title: "Manage Activities",
        description: "Manage comments, replies, and ratings.",
        icon: "☷"
    },
    {
        id: "tags",
        title: "Following Tags",
        description: "Manage the topics you follow.",
        icon: "#"
    },
    {
        id: "report",
        title: "Report a Problem",
        description:
            "Report a product, user, or technical issue.",
        icon: "⚑"
    },
    {
        id: "about",
        title: "About Us",
        description: "Learn more about Campus Makers.",
        icon: "ⓘ"
    },
    {
        id: "contact",
        title: "Contact Us",
        description: "Get help or send feedback.",
        icon: "✉"
    },
    {
        id: "logout",
        title: "Log Out",
        description: "Sign out of your account.",
        icon: "↪"
    },
    {
        id: "delete",
        title: "Delete Account",
        description: "Manage account deletion.",
        icon: "✕"
    }
];

// Temporary examples until seller-rating management is supported.
const sampleSellerRatings = [
    { id: 1, product: "Handmade Necklace", stars: 5 },
    { id: 2, product: "Custom Bracelet", stars: 4 }
];

function Settings({ onBack, profile, email, user }) {
    const viewerId = user?.id;

    const [activeSection, setActiveSection] =
        useState("account");
    const [activityTab, setActivityTab] = useState("comments");

    const [myComments, setMyComments] = useState([]);
    const [sellerComments, setSellerComments] = useState([]);
    const [sellerPostIds, setSellerPostIds] = useState([]);
    const [ratings, setRatings] = useState([]);
    const [followedTags, setFollowedTags] = useState([]);

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [actionError, setActionError] = useState("");
    const [feedback, setFeedback] = useState("");

    const [replyDrafts, setReplyDrafts] = useState({});
    const [newTag, setNewTag] = useState("");

    const [reportType, setReportType] = useState("product");
    const [reportSubject, setReportSubject] = useState("");
    const [reportDescription, setReportDescription] =
        useState("");
    const [reportPreview, setReportPreview] = useState(false);

    const [logoutError, setLogoutError] = useState("");
    const [logoutBusy, setLogoutBusy] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState("");
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const refresh = useCallback(async () => {
        if (!previewStore || !viewerId) {
            setLoading(false);
            setLoadError("Sign in to manage your activities.");
            return;
        }

        setLoading(true);

        try {
            const [
                commentsResult,
                tagsResult,
                ratingsResult,
                postsResult
            ] = await Promise.all([
                previewStore
                    .from("maker_post_comments")
                    .select(
                        "id, post_id, parent_id, author_id, author, content, created_at"
                    )
                    .eq("author_id", viewerId)
                    .order("created_at", { ascending: false }),

                previewStore
                    .from("maker_tag_follows")
                    .select("tag_name")
                    .eq("follower_id", viewerId)
                    .order("tag_name"),

                previewStore
                    .from("maker_product_ratings")
                    .select("product_id, rating")
                    .eq("user_id", viewerId),

                previewStore
                    .from("maker_posts")
                    .select("id")
                    .eq("seller_id", viewerId)
            ]);

            for (const result of [
                commentsResult,
                tagsResult,
                ratingsResult,
                postsResult
            ]) {
                if (result.error) throw result.error;
            }

            const postIds = (postsResult.data || []).map(
                (post) => post.id
            );

            let postComments = [];

            if (postIds.length > 0) {
                const result = await previewStore
                    .from("maker_post_comments")
                    .select(
                        "id, post_id, parent_id, author_id, author, content, created_at"
                    )
                    .in("post_id", postIds)
                    .order("created_at", { ascending: true });

                if (result.error) throw result.error;
                postComments = result.data || [];
            }

            setMyComments(commentsResult.data || []);
            setFollowedTags(
                (tagsResult.data || []).map(
                    (item) => item.tag_name
                )
            );
            setRatings(ratingsResult.data || []);
            setSellerPostIds(postIds);
            setSellerComments(postComments);
            setLoadError("");
        } catch (error) {
            console.error(
                "Settings data could not load:",
                error
            );
            setLoadError(
                "Some account activities could not be loaded. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, [viewerId]);

    useEffect(() => {
        let active = true;
        Promise.resolve().then(() => { if (active) refresh(); });
        return () => { active = false; };
    }, [refresh]);

    async function runMutation(action, successMessage) {
        if (busy) return false;

        setBusy(true);
        setActionError("");
        setFeedback("");

        try {
            const result = await action();

            if (result.error) throw result.error;

            await refresh();
            setFeedback(successMessage);
            return true;
        } catch (error) {
            console.error("Settings action failed:", error);
            setActionError(
                error.message ||
                    "Something went wrong. Please try again."
            );
            return false;
        } finally {
            setBusy(false);
        }
    }

    async function deleteComment(id) {
        if (
            !window.confirm(
                "Delete this comment? Any replies to it may also be removed."
            )
        )
            return;

        await runMutation(
            () =>
                previewStore
                    .from("maker_post_comments")
                    .delete()
                    .eq("id", id)
                    .eq("author_id", viewerId),
            "Comment deleted."
        );
    }

    async function replyToComment(comment) {
        const text = (replyDrafts[comment.id] || "").trim();

        if (!text || text.length > 1000) return;

        const saved = await runMutation(
            () =>
                previewStore.from("maker_post_comments").insert({
                    post_id: comment.post_id,
                    parent_id: comment.id,
                    author_id: viewerId,
                    content: text
                }),
            "Your public reply was posted."
        );

        if (saved) {
            setReplyDrafts((current) => ({
                ...current,
                [comment.id]: ""
            }));
        }
    }

    async function updateRating(productId, stars) {
        await runMutation(
            () =>
                previewStore
                    .from("maker_product_ratings")
                    .update({ rating: stars })
                    .eq("product_id", productId)
                    .eq("user_id", viewerId),
            "Your product rating was updated."
        );
    }

    async function addTag(event) {
        event.preventDefault();

        const tag = newTag
            .trim()
            .replace(/^#/, "")
            .toLowerCase();

        if (!tag) return;

        if (followedTags.includes(tag)) {
            setActionError(
                "You're already following this tag."
            );
            return;
        }

        const saved = await runMutation(
            () =>
                previewStore.from("maker_tag_follows").insert({
                    follower_id: viewerId,
                    tag_name: tag
                }),
            `You are now following #${tag}.`
        );

        if (saved) setNewTag("");
    }

    async function unfollowTag(tag) {
        await runMutation(
            () =>
                previewStore
                    .from("maker_tag_follows")
                    .delete()
                    .eq("follower_id", viewerId)
                    .eq("tag_name", tag),
            `You unfollowed #${tag}.`
        );
    }

    async function logout() {
        setLogoutError("");
        setLogoutBusy(true);
        try {
            await signOut();
        } catch {
            // The local token is cleared either way, so this browser is signed out.
        } finally {
            setLogoutBusy(false);
        }
        window.location.hash = "login";
    }

    const accountUsername =
        profile?.username || user?.username || "";
    const deleteMatches =
        Boolean(accountUsername) &&
        deleteConfirm.trim().replace(/^@/, "").toLowerCase() ===
            accountUsername.toLowerCase();

    async function deleteAccount(event) {
        event.preventDefault();
        if (!deleteMatches || deleteBusy) return;
        setDeleteError("");
        setDeleteBusy(true);
        try {
            await api("/users/me", { method: "DELETE" });
        } catch (error) {
            setDeleteError(
                error.message || "Could not delete your account."
            );
            setDeleteBusy(false);
            return;
        }
        // Sessions are gone server-side; clear the local token too.
        try {
            await signOut();
        } catch {
            // Token is cleared in signOut's finally block.
        }
        window.location.hash = "login";
        window.location.reload();
    }

    const sellerRoots = sellerComments.filter(
        (comment) => !comment.parent_id
    );

    const activityTabs = [
        { id: "comments", title: "My Comments" },
        { id: "seller", title: "Seller Comments" },
        { id: "ratings", title: "My Ratings" }
    ];

    return (
        <div className="settings-page">
            <button
                type="button"
                className="settings-back"
                onClick={onBack}>
                ← Back to Profile
            </button>

            <div className="settings-header">
                <div className="settings-header-icon">⚙</div>
                <h2>Settings</h2>
                <p>
                    Manage your Campus Makers account and
                    preferences.
                </p>
            </div>

            <div className="settings-container">
                <nav
                    className="settings-menu"
                    aria-label="Settings sections">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            type="button"
                            className={`settings-menu-item ${
                                activeSection === section.id
                                    ? "settings-menu-active"
                                    : ""
                            } ${
                                section.id === "delete"
                                    ? "settings-menu-danger"
                                    : ""
                            }`}
                            aria-current={
                                activeSection === section.id
                                    ? "page"
                                    : undefined
                            }
                            onClick={() => {
                                setActiveSection(section.id);
                                setActionError("");
                                setFeedback("");
                            }}>
                            <span className="settings-menu-icon">
                                {section.icon}
                            </span>

                            <span className="settings-menu-text">
                                <strong>{section.title}</strong>
                                <small>
                                    {section.description}
                                </small>
                            </span>

                            <span
                                className="settings-menu-arrow"
                                aria-hidden="true">
                                ›
                            </span>
                        </button>
                    ))}
                </nav>

                <section className="settings-content">
                    {activeSection === "account" && (
                        <>
                            <h3>Account Information</h3>

                            <p className="settings-description">
                                Your Campus Makers profile
                                information.
                            </p>

                            <div className="settings-info-row">
                                <span>Display Name</span>
                                <strong>
                                    {profile?.name ||
                                        "Your Name"}
                                </strong>
                            </div>

                            <div className="settings-info-row">
                                <span>Username</span>
                                <strong>
                                    @
                                    {profile?.username ||
                                        "username"}
                                </strong>
                            </div>

                            <div className="settings-info-row">
                                <span>Email</span>
                                <strong>{email}</strong>
                            </div>

                            <div className="settings-info-row">
                                <span>University</span>
                                <strong>
                                    Not connected yet
                                </strong>
                            </div>

                            <p className="settings-note">
                                This preview saves profile changes
                                in this browser through your
                                profile editor.
                            </p>
                        </>
                    )}

                    {activeSection === "activities" && (
                        <>
                            <h3>Manage Activities</h3>

                            <p className="settings-description">
                                View and manage your comments,
                                public replies, and product
                                ratings.
                            </p>

                            <div className="settings-tabs">
                                {activityTabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        className={
                                            activityTab ===
                                            tab.id
                                                ? "settings-tab-active"
                                                : ""
                                        }
                                        aria-pressed={
                                            activityTab ===
                                            tab.id
                                        }
                                        onClick={() => {
                                            setActivityTab(
                                                tab.id
                                            );
                                            setActionError("");
                                            setFeedback("");
                                        }}>
                                        {tab.title}
                                    </button>
                                ))}
                            </div>

                            {loading && (
                                <p className="settings-description">
                                    Loading activities...
                                </p>
                            )}

                            {loadError && (
                                <p
                                    className="settings-form-error"
                                    role="alert">
                                    {loadError}
                                </p>
                            )}

                            {!loading &&
                                activityTab === "comments" && (
                                    <div className="settings-list">
                                        <h4>
                                            My Comments &
                                            Replies
                                        </h4>

                                        {myComments.length ===
                                            0 && (
                                            <p className="settings-empty">
                                                You haven't
                                                commented on any
                                                posts yet.
                                            </p>
                                        )}

                                        {myComments.map(
                                            (comment) => (
                                                <article
                                                    className="settings-activity-card"
                                                    key={
                                                        comment.id
                                                    }>
                                                    <span className="settings-card-meta">
                                                        {comment.parent_id
                                                            ? "Your reply"
                                                            : "Your comment"}
                                                        {
                                                            " · Post #"
                                                        }
                                                        {
                                                            comment.post_id
                                                        }
                                                    </span>

                                                    <p>
                                                        {
                                                            comment.content
                                                        }
                                                    </p>

                                                    <div className="settings-inline-actions">
                                                        <button
                                                            type="button"
                                                            className="settings-action-danger"
                                                            disabled={
                                                                busy
                                                            }
                                                            onClick={() =>
                                                                deleteComment(
                                                                    comment.id
                                                                )
                                                            }>
                                                            Delete
                                                        </button>
                                                    </div>
                                                </article>
                                            )
                                        )}
                                    </div>
                                )}

                            {!loading &&
                                activityTab === "seller" && (
                                    <div className="settings-list">
                                        <h4>
                                            Comments on Your
                                            Posts
                                        </h4>

                                        <p className="settings-description">
                                            Reply to people
                                            commenting on your
                                            published seller
                                            posts.
                                        </p>

                                        {sellerPostIds.length ===
                                            0 && (
                                            <p className="settings-empty">
                                                You don't have
                                                any published
                                                seller posts
                                                yet.
                                            </p>
                                        )}

                                        {sellerPostIds.length >
                                            0 &&
                                            sellerRoots.length ===
                                                0 && (
                                                <p className="settings-empty">
                                                    Your posts
                                                    don't have
                                                    any comments
                                                    yet.
                                                </p>
                                            )}

                                        {sellerRoots.map(
                                            (comment) => {
                                                const replies =
                                                    sellerComments.filter(
                                                        (
                                                            item
                                                        ) =>
                                                            item.parent_id ===
                                                            comment.id
                                                    );

                                                const isOwn =
                                                    comment.author_id ===
                                                    viewerId;

                                                return (
                                                    <article
                                                        key={
                                                            comment.id
                                                        }
                                                        className="settings-activity-card">
                                                        <span className="settings-card-meta">
                                                            Post
                                                            #
                                                            {
                                                                comment.post_id
                                                            }
                                                        </span>

                                                        <p>
                                                            <strong>
                                                                {
                                                                    comment.author
                                                                }
                                                            </strong>{" "}
                                                            {
                                                                comment.content
                                                            }
                                                        </p>

                                                        {isOwn && (
                                                            <button
                                                                type="button"
                                                                className="settings-action-danger"
                                                                disabled={
                                                                    busy
                                                                }
                                                                onClick={() =>
                                                                    deleteComment(
                                                                        comment.id
                                                                    )
                                                                }>
                                                                Delete
                                                                My
                                                                Comment
                                                            </button>
                                                        )}

                                                        {replies.map(
                                                            (
                                                                reply
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        reply.id
                                                                    }
                                                                    className="settings-seller-reply">
                                                                    <span className="settings-card-meta">
                                                                        {
                                                                            reply.author
                                                                        }
                                                                    </span>

                                                                    <p>
                                                                        {
                                                                            reply.content
                                                                        }
                                                                    </p>

                                                                    {reply.author_id ===
                                                                        viewerId && (
                                                                        <button
                                                                            type="button"
                                                                            className="settings-action-danger"
                                                                            disabled={
                                                                                busy
                                                                            }
                                                                            onClick={() =>
                                                                                deleteComment(
                                                                                    reply.id
                                                                                )
                                                                            }>
                                                                            Delete
                                                                            My
                                                                            Reply
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )
                                                        )}

                                                        {!isOwn && (
                                                            <>
                                                                <label
                                                                    className="settings-field"
                                                                    htmlFor={`reply-${comment.id}`}>
                                                                    Public
                                                                    reply
                                                                </label>

                                                                <textarea
                                                                    id={`reply-${comment.id}`}
                                                                    className="settings-textarea"
                                                                    rows={
                                                                        2
                                                                    }
                                                                    maxLength={
                                                                        1000
                                                                    }
                                                                    value={
                                                                        replyDrafts[
                                                                            comment
                                                                                .id
                                                                        ] ||
                                                                        ""
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setReplyDrafts(
                                                                            (
                                                                                current
                                                                            ) => ({
                                                                                ...current,
                                                                                [comment.id]:
                                                                                    event
                                                                                        .target
                                                                                        .value
                                                                            })
                                                                        )
                                                                    }
                                                                    placeholder="Write a reply..."
                                                                />

                                                                <button
                                                                    type="button"
                                                                    className="settings-action"
                                                                    disabled={
                                                                        busy ||
                                                                        !(
                                                                            replyDrafts[
                                                                                comment
                                                                                    .id
                                                                            ] ||
                                                                            ""
                                                                        ).trim()
                                                                    }
                                                                    onClick={() =>
                                                                        replyToComment(
                                                                            comment
                                                                        )
                                                                    }>
                                                                    Post
                                                                    Reply
                                                                </button>
                                                            </>
                                                        )}
                                                    </article>
                                                );
                                            }
                                        )}

                                        <h4>
                                            Customer Product
                                            Ratings
                                        </h4>

                                        <p className="settings-note settings-demo-note">
                                            Demo preview —
                                            customer ratings
                                            will be connected to
                                            seller products in a
                                            future sprint.
                                        </p>

                                        {sampleSellerRatings.map(
                                            (rating) => (
                                                <article
                                                    className="settings-activity-card"
                                                    key={
                                                        rating.id
                                                    }>
                                                    <strong>
                                                        {
                                                            rating.product
                                                        }
                                                    </strong>

                                                    <p className="settings-rating-display">
                                                        {"★".repeat(
                                                            rating.stars
                                                        )}
                                                        {"☆".repeat(
                                                            5 -
                                                                rating.stars
                                                        )}
                                                    </p>
                                                </article>
                                            )
                                        )}
                                    </div>
                                )}

                            {!loading &&
                                activityTab === "ratings" && (
                                    <div className="settings-list">
                                        <h4>
                                            My Product Ratings
                                        </h4>

                                        <p className="settings-description">
                                            These ratings are
                                            saved to your
                                            account.
                                        </p>

                                        {ratings.length ===
                                            0 && (
                                            <p className="settings-empty">
                                                You haven't
                                                rated any
                                                products yet.
                                            </p>
                                        )}

                                        {ratings.map(
                                            (rating) => (
                                                <article
                                                    className="settings-activity-card"
                                                    key={
                                                        rating.product_id
                                                    }>
                                                    <strong>
                                                        Product
                                                        #
                                                        {
                                                            rating.product_id
                                                        }
                                                    </strong>

                                                    <p className="settings-card-meta">
                                                        Your
                                                        rating
                                                    </p>

                                                    <div
                                                        className="settings-stars"
                                                        role="group"
                                                        aria-label={`Rate product ${rating.product_id}`}>
                                                        {[
                                                            1,
                                                            2,
                                                            3,
                                                            4, 5
                                                        ].map(
                                                            (
                                                                star
                                                            ) => (
                                                                <button
                                                                    key={
                                                                        star
                                                                    }
                                                                    type="button"
                                                                    disabled={
                                                                        busy
                                                                    }
                                                                    aria-label={`${star} stars`}
                                                                    aria-pressed={
                                                                        rating.rating ===
                                                                        star
                                                                    }
                                                                    className={
                                                                        star <=
                                                                        rating.rating
                                                                            ? "settings-star-filled"
                                                                            : ""
                                                                    }
                                                                    onClick={() =>
                                                                        updateRating(
                                                                            rating.product_id,
                                                                            star
                                                                        )
                                                                    }>
                                                                    ★
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </article>
                                            )
                                        )}

                                        <p className="settings-note">
                                            You can update a
                                            rating here. Rating
                                            deletion isn't
                                            currently supported
                                            by the database.
                                        </p>
                                    </div>
                                )}
                        </>
                    )}

                    {activeSection === "tags" && (
                        <>
                            <h3>Following Tags</h3>

                            <p className="settings-description">
                                Manage the topics you follow on
                                Campus Makers.
                            </p>

                            {loading && (
                                <p className="settings-description">
                                    Loading followed tags...
                                </p>
                            )}

                            {loadError && (
                                <p
                                    className="settings-form-error"
                                    role="alert">
                                    {loadError}
                                </p>
                            )}

                            {!loading && (
                                <div className="settings-list">
                                    {followedTags.length ===
                                        0 && (
                                        <p className="settings-empty">
                                            You're not following
                                            any tags yet.
                                        </p>
                                    )}

                                    {followedTags.map((tag) => (
                                        <div
                                            className="settings-tag-row"
                                            key={tag}>
                                            <strong>
                                                #{tag}
                                            </strong>

                                            <button
                                                type="button"
                                                className="settings-action-danger"
                                                disabled={busy}
                                                onClick={() =>
                                                    unfollowTag(
                                                        tag
                                                    )
                                                }>
                                                Unfollow
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <form
                                className="settings-form"
                                onSubmit={addTag}>
                                <label
                                    className="settings-field"
                                    htmlFor="settings-new-tag">
                                    Follow another tag
                                </label>

                                <input
                                    id="settings-new-tag"
                                    className="settings-input"
                                    value={newTag}
                                    maxLength={40}
                                    onChange={(event) =>
                                        setNewTag(
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. jewelry"
                                    required
                                />

                                <button
                                    type="submit"
                                    className="settings-action"
                                    disabled={
                                        busy || !newTag.trim()
                                    }>
                                    Follow Tag
                                </button>
                            </form>
                        </>
                    )}

                    {["activities", "tags"].includes(
                        activeSection
                    ) && (
                        <>
                            {actionError && (
                                <p
                                    className="settings-form-error"
                                    role="alert">
                                    {actionError}
                                </p>
                            )}

                            {feedback && (
                                <p
                                    className="settings-note"
                                    role="status">
                                    {feedback}
                                </p>
                            )}
                        </>
                    )}

                    {activeSection === "report" && (
                        <>
                            <h3>Report a Problem</h3>

                            <p className="settings-description">
                                Report issues with products,
                                users, or the Campus Makers app.
                            </p>

                            <p className="settings-note settings-demo-note">
                                Demo preview — this form does
                                not send or save reports yet.
                            </p>

                            <form
                                className="settings-form"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    setReportPreview(true);
                                }}>
                                <label
                                    className="settings-field"
                                    htmlFor="report-type">
                                    What are you reporting?
                                </label>

                                <select
                                    id="report-type"
                                    className="settings-input"
                                    value={reportType}
                                    onChange={(event) => {
                                        setReportType(
                                            event.target.value
                                        );
                                        setReportPreview(false);
                                    }}>
                                    <option value="product">
                                        Product or Listing
                                    </option>
                                    <option value="user">
                                        User or Seller
                                    </option>
                                    <option value="app">
                                        Technical Issue
                                    </option>
                                    <option value="other">
                                        Other
                                    </option>
                                </select>

                                <label
                                    className="settings-field"
                                    htmlFor="report-subject">
                                    Subject
                                </label>

                                <input
                                    id="report-subject"
                                    className="settings-input"
                                    value={reportSubject}
                                    maxLength={120}
                                    required
                                    placeholder="Briefly describe the issue"
                                    onChange={(event) => {
                                        setReportSubject(
                                            event.target.value
                                        );
                                        setReportPreview(false);
                                    }}
                                />

                                <label
                                    className="settings-field"
                                    htmlFor="report-description">
                                    Description
                                </label>

                                <textarea
                                    id="report-description"
                                    className="settings-textarea"
                                    rows={5}
                                    maxLength={2000}
                                    required
                                    placeholder="Tell us what happened..."
                                    value={reportDescription}
                                    onChange={(event) => {
                                        setReportDescription(
                                            event.target.value
                                        );
                                        setReportPreview(false);
                                    }}
                                />

                                <button
                                    type="submit"
                                    className="settings-action">
                                    Preview Report
                                </button>

                                {reportPreview && (
                                    <p
                                        className="settings-note"
                                        role="status">
                                        Your report form is
                                        complete. This is a demo
                                        preview; nothing has
                                        been submitted.
                                    </p>
                                )}
                            </form>
                        </>
                    )}

                    {activeSection === "about" && (
                        <>
                            <h3>About Campus Makers</h3>

                            <p className="settings-description">
                                Campus Makers is a
                                student-focused marketplace
                                connecting campus creators with
                                students who want to discover
                                and support their work.
                            </p>

                            <p className="settings-description">
                                Our goal is to make it easier to
                                discover handmade products,
                                connect with creators, and
                                participate in campus events.
                            </p>
                        </>
                    )}

                    {activeSection === "contact" && (
                        <>
                            <h3>Contact Us</h3>

                            <p className="settings-description">
                                Have a question, suggestion, or
                                issue?
                            </p>

                            <p className="settings-note">
                                Our support contact details will
                                be available in a future update.
                            </p>

                            <button
                                type="button"
                                className="settings-action"
                                onClick={() =>
                                    setActiveSection("report")
                                }>
                                Open Report Form
                            </button>
                        </>
                    )}

                    {activeSection === "logout" && (
                        <>
                            <h3>Log Out</h3>

                            <p className="settings-description">
                                Sign out of your Campus Makers
                                account.
                            </p>

                            <button
                                type="button"
                                className="settings-action"
                                onClick={logout}
                                disabled={logoutBusy}>
                                {logoutBusy
                                    ? "Signing out…"
                                    : "Log Out"}
                            </button>

                            {logoutError && (
                                <p
                                    role="alert"
                                    className="settings-form-error">
                                    {logoutError}
                                </p>
                            )}
                        </>
                    )}

                    {activeSection === "delete" && (
                        <>
                            <h3>Delete Account</h3>

                            <p className="settings-description">
                                Account deletion will allow
                                users to request removal of
                                their Campus Makers account.
                            </p>

                            <p className="settings-warning">
                                This permanently deletes your
                                account, store, listings, posts,
                                comments, messages, and follows.
                                Open orders will be cancelled.
                                This cannot be undone.
                            </p>

                            <form
                                className="settings-form"
                                onSubmit={deleteAccount}>
                                <label
                                    className="settings-field"
                                    htmlFor="settings-delete-confirm">
                                    Type{" "}
                                    <code
                                        style={{
                                            userSelect: "all",
                                            fontWeight: 700
                                        }}>
                                        {accountUsername}
                                    </code>{" "}
                                    to confirm
                                </label>

                                <input
                                    id="settings-delete-confirm"
                                    className="settings-input"
                                    value={deleteConfirm}
                                    autoComplete="off"
                                    autoCapitalize="off"
                                    spellCheck={false}
                                    onChange={(event) =>
                                        setDeleteConfirm(
                                            event.target.value
                                        )
                                    }
                                    placeholder={
                                        accountUsername
                                    }
                                />

                                <button
                                    type="submit"
                                    className="settings-action settings-action-danger"
                                    disabled={
                                        !deleteMatches ||
                                        deleteBusy
                                    }>
                                    {deleteBusy
                                        ? "Deleting…"
                                        : "Permanently Delete Account"}
                                </button>
                            </form>

                            {deleteError && (
                                <p
                                    role="alert"
                                    className="settings-form-error">
                                    {deleteError}
                                </p>
                            )}
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}

export default Settings;