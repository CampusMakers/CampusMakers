import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState
} from "react";
import "./App.css";
import { supabase } from "./services/supabase";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { useAuth } from "./auth/useAuth";
import MapPage from "./pages/Map";
import CalendarPage from "./pages/Calendar";
import {
    ExplorePage,
    PostDetail,
    SellerProfilePage
} from "./pages/Explore Page/Explore";
import {
    createExploreFeed,
    currentProfileFeedUsername,
    currentExplorePostId,
    currentPostSource,
    currentSellerUsername,
    explorePosts
} from "./pages/Explore Page/exploreData";

const asExplorePost = post => ({
    ...post,
    id: `post-${post.id}`,
    type: post.post_type || (post.image ? "image" : "text"),
    tags: ["Campus makers"],
    layout: "standard",
    tone: "peach"
});

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

const currentMessageRecipient = () => {
    const match = window.location.hash.match(
        /^#profile\/messages\/([^/?#]+)/i
    );

    if (!match) return null;

    try {
        return decodeURIComponent(match[1]);
    } catch {
        return null;
    }
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
    const { user, loading } = useAuth();
    const [page, setPage] = useState(currentPage),
        [selectedPostId, setSelectedPostId] = useState(
            currentExplorePostId
        ),
        [eventDetailsOpen, setEventDetailsOpen] = useState(
            () => /\/event-details(?:\?|$)/i.test(window.location.hash)
        ),
        [postSource, setPostSource] = useState(
            currentPostSource
        ),
        [profileFeedUser, setProfileFeedUser] = useState(
            currentProfileFeedUsername
        ),
        [selectedSeller, setSelectedSeller] = useState(
            currentSellerUsername
        ),
        [exploreFeed, setExploreFeed] = useState(
            createExploreFeed
        );
    const [publishedPosts, setPublishedPosts] = useState([]);
    const [postsError, setPostsError] = useState("");
    useEffect(() => {
        if (!supabase) return;
        let active = true;
        supabase.from("maker_posts").select("*").order("created_at", { ascending: false }).then(({ data, error }) => {
            if (!active) return;
            if (error) setPostsError("Posts could not be loaded. Please try again later.");
            else { setPublishedPosts(data.map(asExplorePost)); setPostsError(""); }
        });
        return () => { active = false; };
    }, []);
    const allPosts = [...publishedPosts, ...explorePosts];
    const lastPage = useRef(currentPage());

    const [messageRecipient, setMessageRecipient] = useState(
        currentMessageRecipient
    );
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
            setEventDetailsOpen(/\/event-details(?:\?|$)/i.test(window.location.hash));
            setPostSource(currentPostSource());
            setProfileFeedUser(currentProfileFeedUsername());
            setSelectedSeller(currentSellerUsername());
            setMessageRecipient(currentMessageRecipient());
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
    }, [page, selectedPostId, selectedSeller, eventDetailsOpen]);

    const openPost = (id, source = "explore") => {
            window.location.hash = `explore/${id}${source === "home" ? "?from=home" : ""}`;
        },
        openSeller = (creator) => {
            const source =
                page === "Home" ? "home" : postSource;
            window.location.hash = `seller/${encodeURIComponent(creator.slice(1))}${source === "home" ? "?from=home" : ""}`;
        },
        selectedPost = allPosts.find(
            (post) => post.id === selectedPostId
        );
    const profileFeedPosts = profileFeedUser
        ? [...publishedPosts, ...exploreFeed].filter(
              (post) =>
                  (post.creator === profileFeedUser ||
                  post.collaborators?.includes(profileFeedUser)) &&
                  post.type !== "listing"
          )
        : null;
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
                        posts={allPosts}
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
                            eventDetailsOpen={eventDetailsOpen && selectedPost.is_event}
                            onOpenEventDetails={(id) => {
                                const query = window.location.hash.split("?")[1];
                                window.location.hash = `explore/${id}/event-details${query ? `?${query}` : ""}`;
                            }}
                            onBackToEventPost={() => {
                                const query = window.location.hash.split("?")[1];
                                window.location.hash = `explore/${selectedPost.id}${query ? `?${query}` : ""}`;
                            }}
                            backLabel={
                                profileFeedUser
                                    ? "Back to Profile"
                                    : postSource === "home"
                                    ? "Back to Home"
                                    : "Back to Explore"
                            }
                            onBack={() => {
                                window.location.hash = profileFeedUser
                                    ? `seller/${encodeURIComponent(profileFeedUser.slice(1))}`
                                    : postSource;
                            }}
                            profileFeed={profileFeedPosts}
                            profileFeedUser={profileFeedUser}
                            canReply={Boolean(user?.sellerVerified)}
                            onMessageUser={(username) => {
                                window.location.hash = `profile/messages/${encodeURIComponent(username.replace(/^@/, ""))}?from=post&source=${postSource}`;
                            }}
                            onOpenPost={(id) =>
                                openPost(id, postSource)
                            }
                            onOpenSeller={openSeller}
                            relatedPosts={allPosts}
                        />
                    ) : (
                        <ExplorePage
                            posts={[...publishedPosts, ...exploreFeed]}
                            onOpenPost={openPost}
                            onOpenSeller={openSeller}
                        />
                    ))}
                {page === "Seller" && selectedSeller && (
                    <SellerProfilePage
                        seller={selectedSeller}
                        posts={[...publishedPosts, ...exploreFeed]}
                        canMessage={Boolean(user)}
                        canFollow={Boolean(user)}
                        onOpenPost={(id) => {
                            window.location.hash = `explore/${id}?from=profile&profile=${encodeURIComponent(selectedSeller.slice(1))}`;
                        }}
                        onOpenSeller={openSeller}
                        backLabel={
                            postSource === "home"
                                ? "Back to Home"
                                : "Back to Explore"
                        }
                        onBack={() => {
                            window.location.hash = postSource;
                        }}
                        onMessageSeller={() => {
                            const username =
                                selectedSeller.replace(
                                    /^@/,
                                    ""
                                );
                            const source =
                                postSource === "home"
                                    ? "home"
                                    : "explore";

                            window.location.hash = `profile/messages/${encodeURIComponent(username)}?from=seller&source=${source}`;
                        }}
                    />
                )}
                {page === "Map" && <MapPage />}
                {page === "Calendar" && <CalendarPage />}
                {page === "Profile" && !loading && (
                    <Profile
                        key={`${user?.id ?? "guest"}:${messageRecipient ?? "profile"}`}
                        user={user}
                        posts={publishedPosts}
                        postsError={postsError}
                        onPublished={post => {
                            setPublishedPosts(current => [asExplorePost(post), ...current]);
                            setPostsError("");
                        }}
                        sellerVerified={user?.sellerVerified}
                        initialConversation={user ? messageRecipient : null}
                    />
                )}
                {page === "Profile" && loading && <p role="status">Checking your session…</p>}
                {page === "Login" &&
                    (loading ? <p role="status">Checking your session…</p> : <Login />)}
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
