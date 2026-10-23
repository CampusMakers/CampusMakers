import { useState } from "react";
import "./Explore.css";

import { explorePosts, postTags } from "./exploreData";

function CreatorLink({ creator, onOpenSeller }) {
    return (
        <button
            type="button"
            className="explore-creator-link"
            onClick={(event) => {
                event.stopPropagation();
                onOpenSeller(creator);
            }}
            onKeyDown={(event) => event.stopPropagation()}>
            <span className="explore-avatar" aria-hidden="true">
                {creator.slice(1, 3).toUpperCase()}
            </span>
            <span className="explore-creator">{creator}</span>
        </button>
    );
}

export function PostCard({ post, onOpenPost, onOpenSeller }) {
    return (
        <article
            className={`explore-card ${post.layout} ${post.type}`}
            role="link"
            tabIndex="0"
            onClick={() => onOpenPost(post.id)}
            onKeyDown={(event) => {
                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    onOpenPost(post.id);
                }
            }}>
            <div className="explore-card-body">
                <CreatorLink
                    creator={post.creator}
                    onOpenSeller={onOpenSeller}
                />
                {post.type !== "text" ? (
                    <div className="explore-media-button">
                        <span
                            className={`explore-visual ${post.tone}`}
                            role="img"
                            aria-label={`${post.type} placeholder`}>
                            {post.type === "video" ? (
                                <span className="explore-play" aria-label="Play video">
                                    {"\u25b6"}
                                </span>
                            ) : (
                                <span className="explore-placeholder-label">
                                    Photo
                                </span>
                            )}
                        </span>
                    </div>
                ) : (
                    <p className="explore-caption preview">
                        {post.caption}
                    </p>
                )}
            </div>
        </article>
    );
}

export function ExplorePage({
    posts,
    onOpenPost,
    onOpenSeller
}) {
    const [query, setQuery] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [activeFilter, setActiveFilter] =
        useState("All posts");
    const filteredPosts = posts.filter(
        (post) =>
            `${post.creator} ${post.caption} ${postTags(post).join(" ")}`
                .toLowerCase()
                .includes(query.trim().toLowerCase()) &&
            (activeFilter === "All posts" ||
                (activeFilter === "Photos" &&
                    post.type === "image") ||
                (activeFilter === "Videos" &&
                    post.type === "video") ||
                (activeFilter === "Text" &&
                    post.type === "text"))
    );
    return (
        <div className="explore-page">
            <label className="explore-search">
                <span aria-hidden="true">⌕</span>
                <input
                    type="search"
                    placeholder="Search creators, projects, and ideas"
                    value={query}
                    onChange={(event) =>
                        setQuery(event.target.value)
                    }
                />
            </label>
            <div className="explore-filter-row">
                <button
                    className="explore-filter-button"
                    aria-expanded={filterOpen}
                    onClick={() => setFilterOpen(!filterOpen)}>
                    Filter
                </button>
            </div>
            {filterOpen && (
                <div className="explore-filter-panel">
                    {[
                        "All posts",
                        "Photos",
                        "Videos",
                        "Text"
                    ].map((filter) => (
                        <button
                            className={`explore-filter-option${activeFilter === filter ? " selected" : ""}`}
                            key={filter}
                            onClick={() =>
                                setActiveFilter(filter)
                            }>
                            {filter}
                        </button>
                    ))}
                </div>
            )}
            {filteredPosts.length ? (
                <div className="explore-grid">
                    {filteredPosts.map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            onOpenPost={onOpenPost}
                            onOpenSeller={onOpenSeller}
                        />
                    ))}
                </div>
            ) : (
                <div className="explore-empty">
                    No posts match your search.
                </div>
            )}
        </div>
    );
}

export function PostDetail({
    post,
    backLabel = "Back to Explore",
    onBack,
    onOpenPost,
    onOpenSeller
}) {
    const [liked, setLiked] = useState(false),
        [likeCount, setLikeCount] = useState(18 + post.id * 3),
        [comments, setComments] = useState([
            {
                id: 1,
                author: "@nina.draws",
                text: "This is so lovely!"
            },
            {
                id: 2,
                author: "@alex.makes",
                text: "Saving this for inspiration."
            },
            {
                id: 3,
                author: "@studiojo",
                text: "The color palette is perfect."
            },
            {
                id: 4,
                author: "@sam.crafts",
                text: "Can't wait to see what you make next."
            }
        ]),
        [showAll, setShowAll] = useState(false),
        [draft, setDraft] = useState("");
    const suggestions = explorePosts
        .filter((item) => item.id !== post.id)
        .map((item) => ({
            item,
            score:
                postTags(item).filter((tag) =>
                    postTags(post).includes(tag)
                ).length *
                    2 +
                Number(item.type === post.type)
        }))
        .sort(
            (a, b) => b.score - a.score || a.item.id - b.item.id
        )
        .slice(0, 4)
        .map(({ item }) => item);
    const addComment = (event) => {
        event.preventDefault();
        if (!draft.trim()) return;
        setComments([
            ...comments,
            {
                id: Date.now(),
                author: "@you",
                text: draft.trim()
            }
        ]);
        setDraft("");
        setShowAll(true);
    };
    return (
        <section className="explore-post-page">
            <button
                type="button"
                className="explore-back"
                onClick={onBack}>
                ← {backLabel}
            </button>
            <article className="explore-post-detail">
                <CreatorLink
                    creator={post.creator}
                    onOpenSeller={onOpenSeller}
                />
                {post.type !== "text" ? (
                    <div
                        className={`explore-visual ${post.tone}`}
                        role="img">
                        {post.type === "video" ? (
                            <span className="explore-play" aria-label="Play video">
                                {"\u25b6"}
                            </span>
                        ) : (
                            <span className="explore-placeholder-label">
                                Photo
                            </span>
                        )}
                    </div>
                ) : (
                    <p className="explore-detail-text">
                        {post.caption}
                    </p>
                )}
                <div className="explore-detail-body">
                    <p className="explore-caption">
                        {post.caption}
                    </p>
                    <div className="explore-tag-list">
                        {postTags(post).map((tag) => (
                            <span
                                className="explore-tag"
                                key={tag}>
                                {tag}
                            </span>
                        ))}
                    </div>
                    <div className="explore-engagement">
                        <button
                            className={liked ? "is-liked" : ""}
                            aria-label={
                                liked ? "Unlike" : "Like"
                            }
                            onClick={() => {
                                setLiked(!liked);
                                setLikeCount(
                                    likeCount + (liked ? -1 : 1)
                                );
                            }}>
                            <span className="explore-heart">
                                {liked ? "♥" : "♡"}
                            </span>
                            {likeCount}
                        </button>
                        <span>{comments.length} comments</span>
                    </div>
                    <section className="explore-comments">
                        <h2>Comments</h2>
                        {(showAll
                            ? comments
                            : comments.slice(0, 2)
                        ).map((comment) => (
                            <div
                                className="explore-comment"
                                key={comment.id}>
                                <strong>
                                    {comment.author}
                                </strong>{" "}
                                {comment.text}
                                {comment.author === "@you" && (
                                    <button
                                        onClick={() =>
                                            setComments(
                                                comments.filter(
                                                    (item) =>
                                                        item.id !==
                                                        comment.id
                                                )
                                            )
                                        }>
                                        Delete
                                    </button>
                                )}
                            </div>
                        ))}
                        {comments.length > 2 && (
                            <button
                                className="explore-more-comments"
                                onClick={() =>
                                    setShowAll(!showAll)
                                }>
                                {showAll
                                    ? "Show fewer comments"
                                    : `See ${comments.length - 2} more comments`}
                            </button>
                        )}
                        <form
                            className="explore-comment-form"
                            onSubmit={addComment}>
                            <input
                                value={draft}
                                onChange={(event) =>
                                    setDraft(event.target.value)
                                }
                                placeholder="Add a comment"
                            />
                            <button>Post</button>
                        </form>
                    </section>
                </div>
            </article>
            <section className="explore-suggestions">
                <div className="explore-suggestions-heading">
                    <h2>Suggested posts</h2>
                    <span>{suggestions.length} posts</span>
                </div>
                <div className="explore-grid">
                    {suggestions.map((item) => (
                        <PostCard
                            key={item.id}
                            post={item}
                            onOpenPost={onOpenPost}
                            onOpenSeller={onOpenSeller}
                        />
                    ))}
                </div>
            </section>
        </section>
    );
}

export function SellerProfilePage({ seller, onBack }) {
    return (
        <section className="seller-profile-page">
            <button
                type="button"
                className="explore-back"
                onClick={onBack}>
                ← Back to Explore
            </button>
            <div className="seller-profile-card">
                <div className="seller-profile-avatar">
                    {seller.slice(1, 3).toUpperCase()}
                </div>
                <p>Campus Makers seller</p>
                <h2>{seller}</h2>
                <p>
                    Verified student creator sharing original
                    work with the campus community.
                </p>
                <button className="seller-profile-action">
                    View listings
                </button>
            </div>
        </section>
    );
}
