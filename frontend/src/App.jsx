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
import calendarIcon from "./assets/nav-icons/Calendar.svg";
import exploreIcon from "./assets/nav-icons/Explore.svg";
import homeIcon from "./assets/nav-icons/Home.svg";
import mapIcon from "./assets/nav-icons/Map.svg";
import profileIcon from "./assets/nav-icons/Profile.svg";
import MapPage from "./pages/Map";
import CalendarPage from "./pages/Calendar";
import ProductDetail from "./pages/ProductDetail";
import {
    ExplorePage,
    PostDetail,
    SellerProfilePage,
    TagPage
} from "./pages/Explore Page/Explore";
import {
    createExploreFeed,
    currentProfileFeedUsername,
    currentExplorePostId,
    currentPostSource,
    currentSellerUsername,
    currentTagName,
    exploreListings,
    explorePosts
} from "./pages/Explore Page/exploreData";

const asExplorePost = post => ({
    ...post,
    id: `post-${post.id}`,
    type: post.post_type || (post.image ? "image" : "text"),
    tags: post.tags?.length ? post.tags : ["Campus makers"],
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
    return slug === "seller" ? "Seller"
        : slug === "tag" ? "Tag"
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
    const icons = {
        Home: homeIcon,
        Map: mapIcon,
        Calendar: calendarIcon,
        Explore: exploreIcon,
        Profile: profileIcon
    };

    return (
        <img
            className="nav-icon"
            src={icons[name]}
            alt=""
            aria-hidden="true"
        />
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
        [selectedTag, setSelectedTag] = useState(currentTagName),
        [exploreFeed, setExploreFeed] = useState(
            createExploreFeed
        );
    const [publishedPosts, setPublishedPosts] = useState([]);
    const [listingsByUser, setListingsByUser] = useState({});
    const listingOwner = user?.id || "guest";
    const myListings = listingsByUser[listingOwner] || [];
    const setMyListings = (value) => setListingsByUser(current => ({ ...current, [listingOwner]: typeof value === "function" ? value(current[listingOwner] || []) : value }));
    const [postsError, setPostsError] = useState("");
    useEffect(() => {
        if (!supabase) return;
        let active = true;
        const loadPosts = () => supabase.from("maker_posts").select("*").order("created_at", { ascending: false }).then(({ data, error }) => {
            if (!active) return;
            if (error) setPostsError("Posts could not be loaded. Please try again later.");
            else { setPublishedPosts(data.map(asExplorePost)); setPostsError(""); }
        });
        loadPosts();
        const timer = window.setInterval(loadPosts, 30000);
        return () => { active = false; window.clearInterval(timer); };
    }, []);
    const allPosts = [...publishedPosts, ...explorePosts];
    const activeListings = myListings.filter(item => item.status === "Active").map(item => ({
        ...item,
        id: `listing-${item.id}`,
        creator: `@${user?.username || user?.email?.split("@")[0] || "maker"}`,
        image: item.images?.[0] || item.image,
        type: "listing",
        caption: item.name,
        layout: "portrait",
        tone: "peach"
    }));
    const eventListings = allPosts.flatMap(post => (post.event_listings || []).map(item => ({
        ...item, id: `listing-${item.id}`, creator: item.creator || post.creator,
        type: "listing", caption: item.name, tags: [], layout: "portrait", tone: "peach"
    })));
    const allListings = [...activeListings, ...exploreListings, ...eventListings];
    const exploreSession = useRef(["Explore", "Tag"].includes(currentPage()));

    const [messageRecipient, setMessageRecipient] = useState(
        currentMessageRecipient
    );
    useEffect(() => {
        const onNavigation = () => {
            const nextPage = currentPage();
            if (nextPage === "Explore" || nextPage === "Tag") exploreSession.current = true;
            setPage(nextPage);
            setSelectedPostId(currentExplorePostId());
            setEventDetailsOpen(/\/event-details(?:\?|$)/i.test(window.location.hash));
            setPostSource(currentPostSource());
            setProfileFeedUser(currentProfileFeedUsername());
            setSelectedSeller(currentSellerUsername());
            setSelectedTag(currentTagName());
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
    }, [page, selectedPostId, selectedSeller, selectedTag, eventDetailsOpen]);

    const openPost = (id, source = "explore") => {
            window.location.hash = `explore/${id}${source === "home" ? "?from=home" : ""}`;
        },
        openSeller = (creator) => {
            const source =
                page === "Home" ? "home" : postSource;
            window.location.hash = `seller/${encodeURIComponent(creator.slice(1))}${source === "home" ? "?from=home" : ""}`;
        },
        openTag = (tag) => {
            window.location.hash = `tag/${encodeURIComponent(tag)}`;
        },
        selectedPost = [...allPosts, ...allListings].find(
            (post) => post.id === selectedPostId
        );
    const eventReturn = new URLSearchParams(window.location.hash.split("?")[1]).get("eventReturn");
    const linkedEventDetails = eventReturn && /^#explore\/(?:post-)?\d+\/event-details(?:\?.*)?$/i.test(eventReturn)
        ? eventReturn
        : null;
    const profileListingReturn = selectedPost?.type === "listing" && profileFeedUser
        ? `seller/${encodeURIComponent(profileFeedUser.slice(1))}?tab=listings${new URLSearchParams(window.location.hash.split("?")[1]).get("source") === "home" ? "&from=home" : ""}`
        : null;
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
                          : page === "Tag"
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
                    (selectedPost?.type === "listing" ? (
                        <ProductDetail
                            key={`${selectedPost.id}:${user?.id || "guest"}`}
                            product={selectedPost}
                            user={user}
                            viewerId={user?.id}
                            products={allListings}
                            backLabel={linkedEventDetails ? "Back to Post" : profileListingReturn ? "Back to Profile" : postSource === "home" ? "Back to Home" : "Back to Explore"}
                            onBack={() => { window.location.hash = linkedEventDetails || profileListingReturn || postSource; }}
                            onOpenProduct={(id) => openPost(id, postSource)}
                            onOpenSeller={openSeller}
                            onOpenTag={openTag}
                            onMessageUser={(username) => {
                                window.location.hash = `profile/messages/${encodeURIComponent(username.replace(/^@/, ""))}?from=post&source=${postSource}`;
                            }}
                        />
                    ) : selectedPost ? (
                        <PostDetail
                            key={selectedPost.id}
                            post={selectedPost}
                            user={user}
                            eventListings={myListings}
                            onEventUpdated={post => setPublishedPosts(current => current.map(item => item.id === `post-${post.id}` ? asExplorePost(post) : item))}
                            eventDetailsOpen={eventDetailsOpen && selectedPost.is_event}
                            onOpenEventDetails={(id) => {
                                const query = window.location.hash.split("?")[1];
                                window.location.hash = `explore/${id}/event-details${query ? `?${query}` : ""}`;
                            }}
                            backLabel={
                                linkedEventDetails
                                    ? "Back to Post"
                                    : profileFeedUser
                                    ? "Back to Profile"
                                    : postSource === "home"
                                    ? "Back to Home"
                                    : "Back to Explore"
                            }
                            onBack={() => {
                                window.location.hash = linkedEventDetails || (profileFeedUser
                                    ? `seller/${encodeURIComponent(profileFeedUser.slice(1))}`
                                    : postSource);
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
                            onOpenEventPost={(id) => {
                                const query = new URLSearchParams({ eventReturn: window.location.hash });
                                window.location.hash = `explore/${id}?${query}`;
                            }}
                            onBackFromEventDetails={() => { window.location.hash = "explore"; }}
                            onOpenSeller={openSeller}
                            onOpenTag={openTag}
                            relatedPosts={allPosts}
                        />
                    ) : (
                        <ExplorePage
                            posts={[...publishedPosts, ...activeListings, ...exploreFeed]}
                            onOpenPost={openPost}
                            onOpenSeller={openSeller}
                        />
                    ))}
                {page === "Tag" && selectedTag && (
                    <TagPage
                        key={selectedTag.toLowerCase()}
                        tag={selectedTag}
                        posts={[...allPosts, ...activeListings, ...exploreListings]}
                        viewerId={user?.id}
                        onBack={() => { window.location.hash = "explore"; }}
                        onOpenPost={openPost}
                        onOpenSeller={openSeller}
                    />
                )}
                {page === "Seller" && selectedSeller && (
                    <SellerProfilePage
                        key={selectedSeller}
                        seller={selectedSeller}
                        posts={[...publishedPosts, ...exploreFeed.filter(post => post.type !== "listing"), ...allListings.filter((item, index) => allListings.findIndex(listing => listing.id === item.id) === index)]}
                        initialTab={new URLSearchParams(window.location.hash.split("?")[1]).get("tab") === "listings" ? "Listings" : "Posts"}
                        canMessage={Boolean(user)}
                        canFollow={Boolean(user)}
                        viewerId={user?.id}
                        onOpenPost={(id) => {
                            window.location.hash = `explore/${id}?from=profile&profile=${encodeURIComponent(selectedSeller.slice(1))}`;
                        }}
                        onOpenListing={(id) => {
                            const query = new URLSearchParams({ from: "profile", profile: selectedSeller.slice(1), source: postSource });
                            window.location.hash = `explore/${id}?${query}`;
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
                        myListings={myListings}
                        setMyListings={setMyListings}
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
                            if (item !== "Explore" && exploreSession.current) {
                                setExploreFeed(createExploreFeed());
                                exploreSession.current = false;
                            }
                            setPage(item);
                            setSelectedPostId(null);
                        }}
                        aria-label={item}
                        aria-current={
                            page === item ? "page" : undefined
                        }>
                        <Icon name={item} />
                    </a>
                ))}
            </nav>
        </div>
    );
}
export default App;
