import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState
} from "react";
import "./App.css";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import Login from "./pages/Login";
import {
    ExplorePage,
    PostDetail,
    SellerProfilePage
} from "./Explore Page/Explore";
import {
    createExploreFeed,
    currentExplorePostId,
    currentPostSource,
    currentSellerUsername,
    explorePosts
} from "./Explore Page/exploreData";

const pages = ["Home", "Map", "Calendar", "Explore", "Profile"];
const currentPage = () => {
    const slug = window.location.hash
        .slice(1)
        .toLowerCase()
        .split("/")[0];
    if (slug === "login") return "Login";
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

function App() {
    const [page, setPage] = useState(currentPage),
        [selectedPostId, setSelectedPostId] = useState(
            currentExplorePostId
        ),
        [postSource, setPostSource] = useState(
            currentPostSource
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
            setPostSource(currentPostSource());
            setSelectedSeller(currentSellerUsername());
        };
        window.addEventListener("hashchange", onNavigation);
        return () =>
            window.removeEventListener(
                "hashchange",
                onNavigation
            );
    }, []);
    useLayoutEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant"
        });
    }, [page, selectedPostId, selectedSeller]);

    const openPost = (id, source = "explore") => {
            window.location.hash = `explore/${id}${source === "home" ? "?from=home" : ""}`;
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
                <a
                    className="brand-home"
                    href="#home"
                    aria-label="Campus Makers home">
                    <h1 className="brand-title">
                        <span>Campus</span> <span>Makers</span>
                    </h1>
                </a>
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
                {page === "Home" && (
                    <Home
                        posts={explorePosts}
                        onOpenPost={(id) =>
                            openPost(id, "home")
                        }
                        onOpenSeller={openSeller}
                    />
                )}
                {page === "Explore" &&
                    (selectedPost ? (
                        <PostDetail
                            key={selectedPost.id}
                            post={selectedPost}
                            backLabel={
                                postSource === "home"
                                    ? "Back to Home"
                                    : "Back to Explore"
                            }
                            onBack={() => {
                                window.location.hash =
                                    postSource;
                            }}
                            onOpenPost={(id) =>
                                openPost(id, postSource)
                            }
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
                {page === "Profile" && <Profile />}
                {page === "Login" && <Login />}
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
