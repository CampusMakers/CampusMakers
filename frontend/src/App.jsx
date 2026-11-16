import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState
} from "react";
import PasswordRecovery from "./pages/PasswordRecovery";
import "./App.css";
import VerifySeller from "./pages/VerifySeller";
import { previewStore } from "./services/previewStore";
import { sellerListings } from "./pages/mockProfileData";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { usePreviewUser } from "./services/usePreviewUser";
import calendarIcon from "./assets/nav-icons/Calendar.svg";
import exploreIcon from "./assets/nav-icons/Explore.svg";
import homeIcon from "./assets/nav-icons/Home.svg";
import mapIcon from "./assets/nav-icons/Map.svg";
import profileIcon from "./assets/nav-icons/Profile.svg";
import MapPage from "./pages/Map";
import CalendarPage from "./pages/Calendar";
import ProductDetail from "./pages/ProductDetail";
import { CartPage, CheckoutPage } from "./pages/Cart";
import SellerDemo from "./pages/SellerDemo";
import { useCart } from "./services/useCart";
import { cartItemCount } from "./services/cartModel";
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
    explorePosts
} from "./pages/Explore Page/exploreData";
import { getStoreListings } from "./services/listingApi";
import { getPublicListings } from "./services/listingApi";

const asExplorePost = (post) => ({
    ...post,
    id: `post-${post.id}`,
    type: post.post_type || (post.image ? "image" : "text"),
    tags: post.tags?.length ? post.tags : ["Campus makers"],
    layout: "standard",
    tone: "peach"
});

// R04 frontend preview only: registrations are not sent to the backend.
// Keys are scoped by the signed-in user's ID, not shared across accounts.
const EVENT_JOINS_STORAGE_KEY =
    "campus-makers-r04-event-joins-preview";

function readPreviewEventJoins() {
    try {
        const saved = window.localStorage.getItem(
            EVENT_JOINS_STORAGE_KEY
        );
        const parsed = saved ? JSON.parse(saved) : {};
        return parsed &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
            ? parsed
            : {};
    } catch {
        return {};
    }
}

const eventPostId = (id) => {
    const value = String(id);
    return value.startsWith("post-") ? value : `post-${value}`;
};

const pages = ["Home", "Map", "Calendar", "Explore", "Profile"];
const currentPage = () => {
    const slug = window.location.hash
        .slice(1)
        .toLowerCase()
        .split(/[/?]/)[0];
    if (!slug || slug === "login") return "Login";
    if (slug === "cart") return "Cart";
    if (slug === "checkout") return "Checkout";
    if (slug === "seller-demo") return "SellerDemo";
    if (slug === "verify-seller") return "VerifySeller";
    return slug === "seller"
        ? "Seller"
        : slug === "tag"
          ? "Tag"
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
    const { user, loading } = usePreviewUser();
    const {
        items: cartItems,
        add: addToCart,
        setQuantity: setCartQuantity,
        remove: removeFromCart
    } = useCart(user?.id ? `user:${user.id}` : "guest");
    const cartCount = cartItemCount(cartItems);
    let checkoutItemId = "";
    try {
        checkoutItemId = decodeURIComponent(
            window.location.hash.split("/")[1] || ""
        );
    } catch {
        // Invalid route encoding must not break the application.
    }
    const [page, setPage] = useState(currentPage),
        [selectedPostId, setSelectedPostId] = useState(
            currentExplorePostId
        ),
        [eventDetailsOpen, setEventDetailsOpen] = useState(() =>
            /\/event-details(?:\?|$)/i.test(
                window.location.hash
            )
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
        [selectedTag, setSelectedTag] =
            useState(currentTagName),
        [exploreFeed, setExploreFeed] = useState(
            createExploreFeed
        );

    const [publishedPosts, setPublishedPosts] = useState([]);
    const [listingsByUser, setListingsByUser] = useState(
        () => ({
            "preview-user": sellerListings.map((item) => ({
                ...item,
                images: [...(item.images || [])]
            }))
        })
    );
    const listingOwner = user?.id || "guest";
    const myListings = listingsByUser[listingOwner] || [];
    const setMyListings = (value) =>
        setListingsByUser((current) => ({
            ...current,
            [listingOwner]:
                typeof value === "function"
                    ? value(current[listingOwner] || [])
                    : value
        }));

    // Shared marketplace listings for Home and Explore.
    const [publicListings, setPublicListings] = useState([]);
    const [publicListingsLoading, setPublicListingsLoading] =
        useState(false);
    const [publicListingsError, setPublicListingsError] =
        useState("");

    useEffect(() => {
        if (
            !["Home", "Explore", "Seller", "Tag"].includes(page)
        ) {
            return;
        }

        let cancelled = false;
        setPublicListingsLoading(true);

        getPublicListings()
            .then((listings) => {
                if (cancelled) return;
                setPublicListings(listings);
                setPublicListingsError("");
            })
            .catch(() => {
                if (cancelled) return;
                setPublicListingsError(
                    "Published listings could not be loaded."
                );
            })
            .finally(() => {
                if (!cancelled) setPublicListingsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [page]);

    // Load the signed-in seller's listings from PostgreSQL.
    useEffect(() => {
        const ownerId = user?.id;
        const storeId = user?.sellerVerified
            ? user?.store?.id
            : null;

        if (!ownerId || !storeId) return;

        let cancelled = false;

        getStoreListings(storeId)
            .then((listings) => {
                if (cancelled) return;

                setListingsByUser((current) => ({
                    ...current,
                    [ownerId]: listings
                }));
            })
            .catch(() => {
                if (!cancelled) {
                    console.error(
                        "Unable to load seller listings."
                    );
                }
            });

        return () => {
            cancelled = true;
        };
    }, [user?.id, user?.store?.id, user?.sellerVerified]);

    const [postsError, setPostsError] = useState("");
    useEffect(() => {
        if (!previewStore) return;
        let active = true;
        const loadPosts = () =>
            previewStore
                .from("maker_posts")
                .select("*")
                .order("created_at", { ascending: false })
                .then(({ data, error }) => {
                    if (!active) return;
                    if (error)
                        setPostsError(
                            "Posts could not be loaded. Please try again later."
                        );
                    else {
                        setPublishedPosts(
                            data.map(asExplorePost)
                        );
                        setPostsError("");
                    }
                });
        loadPosts();
        window.addEventListener(
            "campus-makers-preview",
            loadPosts
        );
        const timer = window.setInterval(loadPosts, 30000);
        return () => {
            active = false;
            window.clearInterval(timer);
            window.removeEventListener(
                "campus-makers-preview",
                loadPosts
            );
        };
    }, []);

    // R04: Share the same real seller-created events with Calendar and Profile.
    const realEvents = publishedPosts.filter(
        (post) => post.is_event
    );

    // R04 FRONTEND PREVIEW: local-only joined events, separated by account.
    // TODO (backend): replace with authenticated event attendance endpoints.
    const [joinedEventsByUser, setJoinedEventsByUser] =
        useState(readPreviewEventJoins);
    useEffect(() => {
        try {
            window.localStorage.setItem(
                EVENT_JOINS_STORAGE_KEY,
                JSON.stringify(joinedEventsByUser)
            );
        } catch {
            // Local preview still works in memory if storage is unavailable.
        }
    }, [joinedEventsByUser]);

    const joinedEventIds =
        user?.id && Array.isArray(joinedEventsByUser[user.id])
            ? joinedEventsByUser[user.id]
            : [];
    const joinedEvents = realEvents.filter((event) =>
        joinedEventIds.includes(event.id)
    );
    const hostedEvents = user?.id
        ? realEvents.filter(
              (event) => event.seller_id === user.id
          )
        : [];

    const joinEvent = (id) => {
        if (!user?.id) {
            window.location.hash = "login";
            return false;
        }

        const postId = eventPostId(id);
        // Sample calendar projects must never become real registrations.
        if (!realEvents.some((event) => event.id === postId)) {
            return false;
        }

        setJoinedEventsByUser((current) => {
            const previous = Array.isArray(current[user.id])
                ? current[user.id]
                : [];
            if (previous.includes(postId)) return current;
            return {
                ...current,
                [user.id]: [...previous, postId]
            };
        });
        return true;
    };

    const leaveEvent = (id) => {
        if (!user?.id) return false;
        const postId = eventPostId(id);
        setJoinedEventsByUser((current) => ({
            ...current,
            [user.id]: (Array.isArray(current[user.id])
                ? current[user.id]
                : []
            ).filter((joinedId) => joinedId !== postId)
        }));
        return true;
    };

    const allPosts = [...publishedPosts, ...explorePosts];

    const eventListings = allPosts.flatMap((post) =>
        (post.event_listings || []).map((item) => ({
            ...item,
            id: `listing-${item.id}`,
            creator: item.creator || post.creator,
            type: "listing",
            caption: item.name,
            tags: [],
            layout: "portrait",
            tone: "peach"
        }))
    );
    const allListings = [
        ...publicListings,
        ...eventListings.filter(
            (item) =>
                !publicListings.some(
                    (listing) => listing.id === item.id
                )
        )
    ];
    const exploreSession = useRef(
        ["Explore", "Tag"].includes(currentPage())
    );

    const [messageRecipient, setMessageRecipient] = useState(
        currentMessageRecipient
    );
    useEffect(() => {
        const onNavigation = () => {
            const nextPage = currentPage();
            if (nextPage === "Explore" || nextPage === "Tag")
                exploreSession.current = true;
            setPage(nextPage);
            setSelectedPostId(currentExplorePostId());
            setEventDetailsOpen(
                /\/event-details(?:\?|$)/i.test(
                    window.location.hash
                )
            );
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
    }, [
        page,
        selectedPostId,
        selectedSeller,
        selectedTag,
        eventDetailsOpen
    ]);

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
    // R04: Open the existing event details screen, preserving the source
    // so Back returns to Calendar or Profile.
    const openEvent = (id, from = "calendar") => {
        const postId = eventPostId(id);
        if (!realEvents.some((event) => event.id === postId))
            return;

        const source =
            from === "profile" ? "profile" : "calendar";
        window.location.hash = `explore/${postId}/event-details?from=${source}`;
    };

    const eventOpenSource = new URLSearchParams(
        window.location.hash.split("?")[1] || ""
    ).get("from");
    const eventBackTarget =
        eventOpenSource === "calendar" ||
        eventOpenSource === "profile"
            ? eventOpenSource
            : null;
    const eventReturn = new URLSearchParams(
        window.location.hash.split("?")[1]
    ).get("eventReturn");
    const linkedEventDetails =
        eventReturn &&
        /^#explore\/(?:post-)?\d+\/event-details(?:\?.*)?$/i.test(
            eventReturn
        )
            ? eventReturn
            : null;
    const profileListingReturn =
        selectedPost?.type === "listing" && profileFeedUser
            ? `seller/${encodeURIComponent(profileFeedUser.slice(1))}?tab=listings${new URLSearchParams(window.location.hash.split("?")[1]).get("source") === "home" ? "&from=home" : ""}`
            : null;
    const profileFeedPosts = profileFeedUser
        ? [...publishedPosts, ...exploreFeed].filter(
              (post) =>
                  (post.creator === profileFeedUser ||
                      post.collaborators?.includes(
                          profileFeedUser
                      )) &&
                  post.type !== "listing"
          )
        : null;

    if (
        new URLSearchParams(window.location.search).has(
            "reset_password"
        )
    ) {
        return <PasswordRecovery mode="update" />;
    }

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
                <button
                    type="button"
                    className="brand-cart"
                    aria-label={`Shopping cart, ${cartCount} items`}
                    onClick={() => {
                        window.location.hash = "cart";
                    }}>
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.7 13.3a2 2 0 0 0 2 1.7h9.7a2 2 0 0 0 2-1.7L23 6H6" />
                    </svg>
                    {cartCount > 0 && (
                        <span
                            className="brand-cart-count"
                            aria-hidden="true">
                            {cartCount > 99 ? "99+" : cartCount}
                        </span>
                    )}
                </button>
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
                {page === "SellerDemo" && <SellerDemo />}
                {page === "VerifySeller" && <VerifySeller />}
                {page === "Cart" && (
                    <CartPage
                        items={cartItems}
                        onQuantity={setCartQuantity}
                        onRemove={removeFromCart}
                        onCheckout={(id) => {
                            window.location.hash = `checkout/${encodeURIComponent(id)}`;
                        }}
                        onContinue={() => {
                            window.location.hash = "explore";
                        }}
                    />
                )}
                {page === "Checkout" && (
                    <CheckoutPage
                        key={window.location.hash}
                        item={cartItems.find(
                            (item) => item.id === checkoutItemId
                        )}
                        onBack={() => {
                            window.location.hash = "cart";
                        }}
                    />
                )}
                {page === "Home" && (
                    <Home
                        posts={allPosts}
                        listings={publicListings}
                        listingsLoading={publicListingsLoading}
                        listingsError={publicListingsError}
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
                            backLabel={
                                linkedEventDetails
                                    ? "Back to Post"
                                    : profileListingReturn
                                      ? "Back to Profile"
                                      : postSource === "home"
                                        ? "Back to Home"
                                        : "Back to Explore"
                            }
                            onBack={() => {
                                window.location.hash =
                                    linkedEventDetails ||
                                    profileListingReturn ||
                                    postSource;
                            }}
                            onOpenProduct={(id) =>
                                openPost(id, postSource)
                            }
                            onOpenSeller={openSeller}
                            onOpenTag={openTag}
                            onAddToCart={addToCart}
                            onViewCart={() => {
                                window.location.hash = "cart";
                            }}
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
                            joinedEventIds={joinedEventIds}
                            onJoinEvent={joinEvent}
                            onLeaveEvent={leaveEvent}
                            eventDetailsBackLabel={
                                eventBackTarget === "calendar"
                                    ? "Back to Calendar"
                                    : eventBackTarget ===
                                        "profile"
                                      ? "Back to Profile"
                                      : "Back to Explore"
                            }
                            onEventUpdated={(post) =>
                                setPublishedPosts((current) =>
                                    current.map((item) =>
                                        item.id ===
                                        `post-${post.id}`
                                            ? asExplorePost(
                                                  post
                                              )
                                            : item
                                    )
                                )
                            }
                            eventDetailsOpen={
                                eventDetailsOpen &&
                                selectedPost.is_event
                            }
                            onOpenEventDetails={(id) => {
                                const query =
                                    window.location.hash.split(
                                        "?"
                                    )[1];
                                window.location.hash = `explore/${id}/event-details${query ? `?${query}` : ""}`;
                            }}
                            backLabel={
                                eventDetailsOpen &&
                                eventBackTarget
                                    ? eventBackTarget ===
                                      "calendar"
                                        ? "Back to Calendar"
                                        : "Back to Profile"
                                    : linkedEventDetails
                                      ? "Back to Post"
                                      : profileFeedUser
                                        ? "Back to Profile"
                                        : postSource === "home"
                                          ? "Back to Home"
                                          : "Back to Explore"
                            }
                            onBack={() => {
                                window.location.hash =
                                    (eventDetailsOpen &&
                                        eventBackTarget) ||
                                    linkedEventDetails ||
                                    (profileFeedUser
                                        ? `seller/${encodeURIComponent(profileFeedUser.slice(1))}`
                                        : postSource);
                            }}
                            profileFeed={profileFeedPosts}
                            profileFeedUser={profileFeedUser}
                            canReply={Boolean(
                                user?.sellerVerified
                            )}
                            onMessageUser={(username) => {
                                window.location.hash = `profile/messages/${encodeURIComponent(username.replace(/^@/, ""))}?from=post&source=${postSource}`;
                            }}
                            onOpenPost={(id) =>
                                openPost(id, postSource)
                            }
                            onOpenEventPost={(id) => {
                                const query =
                                    new URLSearchParams({
                                        eventReturn:
                                            window.location.hash
                                    });
                                window.location.hash = `explore/${id}?${query}`;
                            }}
                            onBackFromEventDetails={() => {
                                window.location.hash =
                                    eventBackTarget ||
                                    "explore";
                            }}
                            onOpenSeller={openSeller}
                            onOpenTag={openTag}
                            relatedPosts={allPosts}
                        />
                    ) : (
                        <ExplorePage
                            posts={[
                                ...publishedPosts,
                                ...publicListings,
                                ...exploreFeed
                            ]}
                            onOpenPost={openPost}
                            onOpenSeller={openSeller}
                        />
                    ))}
                {page === "Tag" && selectedTag && (
                    <TagPage
                        key={selectedTag.toLowerCase()}
                        tag={selectedTag}
                        posts={[...allPosts, ...publicListings]}
                        viewerId={user?.id}
                        onBack={() => {
                            window.location.hash = "explore";
                        }}
                        onOpenPost={openPost}
                        onOpenSeller={openSeller}
                    />
                )}
                {page === "Seller" && selectedSeller && (
                    <SellerProfilePage
                        key={selectedSeller}
                        seller={selectedSeller}
                        posts={[
                            ...publishedPosts,
                            ...exploreFeed.filter(
                                (post) =>
                                    post.type !== "listing"
                            ),
                            ...allListings.filter(
                                (item, index) =>
                                    allListings.findIndex(
                                        (listing) =>
                                            listing.id ===
                                            item.id
                                    ) === index
                            )
                        ]}
                        initialTab={
                            new URLSearchParams(
                                window.location.hash.split(
                                    "?"
                                )[1]
                            ).get("tab") === "listings"
                                ? "Listings"
                                : "Posts"
                        }
                        canMessage={Boolean(user)}
                        canFollow={Boolean(user)}
                        viewerId={user?.id}
                        onOpenPost={(id) => {
                            window.location.hash = `explore/${id}?from=profile&profile=${encodeURIComponent(selectedSeller.slice(1))}`;
                        }}
                        onOpenListing={(id) => {
                            const query = new URLSearchParams({
                                from: "profile",
                                profile:
                                    selectedSeller.slice(1),
                                source: postSource
                            });
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
                {page === "Calendar" && (
                    <CalendarPage
                        events={realEvents}
                        user={user}
                        joinedEventIds={joinedEventIds}
                        onJoinEvent={joinEvent}
                        onLeaveEvent={leaveEvent}
                        onOpenEvent={openEvent}
                    />
                )}
                {page === "Profile" && !loading && (
                    <Profile
                        key={`${user?.id ?? "guest"}:${messageRecipient ?? "profile"}`}
                        user={user}
                        posts={publishedPosts}
                        myListings={myListings}
                        setMyListings={setMyListings}
                        postsError={postsError}
                        onPublished={(post) => {
                            setPublishedPosts((current) => [
                                asExplorePost(post),
                                ...current.filter(
                                    (item) =>
                                        item.id !==
                                        `post-${post.id}`
                                )
                            ]);
                            setPostsError("");
                        }}
                        onPostUpdated={(post) => {
                            const updatedPost =
                                asExplorePost(post);

                            setPublishedPosts((current) =>
                                current.map((item) =>
                                    item.id === updatedPost.id
                                        ? updatedPost
                                        : item
                                )
                            );
                        }}
                        onPostDeleted={(postId) => {
                            setPublishedPosts((current) =>
                                current.filter(
                                    (item) =>
                                        item.id !==
                                            `post-${postId}` &&
                                        item.id !== postId
                                )
                            );
                        }}
                        sellerVerified={user?.sellerVerified}
                        initialConversation={
                            user ? messageRecipient : null
                        }
                        joinedEvents={joinedEvents}
                        hostedEvents={hostedEvents}
                        onLeaveEvent={leaveEvent}
                        onOpenEvent={(id) =>
                            openEvent(id, "profile")
                        }
                    />
                )}
                {page === "Profile" && loading && (
                    <p role="status">Checking your session…</p>
                )}
                {page === "Login" &&
                    (loading ? (
                        <p role="status">
                            Checking your session…
                        </p>
                    ) : (
                        <Login />
                    ))}
            </main>
            <nav
                className="bottom-nav"
                aria-label="Main navigation">
                {pages.map((item) => (
                    <a
                        key={item}
                        href={`#${item.toLowerCase()}`}
                        onClick={() => {
                            if (
                                item !== "Explore" &&
                                exploreSession.current
                            ) {
                                setExploreFeed(
                                    createExploreFeed()
                                );
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
