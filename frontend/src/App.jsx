import { useEffect, useRef, useState } from "react";
import "./App.css";
import Profile from "./pages/Profile";
import MapPage from "./pages/Map";
import CalendarPage from "./pages/Calendar";
import {
    ExplorePage,
    PostDetail,
    SellerProfilePage,
    createExploreFeed,
    currentExplorePostId,
    currentSellerUsername,
    explorePosts
} from "./Explore Page/Explore";

const pages = ["Home", "Map", "Calendar", "Explore", "Profile"];
const currentPage = () => {
    const slug = window.location.hash
        .slice(1)
        .toLowerCase()
        .split("/")[0];
    return slug === "seller"
        ? "Seller"
        : pages.find((page) => page.toLowerCase() === slug) ||
              "Home";
};

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
                <path d="M3 8h26v3H3z" fill="var(--paper)" />
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

function Shelf({ title, creators = false }) {
    const rail = useRef(null),
        [expanded, setExpanded] = useState(false);
    return (
        <section className="shelf">
            <div className="section-heading">
                <h2>{title}</h2>
                <button
                    className="see-more"
                    onClick={() => setExpanded(!expanded)}>
                    {expanded ? "See less" : "See more"}
                </button>
            </div>
            <div className="shelf-body">
                <div
                    className={`card-rail${expanded ? " expanded" : ""}`}
                    ref={rail}>
                    {Array.from({ length: 6 }, (_, index) => (
                        <figure className="card" key={index}>
                            <div className="image-placeholder">
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
                        onClick={() =>
                            rail.current.scrollBy({
                                left: rail.current.clientWidth,
                                behavior: "smooth"
                            })
                        }>
                        ›
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
                    onClick={() => setFilterOpen(!filterOpen)}>
                    Filter
                </button>
            </div>
            {filterOpen && (
                <div className="filter-panel">
                    Filters will be available when listings are
                    added.
                </div>
            )}
            <Shelf title="Product listings" />
            <Shelf title="From your creators" />
            <Shelf title="Suggested creators" creators />
        </>
    );
}

function App() {
    const [page, setPage] = useState(currentPage),
        [selectedPostId, setSelectedPostId] = useState(
            currentExplorePostId
        ),
        [selectedSeller, setSelectedSeller] = useState(
            currentSellerUsername
        ),
        [exploreFeed, setExploreFeed] = useState(
            createExploreFeed
        );
    const lastPage = useRef(currentPage());
    useEffect(() => {
        const onNavigation = () => {
            const nextPage = currentPage();
            if (
                nextPage === "Explore" &&
                lastPage.current !== "Explore"
            )
                setExploreFeed(createExploreFeed());
            lastPage.current = nextPage;
            setPage(nextPage);
            setSelectedPostId(currentExplorePostId());
            setSelectedSeller(currentSellerUsername());
        };
        window.addEventListener("hashchange", onNavigation);
        return () =>
            window.removeEventListener(
                "hashchange",
                onNavigation
            );
    }, []);
    const openPost = (id) => {
            window.location.hash = `explore/${id}`;
        },
        openSeller = (creator) => {
            window.location.hash = `seller/${encodeURIComponent(creator.slice(1))}`;
        },
        selectedPost = explorePosts.find(
            (post) => post.id === selectedPostId
        );
    return (
        <div className="app-shell">
            <header className="brand">
                <span className="brand-mark">CM</span>
                <h1>Campus Makers</h1>
            </header>
            <main
                aria-label={`${page} page`}
                className={
                    page === "Home"
                        ? "home"
                        : page === "Explore"
                          ? "explore"
                          : "blank-page"
                }>
                {page === "Home" && <HomePage />}
                {page === "Explore" &&
                    (selectedPost ? (
                        <PostDetail
                            key={selectedPost.id}
                            post={selectedPost}
                            onBack={() => {
                                window.location.hash =
                                    "explore";
                            }}
                            onOpenPost={openPost}
                            onOpenSeller={openSeller}
                        />
                    ) : (
                        <ExplorePage
                            posts={exploreFeed}
                            onOpenPost={openPost}
                            onOpenSeller={openSeller}
                        />
                    ))}
                {page === "Seller" && selectedSeller && (
                    <SellerProfilePage
                        seller={selectedSeller}
                        onBack={() => {
                            window.location.hash = "explore";
                        }}
                    />
                )}
                {page === "Map" && <MapPage />}
                {page === "Calendar" && <CalendarPage />}
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
