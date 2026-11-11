import { useEffect, useState } from "react";
import "./Explore.css";

import { explorePosts, isAdminPostPinned, postTags } from "./exploreData";
import { supabase } from "../../services/supabase";
import { useFollows } from "../../services/useFollows";
import { useTagFollow } from "../../services/useTagFollow";
import EventManager from "../EventManager";
import PostComments from "../PostComments";
import { formatScheduledTime } from "../../services/dateTime";

const mentionPattern = /(^|\s)(@[a-z0-9._-]+)/gi;

function MentionText({ children, onOpenSeller }) {
    if (!onOpenSeller || typeof children !== "string") return children;
    return children.split(mentionPattern).map((part, index) =>
        part?.startsWith("@") ? (
            <button
                className="explore-mention"
                key={`${part}-${index}`}
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onOpenSeller(part);
                }}>
                {part}
            </button>
        ) : (
            part
        )
    );
}

const postAuthors = (post) =>
    Array.isArray(post.collaborators) && post.collaborators.length > 1
        ? post.collaborators
        : [post.creator];

function CreatorLink({ creator, onOpenSeller }) {
    const creatorLengthClass =
        creator.length > 15
            ? " explore-creator-extra-long"
            : creator.length > 12
              ? " explore-creator-long"
              : "";

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
            <span
                className={`explore-creator${creatorLengthClass}`}>
                {creator}
            </span>
        </button>
    );
}

function PinIcon() {
    return <svg className="admin-pin-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l-1 6 3 3v2H6v-2l3-3-1-6Zm4 11v7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PostAuthors({ post, onOpenSeller, expanded = false }) {
    const authors = postAuthors(post);
    const isCollaboration = authors.length > 1;
    const authorNames = authors.join(" · ");
    const shouldCollapse = authorNames.length > 36;

    if (!isCollaboration) {
        return <CreatorLink creator={authors[0]} onOpenSeller={onOpenSeller} />;
    }

    return (
        <div className={`explore-authors${expanded ? " explore-authors-expanded" : ""}`}>
            <div className="explore-avatar-stack">
                {authors.slice(0, 3).map((author) => (
                    <button
                        className="explore-avatar"
                        key={author}
                        type="button"
                        aria-label={`Open ${author}'s profile`}
                        onClick={(event) => {
                            event.stopPropagation();
                            onOpenSeller(author);
                        }}>
                        {author.replace("@", "").slice(0, 2).toUpperCase()}
                    </button>
                ))}
            </div>
            {expanded && shouldCollapse ? (
                <details className="explore-collaborators">
                    <summary aria-label="Show collaboration participants">
                        {authors.length} collaborators
                    </summary>
                    <div>
                        {authors.map((author) => (
                            <button key={author} type="button" onClick={() => onOpenSeller(author)}>
                                <span className="explore-avatar" aria-hidden="true">
                                    {author.replace("@", "").slice(0, 2).toUpperCase()}
                                </span>
                                <span>{author}</span>
                            </button>
                        ))}
                    </div>
                </details>
            ) : (
                <div className="explore-collaborator-names" title={authors.join(", ")}>
                    {authors.map((author, index) => (
                        <button
                            type="button"
                            key={author}
                            onClick={(event) => {
                                event.stopPropagation();
                                onOpenSeller(author);
                            }}>
                            {author}{index < authors.length - 1 ? " · " : ""}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

const displayNameFromUsername = (username) =>
    username
        .replace(/^@/, "")
        .split(/[._-]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

const newestFirst = (items) =>
    [...items].sort((a, b) => {
        const timeDifference = new Date(b.created_at || 0) - new Date(a.created_at || 0);
        return timeDifference || String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
    });

const toExploreCardPost = (post) => ({
    ...post,
    id: post.seller_id && !String(post.id).startsWith("post-") ? `post-${post.id}` : post.id,
    type: post.type || post.post_type || (post.image ? "image" : "text"),
    tags: post.tags || ["Campus makers"],
    layout: post.layout || "standard",
    tone: post.tone || "peach"
});

const demoBuyerProfiles = {
    "@ava.collects": { name: "Ava Chen", seller_verified: false },
    "@milo.buys": { name: "Milo Reyes", seller_verified: false },
    "@riley.student": { name: "Riley Morgan", seller_verified: false },
    "@nora.shops": { name: "Nora Patel", seller_verified: false }
};

function CreatorResult({ creator, onOpenSeller }) {
    return (
        <button
            className="explore-creator-result"
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onOpenSeller(creator.username)}>
            <span className="explore-creator-result-avatar" aria-hidden="true">
                {creator.image ? <img src={creator.image} alt="" /> : creator.username.slice(1, 3).toUpperCase()}
            </span>
            <span>
                <strong>{creator.username}</strong>
                {creator.name && <small>{creator.name}</small>}
            </span>
        </button>
    );
}

function PostResults({ posts, onOpenPost, onOpenSeller, emptyMessage }) {
    if (!posts.length) return <div className="explore-empty">{emptyMessage}</div>;

    const columns = [[], [], []];
    posts.forEach((post, index) => columns[index % columns.length].push(post));
    return (
        <div className="explore-search-masonry">
            {columns.map((column, index) => (
                <div className="explore-search-column" key={index}>
                    {column.map((post) => (
                        <PostCard key={post.id} post={post} onOpenPost={onOpenPost} onOpenSeller={onOpenSeller} />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function TagPage({ tag, posts, viewerId, onBack, onOpenPost, onOpenSeller }) {
    const [signInPromptOpen, setSignInPromptOpen] = useState(false);
    const taggedPosts = posts.filter((post) =>
        postTags(post).some((postTag) => postTag.toLowerCase() === tag.toLowerCase())
    );
    const { isFollowing, busy, error, toggleFollow } = useTagFollow(tag, viewerId);

    return (
        <section className="tag-page" aria-labelledby="tag-page-title">
            <button type="button" className="explore-back" onClick={onBack}>
                ← Back to Explore
            </button>
            <header className="tag-page-header">
                <div>
                    <p className="tag-page-eyebrow">Tag</p>
                    <h2 id="tag-page-title">#{tag}</h2>
                    <p>{taggedPosts.length} {taggedPosts.length === 1 ? "post" : "posts"}</p>
                </div>
                <button
                    type="button"
                    className={`tag-follow-button${isFollowing ? " is-following" : ""}`}
                    disabled={busy}
                    onClick={() => {
                        if (!viewerId) {
                            setSignInPromptOpen(true);
                            return;
                        }
                        toggleFollow();
                    }}>
                    {busy ? "Saving…" : isFollowing ? "Following" : "Follow"}
                </button>
            </header>
            {error && <p className="tag-follow-error" role="alert">{error}</p>}
            <PostResults
                posts={taggedPosts}
                onOpenPost={onOpenPost}
                onOpenSeller={onOpenSeller}
                emptyMessage={`No posts have been shared with #${tag} yet.`}
            />
            {signInPromptOpen && (
                <div className="tag-sign-in-backdrop" onClick={() => setSignInPromptOpen(false)}>
                    <section className="tag-sign-in-prompt" role="dialog" aria-modal="true" aria-labelledby="tag-sign-in-title" onClick={(event) => event.stopPropagation()}>
                        <h3 id="tag-sign-in-title">Sign in to follow tags</h3>
                        <p>Create an account or sign in to keep track of #{tag}.</p>
                        <button type="button" onClick={() => setSignInPromptOpen(false)}>Got it</button>
                    </section>
                </div>
            )}
        </section>
    );
}

function TwoColumnPostGrid({ posts, onOpenPost, onOpenSeller }) {
    const columns = [[], []];
    posts.forEach((post, index) => columns[index % 2].push(post));
    return <div className="explore-two-column-grid">
        {columns.map((column, index) => <div className="explore-two-column" key={index}>
            {column.map(post => <PostCard key={post.id} post={post} onOpenPost={onOpenPost} onOpenSeller={onOpenSeller} />)}
        </div>)}
    </div>;
}

export function PostCard({ post, onOpenPost, onOpenSeller }) {
    const isListing = post.type === "listing";
    const isEvent = Boolean(post.is_event);
    const isAdminPost = Boolean(post.is_admin_post);
    const openPost = () => onOpenPost(post.id);

    return (
        <article
            className={`explore-card ${post.layout} ${post.type}${isListing ? " explore-listing-card" : ""}${isAdminPost ? " explore-admin-card" : ""}`}
            role="link"
            tabIndex="0"
            onClick={openPost}
            onKeyDown={(event) => {
                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    openPost();
                }
            }}>
            <div className="explore-card-body">
                {isAdminPost ? <div className="admin-card-bar"><PinIcon /><strong>{post.admin_title || "Admin post"}</strong></div> : isEvent ? <div className="event-card-bar">
                    <span>EVENT</span>
                    <strong>{post.event_title || "Event"}</strong>
                </div> : <PostAuthors post={post} onOpenSeller={onOpenSeller} />}
                {post.type !== "text" ? (
                    <div className="explore-media-button">
                        <span
                            className={`explore-visual ${post.tone}`}
                            role="img"
                            aria-label={post.image ? post.caption : `${post.type} placeholder`}>
                            {post.image && post.type === "video" ? <video className="seller-post-photo" src={post.image} aria-label={post.caption} controls /> : post.image ? <img className="seller-post-photo" src={post.image} alt={post.caption} /> : post.type === "video" ? (
                                <span
                                    className="explore-play"
                                    aria-label="Play video">
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
                        <MentionText>{post.caption}</MentionText>
                    </p>
                )}
                {isListing && (
                    <div className="explore-listing-info">
                        <h2>{post.name}</h2>
                        <span>${post.price.toFixed(2)}</span>
                        {post.availability && <p className="event-listing-label">{{ event: "Available at event", preorder: "Available for preorder", both: "At event and for preorder" }[post.availability]}</p>}
                    </div>
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
    const [submittedQuery, setSubmittedQuery] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [searchTab, setSearchTab] = useState("creators");
    const [profiles, setProfiles] = useState([]);
    const [filterOpen, setFilterOpen] = useState(false);
    const [activeFilter, setActiveFilter] =
        useState("All posts");
    useEffect(() => {
        if (!supabase) return;
        let active = true;
        supabase
            .from("messaging_profiles")
            .select("username, name, image")
            .then(({ data }) => {
                if (!active || !data) return;
                setProfiles(data.map((profile) => ({
                    ...profile,
                    username: `@${profile.username}`
                })));
            });
        return () => { active = false; };
    }, []);

    const fallbackCreators = [
        ...[...new Set(posts.flatMap(postAuthors))].map(
            (username) => ({ username, name: displayNameFromUsername(username), image: "" })
        ),
        ...Object.entries(demoBuyerProfiles).map(([username, profile]) => ({
            username,
            name: profile.name,
            image: ""
        }))
    ];
    const creators = [...new Map(
        [...fallbackCreators, ...profiles].map((creator) => [creator.username.toLowerCase(), creator])
    ).values()];
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedSubmittedQuery = submittedQuery.trim().toLowerCase();
    const creatorMatches = (term) => creators.filter(({ username, name }) =>
        username.toLowerCase().includes(term) || name?.toLowerCase().includes(term)
    );
    const matchingCreators = normalizedQuery ? creatorMatches(normalizedQuery) : [];
    const submittedCreators = normalizedSubmittedQuery ? creatorMatches(normalizedSubmittedQuery) : [];
    const filteredPosts = posts.filter(
        (post) =>
            `${post.creator} ${post.name || ""} ${post.caption} ${postTags(post).join(" ")}`
                .toLowerCase()
                .includes(normalizedSubmittedQuery) &&
            (activeFilter === "All posts" ||
                (activeFilter === "Photos" &&
                    post.type === "image") ||
                (activeFilter === "Videos" &&
                    post.type === "video") ||
                (activeFilter === "Text" &&
                    post.type === "text") ||
                (activeFilter === "Events" && post.is_event) ||
                (activeFilter === "Products" &&
                    post.type === "listing"))
    );
    const pinnedPosts = filteredPosts.filter(isAdminPostPinned);
    const regularPosts = filteredPosts.filter(post => !isAdminPostPinned(post));
    const renderPostResults = (emptyMessage) => !filteredPosts.length ? <div className="explore-empty">{emptyMessage}</div> : <>
        {pinnedPosts.length > 0 && <section className="explore-admin-pinned" aria-label="Pinned admin posts">{pinnedPosts.map(post => <PostCard key={post.id} post={post} onOpenPost={onOpenPost} onOpenSeller={onOpenSeller} />)}</section>}
        {regularPosts.length > 0 && <PostResults posts={regularPosts} onOpenPost={onOpenPost} onOpenSeller={onOpenSeller} emptyMessage={emptyMessage} />}
    </>;
    return (
        <div className="explore-page">
            <form
                className="explore-search-wrap"
                onSubmit={(event) => {
                    event.preventDefault();
                    setSubmittedQuery(query);
                    setSearchTab("creators");
                    setSearchFocused(false);
                }}>
            <label className="explore-search">
                <span aria-hidden="true">⌕</span>
                <input
                    type="search"
                    placeholder="Search creators, projects, and ideas"
                    value={query}
                    onFocus={() => setSearchFocused(true)}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setSubmittedQuery("");
                    }}
                />
            </label>
                {searchFocused && normalizedQuery && (
                    <div className="explore-creator-suggestions">
                        {matchingCreators.slice(0, 5).map((creator) => (
                            <CreatorResult creator={creator} key={creator.username} onOpenSeller={onOpenSeller} />
                        ))}
                        {!matchingCreators.length && <p>No matching creators.</p>}
                    </div>
                )}
            </form>
            {normalizedSubmittedQuery ? (
                <section className="explore-search-results">
                    <div className="explore-search-tabs" role="tablist" aria-label="Search results">
                        <button role="tab" aria-selected={searchTab === "creators"} onClick={() => setSearchTab("creators")}>Creators ({submittedCreators.length})</button>
                        <button role="tab" aria-selected={searchTab === "posts"} onClick={() => setSearchTab("posts")}>Posts &amp; Products ({filteredPosts.length})</button>
                    </div>
                    {searchTab === "creators" ? (
                        submittedCreators.length ? (
                            <div className="explore-creator-results">
                                {submittedCreators.map((creator) => <CreatorResult creator={creator} key={creator.username} onOpenSeller={onOpenSeller} />)}
                            </div>
                        ) : <div className="explore-empty">No creators match “{submittedQuery}”.</div>
                    ) : <>
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
                                {["All posts", "Photos", "Videos", "Text", "Events", "Products"].map((filter) => (
                                    <button
                                        className={`explore-filter-option${activeFilter === filter ? " selected" : ""}`}
                                        key={filter}
                                        onClick={() => setActiveFilter(filter)}>
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        )}
                        {renderPostResults("No posts or products match your search.")}
                    </>}
                </section>
            ) : <>
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
                        "Text",
                        "Events",
                        "Products"
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
            {renderPostResults("No posts match your search.")}
            </>}
        </div>
    );
}

export function PostDetail({
    post,
    backLabel = "Back to Explore",
    onBack,
    onOpenPost,
    onOpenSeller,
    onOpenTag,
    profileFeed = null,
    profileFeedUser = null,
    embedded = false,
    canReply = false,
    onMessageUser,
    relatedPosts = [],
    eventDetailsOpen = false,
    onOpenEventDetails,
    onOpenEventPost,
    onBackFromEventDetails,
    user,
    eventListings = [],
    onEventUpdated
}) {
    const [liked, setLiked] = useState(false),
        [likeCount, setLikeCount] = useState(post.seller_id ? 0 : 18 + post.id * 3),
        [commentCount, setCommentCount] = useState(post.seller_id ? 0 : 4),
        [eventTab, setEventTab] = useState("posts");
    const linkedEventListings = Array.isArray(post.event_listings) ? post.event_listings : [];
    const eventSlots = Array.isArray(post.event_slots) ? post.event_slots : [];
    const eventPosts = relatedPosts.filter(item =>
        (post.event_posts || []).map(id => String(id).replace(/^post-/, "")).includes(String(item.id).replace(/^post-/, ""))
    );
    const eventTabs = [
        { id: "posts", label: "Posts", visible: true },
        { id: "listings", label: "Listings", visible: linkedEventListings.length > 0 },
        { id: "appointments", label: "Appointments", visible: eventSlots.length > 0 }
    ].filter(tab => tab.visible);
    const currentEventTab = eventTabs.some(tab => tab.id === eventTab) ? eventTab : "posts";
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
    const profileFeedPosts = profileFeed
        ? newestFirst(profileFeed.filter((item) => item.id !== post.id))
        : null;
    useEffect(() => {
        if (!profileFeed || embedded) return;
        document.getElementById(`profile-post-${post.id}`)?.scrollIntoView({
            block: "start"
        });
    }, [embedded, post.id, profileFeed]);

    if (profileFeed && !embedded && !eventDetailsOpen) {
        return (
            <section className="explore-post-page explore-profile-full-feed">
                <button
                    type="button"
                    className="explore-back"
                    onClick={onBack}>
                    ← {backLabel}
                </button>
                {newestFirst(profileFeed).map((feedPost) => (
                    <PostDetail
                        embedded
                        key={feedPost.id}
                        post={feedPost}
                        onOpenPost={onOpenPost}
                        onOpenSeller={onOpenSeller}
                        onOpenTag={onOpenTag}
                        canReply={canReply}
                        onMessageUser={onMessageUser}
                        relatedPosts={relatedPosts}
                        onOpenEventDetails={onOpenEventDetails}
                        user={user}
                        eventListings={eventListings}
                        onEventUpdated={onEventUpdated}
                    />
                ))}
            </section>
        );
    }
    return (
        <section
            className={embedded ? "explore-profile-full-card" : "explore-post-page"}
            id={embedded ? `profile-post-${post.id}` : undefined}>
            {!embedded && <button
                type="button"
                className="explore-back"
                onClick={eventDetailsOpen ? onBackFromEventDetails : onBack}>
                ← {eventDetailsOpen ? "Back to Explore" : backLabel}
            </button>}
            <article className="explore-post-detail">
                {post.is_admin_post && <div className="admin-post-banner"><span>ADMIN POST</span><h2><PinIcon />{post.admin_title || "Admin post"}</h2></div>}
                {post.is_event && <div className="event-details-heading event-details-banner">
                    <h2>{post.event_title}</h2><p>{post.event_location} · {formatScheduledTime(post.event_starts_at, post.event_time_zone)}{post.event_ends_at ? ` – ${formatScheduledTime(post.event_ends_at, post.event_time_zone)}` : ""}</p>
                    <EventManager key={post.id} post={post} user={user} onUpdated={onEventUpdated} listings={eventListings} posts={relatedPosts} />
                </div>}
                <PostAuthors
                    post={post}
                    onOpenSeller={onOpenSeller}
                    expanded
                />
                {post.type !== "text" ? (
                    <div
                        className={`explore-visual ${post.tone}`}
                        role="img">
                        {post.image && post.type === "video" ? <video className="seller-post-photo" src={post.image} aria-label={post.caption} controls /> : post.image ? <img className="seller-post-photo" src={post.image} alt={post.caption} /> : post.type === "video" ? (
                            <span
                                className="explore-play"
                                aria-label="Play video">
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
                        <MentionText onOpenSeller={post.type === "listing" ? null : onOpenSeller}>{post.caption}</MentionText>
                    </p>
                )}
                <div className="explore-detail-body">
                    {post.type !== "text" && (
                        <p className="explore-caption">
                            <MentionText onOpenSeller={post.type === "listing" ? null : onOpenSeller}>{post.caption}</MentionText>
                        </p>
                    )}
                    <div className="explore-tag-list">
                        {postTags(post).map((tag) => (
                            <button
                                type="button"
                                className="explore-tag"
                                key={tag}
                                onClick={() => onOpenTag?.(tag)}>
                                #{tag}
                            </button>
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
                                setLikeCount(likeCount + (liked ? -1 : 1));
                            }}>
                            <span className="explore-heart">
                                {liked ? "♥" : "♡"}
                            </span>
                            {likeCount}
                        </button>
                        <span>{commentCount} comments</span>
                    </div>
                    {post.is_event && !eventDetailsOpen && <button className="event-details-button" type="button" onClick={() => onOpenEventDetails?.(post.id)}>Event Details <span aria-hidden="true">→</span></button>}
                    <PostComments post={post} user={user} canReply={canReply} onOpenSeller={onOpenSeller} onMessageUser={onMessageUser} onCountChange={setCommentCount} />
                </div>
            </article>
            {eventDetailsOpen && <section className="event-details" aria-label="Event Details">
                <div className="event-tabs" role="tablist" aria-label="Event content">
                    {eventTabs.map(tab => <button key={tab.id} type="button" role="tab" aria-selected={currentEventTab === tab.id} onClick={() => setEventTab(tab.id)}>{tab.label}</button>)}
                </div>
                {currentEventTab === "posts" && <div className="event-tab-panel">{eventPosts.length ? <TwoColumnPostGrid posts={eventPosts} onOpenPost={onOpenEventPost || onOpenPost} onOpenSeller={onOpenSeller} /> : <p>No promotion posts have been linked yet.</p>}</div>}
                {currentEventTab === "listings" && <div className="event-tab-panel"><TwoColumnPostGrid posts={linkedEventListings.map(item => ({ ...item, id: `listing-${item.id}`, type: "listing", creator: item.creator || post.creator, caption: item.name, price: Number(item.price) || 0, layout: "portrait", tone: "peach" }))} onOpenPost={onOpenEventPost || onOpenPost} onOpenSeller={onOpenSeller} /></div>}
                {currentEventTab === "appointments" && <div className="event-tab-panel event-slots">{post.event_time_zone && <p className="event-slots-time-zone">Appointment slots are in {post.event_time_zone}.</p>}{!post.event_time_zone && <p className="event-slots-time-zone">The creator’s time zone is unavailable for these slots.</p>}{eventSlots.map((slot, index) => <div key={`${slot}-${index}`}><span>Available</span>{slot}</div>)}</div>}
            </section>}
            {embedded || eventDetailsOpen ? null : profileFeedPosts ? (
                <section className="explore-profile-feed" aria-label={`${profileFeedUser} posts`}>
                    {profileFeedPosts.map((item) => (
                        <PostCard
                            key={item.id}
                            post={item}
                            onOpenPost={onOpenPost}
                            onOpenSeller={onOpenSeller}
                        />
                    ))}
                </section>
            ) : (
                <section className="explore-suggestions">
                    <div className="explore-suggestions-heading">
                        <h2>Suggested posts</h2>
                        <span>{suggestions.length} posts</span>
                    </div>
                    <TwoColumnPostGrid posts={suggestions} onOpenPost={onOpenPost} onOpenSeller={onOpenSeller} />
                </section>
            )}
        </section>
    );
}

export function SellerProfilePage({
    seller,
    onBack,
    backLabel = "Back to Explore",
    onMessageSeller,
    canMessage = false,
    canFollow = false,
    viewerId,
    posts = [],
    onOpenPost,
    onOpenSeller,
    onOpenListing,
    initialTab = "Posts"
}) {
    const [profile, setProfile] = useState(null);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [messageNotice, setMessageNotice] = useState("");
    const username = seller.replace(/^@/, "");
    const follow = useFollows(profile?.id, viewerId);
    const isFollowing = follow.isFollowing;
    const profilePosts = newestFirst(
        posts.filter((post) => postAuthors(post).includes(seller))
    );

    useEffect(() => {
        if (!supabase) return;
        let active = true;
        supabase
            .from("messaging_profiles")
            .select("id, name, username, image, seller_verified")
            .ilike("username", username)
            .maybeSingle()
            .then(({ data }) => {
                if (active) setProfile(data);
            });
        return () => { active = false; };
    }, [username]);

    const fallbackProfile = demoBuyerProfiles[seller.toLowerCase()];
    const viewedProfile = profile || fallbackProfile;
    const isSeller = viewedProfile?.seller_verified ?? true;
    const tabs = isSeller
        ? ["Posts", "Listings", "Appointments"]
        : [];
    const selectedTab = tabs.includes(activeTab) ? activeTab : tabs[0];
    const displayName = viewedProfile?.name || displayNameFromUsername(seller);
    const publicPosts = profilePosts.filter((post) => post.type !== "listing");
    const publicListings = profilePosts.filter((post) => post.type === "listing");
    const publicPostColumns = [
        publicPosts.filter((_, index) => index % 2 === 0),
        publicPosts.filter((_, index) => index % 2 === 1)
    ];
    const openMessage = () => {
        if (!canMessage) {
            setMessageNotice("Sign in or create an account to message this user.");
            return;
        }
        onMessageSeller();
    };
    const toggleFollow = () => {
        if (!canFollow) {
            setMessageNotice("Sign in or create an account to start following people.");
            return;
        }
        if (!profile?.id) {
            setMessageNotice("This example profile cannot be followed.");
            return;
        }
        follow.toggleFollow();
    };

    return (
        <section className="profile-page public-profile-page">
            <button
                type="button"
                className="explore-back"
                onClick={onBack}>
                ← {backLabel}
            </button>

            <div className="profile-toolbar">
                <div>
                    <span className="profile-eyebrow">CAMPUS MAKERS</span>
                    <h2>Profile</h2>
                </div>
                <div className="profile-toolbar-actions">
                    <button
                        type="button"
                        className="profile-icon-button"
                        aria-label={`Message ${displayName}`}
                        title={`Message ${displayName}`}
                        onClick={openMessage}>
                        {"\u2709"}
                    </button>
                </div>
            </div>
            {messageNotice && (
                <div className="profile-notice" role="status">
                    <span>{messageNotice}</span>
                    <button type="button" aria-label="Dismiss message" onClick={() => setMessageNotice("")}>×</button>
                </div>
            )}
            {follow.error && <div className="profile-notice" role="alert">{follow.error}</div>}
            <div className="profile-header">
                <div className="profile-avatar public-profile-avatar">
                    {viewedProfile?.image ? <img src={viewedProfile.image} alt="" /> : seller.slice(1, 3).toUpperCase()}
                </div>
                <div className={`profile-social-stats${isSeller ? "" : " buyer-profile-stats"}`} aria-label="Profile statistics">
                    {isSeller && <div><strong>{publicPosts.length}</strong><span>Posts</span></div>}
                    <div><strong>{follow.ready && !follow.error ? follow.followingCount : "—"}</strong><span>Following</span></div>
                    <div><strong>{follow.ready && !follow.error ? follow.followerCount : "—"}</strong><span>Followers</span></div>
                </div>
            </div>
            <div className="profile-bio">
                <h3>{displayName}</h3>
                <p className="profile-username">{seller}</p>
                <p className="profile-description">{isSeller ? "Campus Maker sharing original work with the campus community." : "Campus community member."}</p>
            </div>
            <button
                type="button"
                className={`public-profile-follow${isFollowing ? " is-following" : ""}`}
                aria-pressed={isFollowing}
                disabled={follow.busy || (profile?.id && (!follow.ready || Boolean(follow.error))) || (profile?.id && profile.id === viewerId)}
                onClick={toggleFollow}>
                {profile?.id && profile.id === viewerId ? "Your profile" : isFollowing ? "Following" : "Follow"}
            </button>
            {isSeller && <div className="profile-tabs" role="tablist" aria-label={`${seller} profile sections`}>
                {tabs.map((tab) => (
                    <button key={tab} type="button" role="tab" aria-pressed={selectedTab === tab} onClick={() => setActiveTab(tab)}>
                        {tab}
                    </button>
                ))}
            </div>}
            {isSeller && (selectedTab === "Posts" ? (
                publicPosts.length ? <div className="public-profile-posts">
                    {publicPostColumns.map((column, index) => (
                        <div className="public-profile-post-column" key={index}>
                            {column.map((post) => <PostCard
                                key={post.id}
                                post={toExploreCardPost(post)}
                                onOpenPost={onOpenPost}
                                onOpenSeller={onOpenSeller}
                            />)}
                        </div>
                    ))}
                </div> : <div className="explore-empty">No public posts yet.</div>
            ) : selectedTab === "Listings" ? (
                publicListings.length ? <section className="profile-listings">
                    <div className="profile-panel-heading"><h3>Listings</h3><span className="profile-count">{publicListings.length} items</span></div>
                    <div className="profile-listings-grid">
                        {publicListings.map((listing) => <article className="profile-listing-card public-profile-listing-link" key={listing.id}
                            role="link" tabIndex={0} aria-label={`View ${listing.name}`}
                            onClick={() => onOpenListing(listing.id)}
                            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpenListing(listing.id); } }}>
                            {listing.image && <img className="profile-listing-image" src={listing.image} alt="" />}
                            <h4>{listing.name}</h4>
                            <p>${listing.price?.toFixed(2)}</p>
                        </article>)}
                    </div>
                </section> : <div className="explore-empty">No public listings to display.</div>
            ) : (
                <div className="explore-empty">No public {selectedTab.toLowerCase()} to display.</div>
            ))}
        </section>
    );
}
