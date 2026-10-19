import { useEffect, useRef, useState } from "react";
import "./App.css";
import Profile from "./pages/Profile";

const pages = ["Home", "Map", "Calendar", "Explore", "Profile"];

function Icon({ name }) {
    const shapes = {
        Home: <path d="M4 12 16 2l12 10v18H4Z" />,
        Map: (
            <path
                fillRule="evenodd"
                d="M16 1a11 11 0 0 0-11 11c0 8 11 20 11 20s11-12 11-20A11 11 0 0 0 16 1Zm0 7a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"
            />
        ),
        Calendar: (
            <>
                <path d="M3 3h26v27H3z" />
                <path
                    d="M3 8h26M3 11h26"
                    stroke="var(--paper)"
                    strokeWidth="1"
                />
            </>
        ),
        Explore: (
            <g
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <circle cx="13" cy="13" r="10" />
                <path d="m21 21 10 10" />
            </g>
        ),
        Profile: (
            <>
                <circle cx="16" cy="5" r="4" />
                <path d="m16 11 11 19H5Z" />
            </>
        )
    };
    return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
            {shapes[name]}
        </svg>
    );
}

function currentPage() {
    const slug = window.location.hash.slice(1).toLowerCase().split("/")[0];
    return (
        pages.find((page) => page.toLowerCase() === slug) ||
        "Home"
    );
}

function currentExplorePostId() {
    const match = window.location.hash.match(/^#explore\/(\d+)$/i);
    return match ? Number(match[1]) : null;
}

function Shelf({ title, creators = false }) {
    const rail = useRef(null);
    const [expanded, setExpanded] = useState(false);
    return (
        <section className="shelf" aria-label={title}>
            <div className="section-heading">
                <h2>{title}</h2>
                <button
                    className="see-more"
                    onClick={() => setExpanded(!expanded)}
                    aria-expanded={expanded}>
                    {expanded ? "See less" : "See more"}
                </button>
            </div>
            <div className="shelf-body">
                <div
                    className={`card-rail${expanded ? " expanded" : ""}`}
                    ref={rail}>
                    {Array.from({ length: 6 }, (_, index) => (
                        <figure className="card" key={index}>
                            <div
                                className="image-placeholder"
                                role="img"
                                aria-label={`${creators ? "Creator" : "Listing"} image placeholder ${index + 1}`}>
                                {!creators && (
                                    <span>@creator</span>
                                )}
                            </div>
                            <figcaption>
                                {creators
                                    ? "@creator"
                                    : "Title"}
                            </figcaption>
                        </figure>
                    ))}
                </div>
                {!expanded && (
                    <button
                        className="next"
                        aria-label={`Show more ${title.toLowerCase()}`}
                        onClick={() =>
                            rail.current.scrollBy({
                                left: rail.current.clientWidth,
                                behavior: "smooth"
                            })
                        }>
                        ▸
                    </button>
                )}
            </div>
        </section>
    );
}

function HomePage() {
    const [filterOpen, setFilterOpen] = useState(false);

    return (
        <>
                        <div className="filter-row">
                            <button
                                className="filter-button"
                                aria-expanded={filterOpen}
                                onClick={() =>
                                    setFilterOpen(!filterOpen)
                                }>
                                filter
                            </button>
                        </div>
                        {filterOpen && (
                            <div
                                className="filter-panel"
                                role="status">
                                Filters will be available when
                                listings are added.
                            </div>
                        )}
                        <Shelf title="Product listings" />
                        <Shelf title="From your creators" />
                        <Shelf
                            title="Suggested creators"
                            creators
                        />
                    </>
    );
}

const explorePosts = [
    {
        id: 1,
        type: "image",
        creator: "@maya.makes",
        caption: "A little color for a rainy study day 🎨",
        tag: "Art",
        tone: "lavender",
        layout: "featured"
    },
    {
        id: 2,
        type: "text",
        creator: "@campusnotes",
        caption: "Reminder: your progress doesn’t have to look like anyone else’s. Keep showing up, one small step at a time.",
        tag: "Thoughts",
        layout: "tall"
    },
    {
        id: 3,
        type: "video",
        creator: "@devwithlee",
        caption: "A tiny desk reset before the next project sprint",
        tag: "Behind the scenes",
        tone: "peach",
        layout: "wide"
    },
    {
        id: 4,
        type: "image",
        creator: "@flora.studio",
        caption: "Testing out a few ideas for my next print 🌿",
        tag: "Design",
        tone: "mint",
        layout: "tall"
    },
    {
        id: 5,
        type: "text",
        creator: "@themakersclub",
        caption: "What are you making this week? Drop your current project below—we’d love to see it!",
        tag: "Community",
        layout: "standard"
    },
    {
        id: 6,
        type: "video",
        creator: "@noah.builds",
        caption: "From sketch to prototype in 30 seconds ✨",
        tag: "Process",
        tone: "blue",
        layout: "wide"
    },
    {
        id: 7,
        type: "image",
        creator: "@jules.illustrates",
        caption: "Some little doodles from the margins of my notebook",
        tag: "Illustration",
        tone: "yellow",
        layout: "featured"
    },
    {
        id: 8,
        type: "text",
        creator: "@campusmakers",
        caption: "Maker tip: take a photo of your work in progress. Future you will love seeing how far you’ve come.",
        tag: "Tips",
        layout: "standard"
    }
];

function ExplorePage({ onOpenPost }) {
    const [query, setQuery] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState("All posts");
    const [posts] = useState(() =>
        [...explorePosts].sort(() => Math.random() - 0.5)
    );

    const filteredPosts = posts.filter((post) => {
        const matchesQuery = `${post.creator} ${post.caption} ${post.tag}`
            .toLowerCase()
            .includes(query.trim().toLowerCase());
        const matchesType =
            activeFilter === "All posts" ||
            (activeFilter === "Photos" && post.type === "image") ||
            (activeFilter === "Videos" && post.type === "video") ||
            (activeFilter === "Text" && post.type === "text");
        return matchesQuery && matchesType;
    });

    return (
        <div className="explore-page">
            <label className="explore-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="10.8" cy="10.8" r="6.8" />
                    <path d="m16 16 5 5" />
                </svg>
                <input
                    type="search"
                    placeholder="Search creators, projects, and ideas"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Search Explore posts"
                />
            </label>
            <div className="explore-filter-row">
                <button
                    className="explore-filter-button"
                    aria-expanded={filterOpen}
                    aria-controls="explore-filter-panel"
                    onClick={() => setFilterOpen(!filterOpen)}>
                    <span aria-hidden="true">☷</span> Filter
                </button>
                <span className="explore-count">{filteredPosts.length} posts</span>
            </div>
            {filterOpen && (
                <div className="explore-filter-panel" id="explore-filter-panel" aria-label="Filter posts by type">
                    {["All posts", "Photos", "Videos", "Text"].map((filter) => (
                        <button
                            className={`explore-filter-option${activeFilter === filter ? " selected" : ""}`}
                            key={filter}
                            aria-pressed={activeFilter === filter}
                            onClick={() => setActiveFilter(filter)}>
                            {filter}
                        </button>
                    ))}
                </div>
            )}
            {filteredPosts.length ? (
                <div className="explore-grid">
                    {filteredPosts.map((post) => (
                        <article
                            className={`explore-card ${post.layout}`}
                            key={post.id}
                            role="link"
                            tabIndex="0"
                            onClick={() => onOpenPost(post.id)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    onOpenPost(post.id);
                                }
                            }}>
                            <div className="explore-card-body">
                                <div className="explore-card-header">
                                    <span className="explore-avatar" aria-hidden="true">{post.creator.slice(1, 3).toUpperCase()}</span>
                                    <span className="explore-creator">{post.creator}</span>
                                </div>
                                {post.type !== "text" && (
                                    <div className="explore-media-button">
                                        <span
                                        className={`explore-visual ${post.tone}`}
                                        role="img"
                                        aria-label={`${post.type === "video" ? "Video" : "Photo"} placeholder`}>
                                        {post.type === "video" ? (
                                            <span className="explore-play" aria-hidden="true">▶</span>
                                        ) : (
                                            <span className="explore-placeholder-label">Photo</span>
                                        )}
                                        </span>
                                    </div>
                                )}
                                <span className="explore-tag">{post.tag}</span>
                                {post.type === "text" && (
                                    <p
                                        className="explore-caption preview">
                                        {post.caption}
                                    </p>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="explore-empty">No posts match your search. Try another keyword or filter.</div>
            )}
        </div>
    );
}

function ExplorePostPage({ post, onBack }) {
    return (
        <section className="explore-post-page" aria-label={`Post by ${post.creator}`}>
            <button type="button" className="explore-back" onClick={onBack}>
                ← Back to Explore
            </button>
            <article className="explore-post-detail">
                <div className="explore-card-header">
                    <span className="explore-avatar" aria-hidden="true">
                        {post.creator.slice(1, 3).toUpperCase()}
                    </span>
                    <span className="explore-creator">{post.creator}</span>
                </div>
                {post.type !== "text" && (
                    <div
                        className={`explore-visual ${post.tone}`}
                        role="img"
                        aria-label={`${post.type === "video" ? "Video" : "Photo"} placeholder`}>
                        {post.type === "video" ? (
                            <span className="explore-play" aria-hidden="true">▶</span>
                        ) : (
                            <span className="explore-placeholder-label">Photo</span>
                        )}
                    </div>
                )}
                <span className="explore-tag">{post.tag}</span>
                <p className="explore-caption">{post.caption}</p>
            </article>
        </section>
    );
}

function App() {
    const [page, setPage] = useState(currentPage);
    const [selectedPostId, setSelectedPostId] = useState(currentExplorePostId);
    useEffect(() => {
        const onNavigation = () => {
            setPage(currentPage());
            setSelectedPostId(currentExplorePostId());
        };
        window.addEventListener("hashchange", onNavigation);
        return () =>
            window.removeEventListener(
                "hashchange",
                onNavigation
            );
    }, []);

    const openPost = (postId) => {
        window.location.hash = `explore/${postId}`;
    };

    const selectedPost = explorePosts.find((post) => post.id === selectedPostId);

    return (
        <div className="app-shell">
            <header className="brand">
                {/* Temporary mark until the original logo export is supplied. */}
                <span className="brand-mark" aria-hidden="true">
                    CM
                </span>
                <h1>Campus Makers</h1>
            </header>
            <main
                aria-label={`${page} page`}
                className={
                    page === "Home" ? "home"
                        : page === "Explore"
                            ? "explore"
                            : "blank-page"
                }>
                {page === "Home" && <HomePage />}
                {page === "Explore" && (
                    selectedPost ? (
                        <ExplorePostPage
                            post={selectedPost}
                            onBack={() => { window.location.hash = "explore"; }}
                        />
                    ) : (
                        <ExplorePage onOpenPost={openPost} />
                    )
                )}

                {page === "Profile" && <Profile />}
            </main>
            <nav
                className="bottom-nav"
                aria-label="Main navigation">
                {pages.map((item) => (
                    <a
                        key={item}
                        href={`#${item.toLowerCase()}`}
                        onClick={() => {
                            setPage(item);
                            setSelectedPostId(null);
                        }}
                        aria-label={item}
                        title={item}
                        aria-current={
                            page === item ? "page" : undefined
                        }>
                        <Icon name={item} />
                        <span>{item}</span>
                    </a>
                ))}
            </nav>
        </div>
    );
}
export default App;
