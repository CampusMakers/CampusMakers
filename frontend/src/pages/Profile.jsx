import { useEffect, useRef, useState } from "react";
import { withAvailableUsername } from "../services/usernames";

import { AppointmentManager, PostComposer } from "./SellerTools";
import ListingGallery from "./ListingGallery";
import BuyerPickups from "./BuyerPickups";
import BuyerPurchases from "./BuyerPurchases";
import BuyerSaved from "./BuyerSaved";
import BecomeSeller from "./BecomeSeller";
import Settings from "./Settings";
import EditProfile from "./EditProfile";
import Messages from "./Messages";
import Conversation from "./Conversation";
import SellerListingForm from "./SellerListingForm";
import { PostCard } from "./Explore Page/Explore";

import {
    sellerSavedItems
} from "./mockProfileData";

import "./Profile.css";
import "./SellerWorkspace.css";
import { supabase } from "../services/supabase";
import { uploadPhoto } from "../services/photos";
import { useFollows } from "../services/useFollows";

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

function Profile({
    user,
    posts = [],
    postsError = "",
    onPublished,
    myListings = [],
    setMyListings,
    sellerVerified = false,
    initialConversation = null
}) {
    const isGuest = !user;
    const goToLogin = () => { window.location.hash = "login"; };
    const initialProfile = isGuest
        ? { name: "Your Name", username: "username", bio: "Your bio goes here.", image: "" }
        : { name: user.name || user.email, username: user.username || user.email.split("@")[0], bio: user.bio || "", image: user.image || "" };
    const [previewMode, setPreviewMode] = useState("buyer");
    const mode = isGuest ? previewMode : sellerVerified ? "seller" : "buyer";
    const [selectedTab, setActiveTab] = useState(null);
    const [notice, setNotice] = useState("");
    const [connectionPanel, setConnectionPanel] = useState(null);
    const follow = useFollows(user?.id, user?.id);
    const following = follow.following;
    const followers = follow.followers;

    const [showComposer, setShowComposer] = useState(false);
    const myPosts = newestFirst(posts.filter(post => post.seller_id === user?.id));
    // R03: Dedicated create/edit screen for the seller's listings.
    const [showListingForm, setShowListingForm] =
        useState(false);
    const [editingListing, setEditingListing] = useState(null);

    const openCreateListing = () => {
        setEditingListing(null);
        setNotice("");
        setShowListingForm(true);
    };

    const openEditListing = (listing) => {
        setEditingListing(listing);
        setNotice("");
        setShowListingForm(true);
    };

    const closeListingForm = () => {
        setShowListingForm(false);
        setEditingListing(null);
    };

    const saveListing = (listingData) => {
        if (editingListing) {
            setMyListings((current) =>
                current.map((item) =>
                    item.id === editingListing.id
                        ? {
                              ...item,
                              ...listingData,
                              id: item.id
                          }
                        : item
                )
            );
            setNotice("Listing updated for this preview.");
        } else {
            setMyListings((current) => [
                { ...listingData, id: crypto.randomUUID() },
                ...current
            ]);
            setNotice(
                listingData.status === "Draft"
                    ? "Draft saved for this preview."
                    : "Listing created for this preview."
            );
        }

        closeListingForm();
    };

    const deleteListing = (listing) => {
        if (
            !window.confirm(
                `Delete "${listing.name}"? This cannot be undone in this preview.`
            )
        ) {
            return;
        }

        setMyListings((current) =>
            current.filter((item) => item.id !== listing.id)
        );
        setNotice("Listing deleted from this preview.");
    };

    const [showEditProfile, setShowEditProfile] =
        useState(false);

    const [profile, setProfile] = useState(initialProfile);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState("");
    const photoInputRef = useRef(null);

    const saveProfile = async (updatedProfile) => {
        const { error } = await withAvailableUsername(supabase, updatedProfile.username, () => supabase.auth.updateUser({ data: {
            full_name: updatedProfile.name, username: updatedProfile.username,
            bio: updatedProfile.bio, avatar_url: updatedProfile.image
        } }));
        if (error) throw error;
        setProfile(updatedProfile);
        setShowEditProfile(false);
        setNotice("Profile changes saved.");
        return true;
    };

    const changePhoto = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setUploadingPhoto(true);
        setPhotoError("");
        try {
            const image = await uploadPhoto(file);
            await saveProfile({ ...profile, image });
        } catch (error) {
            setPhotoError(error.message);
        } finally {
            setUploadingPhoto(false);
        }
    };

    // Settings page
    const [showSettings, setShowSettings] = useState(false);

    // Messaging navigation
    const [showMessages, setShowMessages] = useState(
        Boolean(initialConversation)
    );

    const [selectedConversation, setSelectedConversation] =
        useState(initialConversation);
    // Seller registration page
    const [showSellerSignup, setShowSellerSignup] =
        useState(false);

    // Enlarged profile picture preview
    const [showAvatarPreview, setShowAvatarPreview] =
        useState(false);

    const avatarCloseButtonRef = useRef(null);

    // Close profile picture using Escape.
    // Keep keyboard focus inside the preview while it's open.
    useEffect(() => {
        if (!showAvatarPreview) return;

        const previouslyFocused = document.activeElement;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setShowAvatarPreview(false);
            }

            if (event.key === "Tab") {
                const controls = [...avatarCloseButtonRef.current.closest('[role="dialog"]').querySelectorAll('button:not(:disabled)')];
                const first = controls[0];
                const last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        };

        avatarCloseButtonRef.current?.focus();

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
            previouslyFocused?.focus();
        };
    }, [showAvatarPreview]);

    const hasSellerAccess = sellerVerified;
    const canPreviewSeller = isGuest;

    const [savedIds, setSavedIds] = useState(() =>
        sellerVerified ? [] : sellerSavedItems.map((item) => item.id)
    );

    const tabs =
        mode === "seller"
            ? ["Posts", "Listings", "Appointments", "Saved"]
            : ["Pickups", "Purchases", "Saved"];

    const activeTab = tabs.includes(selectedTab) ? selectedTab : tabs[0];

    // Guests can preview the account layouts.
    const changeMode = (newMode) => {
        if (newMode === "seller" && !canPreviewSeller) {
            return;
        }

        setPreviewMode(newMode);
        setActiveTab(
            newMode === "seller" ? "Posts" : "Pickups"
        );
        setNotice("");
    };

    const completeDemoSellerSignup = () => {
        setShowSellerSignup(false);
        setNotice('Seller access requires a confirmed .edu email on your signed-in account.');
    };

    const showDemoNotice = (action) => {
        setNotice(
            `${action} will be available when the backend is connected.`
        );
    };

    const toggleSaved = (id) => {
        setSavedIds((current) =>
            current.includes(id)
                ? current.filter((savedId) => savedId !== id)
                : [...current, id]
        );
    };

    // Display an individual conversation.

    if (selectedConversation) {
        const params = new URLSearchParams(
            window.location.hash.split("?")[1] || ""
        );

        const fromPickups = params.get("from") === "pickups";
        const fromSeller = params.get("from") === "seller";
        const sellerSource =
            params.get("source") === "home"
                ? "home"
                : "explore";

        return (
            <Conversation
                username={selectedConversation}
                onBack={() => {
                    if (fromPickups) {
                        // Return to Buyer Pickups.
                        window.location.hash = "profile";
                    } else if (fromSeller) {
                        // Return to the seller profile.
                        const username =
                            selectedConversation.replace(
                                /^@/,
                                ""
                            );

                        window.location.hash =
                            `seller/${encodeURIComponent(username)}` +
                            (sellerSource === "home"
                                ? "?from=home"
                                : "");
                    } else {
                        // Return to the Messages Inbox.
                        setSelectedConversation(null);
                    }
                }}
            />
        );
    }

    // Display the Messages Inbox.
    if (showMessages) {
        return (
            <Messages
                onBack={() => setShowMessages(false)}
                onOpenConversation={(username) =>
                    setSelectedConversation(username)
                }
            />
        );
    }

    // Display the Edit Profile page.
    if (showEditProfile) {
        return (
            <div className="profile-page">
                <EditProfile
                    profile={profile}
                    onBack={() => setShowEditProfile(false)}
                    onSave={saveProfile}
                />
            </div>
        );
    }

    // Display Settings without leaving the Profile page.
    if (showSettings) {
        return (
            <div className="profile-page">
                <Settings
                    email={user.email}
                    profile={profile}
                    onBack={() => setShowSettings(false)}
                />
            </div>
        );
    }

    // Display seller registration.
    if (showSellerSignup) {
        return (
            <div className="profile-page">
                <BecomeSeller
                    onBack={() => setShowSellerSignup(false)}
                    onRegistered={completeDemoSellerSignup}
                />
            </div>
        );
    }

    if (showComposer && hasSellerAccess) {
        return <div className="profile-page"><PostComposer user={user}
            listings={myListings}
            promotablePosts={myPosts.filter(post => !post.is_event)}
            onCancel={() => setShowComposer(false)}
            onPublished={post => {
                onPublished(post);
                setShowComposer(false);
                setActiveTab("Posts");
                setNotice("Your post is published on Explore.");
            }} /></div>;
    }

    // R03: Create and edit listings on a separate screen.
    if (showListingForm) {
        return (
            <div className="profile-page">
                <SellerListingForm
                    key={editingListing?.id ?? "create-listing"}
                    initialListing={editingListing}
                    onSave={saveListing}
                    onCancel={closeListingForm}
                />
            </div>
        );
    }

    return (
        <div className="profile-page">
            {/* BUYER / SELLER MODE SWITCH */}
            {canPreviewSeller && (
                <div className="profile-mode-switch">
                    <button
                        type="button"
                        aria-pressed={mode === "buyer"}
                        onClick={() => changeMode("buyer")}>
                        Buyer Mode
                    </button>

                    <button
                        type="button"
                        aria-pressed={mode === "seller"}
                        onClick={() => changeMode("seller")}>
                        Seller Mode
                    </button>
                </div>
            )}

            {/* PROFILE HEADER ACTIONS */}
            <div className="profile-toolbar">
                <div>
                    <span className="profile-eyebrow">
                        CAMPUS MAKERS
                    </span>
                    <h2>My Profile</h2>
                </div>

                <div className="profile-toolbar-actions">
                    <button
                        type="button"
                        className="profile-icon-button"
                        aria-label="Messages"
                        title="Messages"
                        onClick={() => {
                            setNotice("");
                            setSelectedConversation(null);
                            if (isGuest) { goToLogin(); return; }
                            setShowMessages(true);
                        }}>
                        ✉
                    </button>

                    <button
                        type="button"
                        className="profile-icon-button"
                        aria-label="Settings"
                        title="Settings"
                        onClick={() => {
                            setNotice("");
                            if (isGuest) { goToLogin(); return; }
                            setShowSettings(true);
                        }}>
                        ⚙
                    </button>
                </div>
            </div>

            {/* INSTAGRAM-STYLE PROFILE HEADER */}
            <div className="profile-header">
                {/* CLICKABLE PROFILE PICTURE */}
                <button
                    type="button"
                    className="profile-avatar"
                    aria-label="View profile picture"
                    aria-haspopup="dialog"
                    onClick={() => setShowAvatarPreview(true)}>
                    {profile.image ? (
                        <img
                            src={profile.image}
                            alt=""
                            className="profile-avatar-image"
                        />
                    ) : (
                        profile.name?.charAt(0).toUpperCase() ||
                        "C"
                    )}
                </button>

                <div className="profile-social-stats" aria-label="Profile statistics">
                    <div><strong>{postsError ? '—' : myPosts.length}</strong><span>Posts</span></div>
                    <button type="button" onClick={() => setConnectionPanel("following")}><strong>{isGuest ? 0 : follow.ready && !follow.error ? follow.followingCount : "—"}</strong><span>Following</span></button>
                    <button type="button" onClick={() => setConnectionPanel("followers")}><strong>{isGuest ? 0 : follow.ready && !follow.error ? follow.followerCount : "—"}</strong><span>Followers</span></button>
                </div>
            </div>

            {/* NAME, USERNAME AND BIO */}
            <div className="profile-bio">
                <h3>{profile.name}</h3>

                <p className="profile-username">
                    @{profile.username}
                </p>

                <p className="profile-description">
                    {profile.bio || <button type="button" className="login-text-button" onClick={() => setShowEditProfile(true)}>Add bio</button>}
                </p>
            </div>

            {/* EDIT PROFILE - ONLY MAIN PROFILE ACTION */}
            <button
                type="button"
                className="profile-edit-button"
                onClick={() => {
                    setNotice("");
                    if (isGuest) { goToLogin(); return; }
                    setShowEditProfile(true);
                }}>
                Edit Profile
            </button>

            {connectionPanel && (
                <section className="profile-panel profile-connections" aria-label={connectionPanel}>
                    <div className="profile-panel-heading">
                        <h3>{connectionPanel === "following" ? "Following" : "Followers"}</h3>
                        <button type="button" className="profile-connection-close" onClick={() => setConnectionPanel(null)}>Close</button>
                    </div>
                    {follow.error ? <p role="alert">{follow.error}</p> : (connectionPanel === "following" ? following : followers).length ? <div className="profile-connection-list">
                        {(connectionPanel === "following" ? following : followers).map(person => <button type="button" key={person.id} onClick={() => { window.location.hash = `seller/${encodeURIComponent(person.username)}`; }}>
                            {person.name && <strong>{person.name} </strong>}@{person.username}
                        </button>)}
                    </div> : <p className="seller-empty-state">{connectionPanel === "following" ? "You are not following anyone yet." : "No followers yet."}</p>}
                </section>
            )}

            {mode === "seller" && <div className="profile-appointment-actions">
                <button type="button" className="profile-action-button profile-action-primary"
                    onClick={() => isGuest ? goToLogin() : setShowComposer(true)}>+ Create post</button>
                <button type="button" className="profile-action-button"
                    onClick={() => setActiveTab("Appointments")}>Manage appointments</button>
            </div>}

            {/* BECOME A SELLER */}
            {!isGuest && !hasSellerAccess && (
                <section className="profile-seller-invite">
                    <div>
                        <h3>
                            Have something to create or sell?
                        </h3>
                        <p>
                            Become a Campus Maker and share your
                            work with students on campus.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="profile-become-seller-button"
                        onClick={() => {
                            setNotice("");
                            setShowSellerSignup(true);
                        }}>
                        Become a Seller →
                    </button>
                </section>
            )}

            {/* DEMO NOTICES */}
            {notice && (
                <div className="profile-notice" role="status">
                    <span>{notice}</span>

                    <button
                        type="button"
                        aria-label="Dismiss message"
                        onClick={() => setNotice("")}>
                        ×
                    </button>
                </div>
            )}

            {/* PROFILE TABS */}
            <div className="profile-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        aria-pressed={activeTab === tab}
                        onClick={() => {
                            setActiveTab(tab);
                            setNotice("");
                        }}>
                        {tab}
                    </button>
                ))}
            </div>

            {isGuest ? (
                <section className="profile-empty-tab" aria-label={`${activeTab} empty`}>
                    <h3>Nothing here yet</h3>
                    <p><a href="#login">Log in</a> to start exploring your Campus Makers.</p>
                </section>
            ) : <>
            {mode === "seller" && activeTab === "Posts" && <section className="profile-panel seller-panel">
                <div className="profile-panel-heading"><h3>Your posts</h3><span className="profile-count">{postsError ? "—" : myPosts.length} posts</span></div>
                <p className="seller-section-description">Share your latest work with your campus.</p>
                <button type="button" className="profile-action-button profile-action-primary seller-section-action" onClick={() => setShowComposer(true)}>+ Create post</button>
                {postsError ? <p role="alert">{postsError}</p> : myPosts.length ? <div className="profile-post-feed">
                    {myPosts.map(post => <PostCard
                        key={post.id}
                        post={toExploreCardPost(post)}
                        onOpenPost={(id) => { window.location.hash = `explore/${id}`; }}
                        onOpenSeller={(creator) => { window.location.hash = `seller/${encodeURIComponent(creator.slice(1))}`; }}
                    />)}
                </div> : <p className="seller-empty-state">No posts yet. Create your first post to share your work.</p>}
            </section>}
            {/* SELLER: LISTINGS */}
            {mode === "seller" &&
                hasSellerAccess &&
                activeTab === "Listings" && (
                    <section className="profile-listings seller-panel">
                        <div className="profile-panel-heading">
                            <h3>Your Listings</h3>

                            <span className="profile-count">
                                {myListings.length} items
                            </span>
                        </div>

                        <p className="seller-section-description">Manage the items you offer to your campus.</p>
                        <button
                            type="button"
                            className="profile-action-button profile-action-primary seller-section-action"
                            onClick={openCreateListing}>
                            + Add Listing
                        </button>

                        <div className="profile-listings-grid">
                            {myListings.map((listing) => (
                                <article
                                    className="profile-listing-card"
                                    key={listing.id}>
                                    <ListingGallery
                                        images={listing.images}
                                        productName={
                                            listing.name
                                        }
                                    />

                                    <h4>{listing.name}</h4>

                                    <p>
                                        $
                                        {listing.price.toFixed(
                                            2
                                        )}
                                    </p>

                                    <span>
                                        {listing.status}
                                    </span>

                                    {/* Seller management actions: no Save icon on owned listings. */}
                                    <div className="profile-listing-management">
                                        <button
                                            type="button"
                                            className="profile-listing-edit"
                                            onClick={() =>
                                                openEditListing(
                                                    listing
                                                )
                                            }>
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="profile-listing-delete"
                                            onClick={() =>
                                                deleteListing(
                                                    listing
                                                )
                                            }>
                                            Delete
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {myListings.length === 0 && (
                            <p className="seller-empty-state">
                                No listings yet. Click + Add
                                Listing to get started.
                            </p>
                        )}
                    </section>
                )}

            {/* SELLER: APPOINTMENTS */}
            {mode === "seller" &&
                hasSellerAccess &&
                activeTab === "Appointments" && (
                    <AppointmentManager user={user} />
                )}

            {/* SELLER: SAVED */}
            {mode === "seller" && hasSellerAccess && activeTab === "Saved" && <section className="profile-empty-tab"><h3>No saved items to display</h3></section>}
            {/* BUYER: PICKUPS */}
            {mode === "buyer" && activeTab === "Pickups" && (
                <BuyerPickups onDemoAction={showDemoNotice} />
            )}

            {/* BUYER: PURCHASES */}
            {mode === "buyer" && activeTab === "Purchases" && (
                <BuyerPurchases onDemoAction={showDemoNotice} />
            )}

            {/* BUYER: SAVED */}
            {mode === "buyer" && activeTab === "Saved" && (
                <BuyerSaved
                    savedItems={sellerSavedItems}
                    savedIds={savedIds}
                    onToggleSaved={toggleSaved}
                    onDemoAction={showDemoNotice}
                />
            )}

            </>}

            {/* ENLARGED PROFILE PICTURE PREVIEW */}
            {showAvatarPreview && (
                <div
                    className="profile-avatar-overlay"
                    role="presentation"
                    onClick={(event) => {
                        if (
                            event.target === event.currentTarget
                        ) {
                            setShowAvatarPreview(false);
                        }
                    }}>
                    <div
                        className="profile-avatar-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Profile picture preview">
                        <button
                            ref={avatarCloseButtonRef}
                            type="button"
                            className="profile-avatar-close"
                            aria-label="Close profile picture"
                            onClick={() =>
                                setShowAvatarPreview(false)
                            }>
                            ×
                        </button>

                        <div className="profile-avatar-large">
                            {profile.image ? (
                                <img
                                    src={profile.image}
                                    alt="Your profile"
                                />
                            ) : (
                                profile.name
                                    ?.charAt(0)
                                    .toUpperCase() || "C"
                            )}
                        </div>

                        <p>Profile Picture</p>
                        <input ref={photoInputRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={changePhoto} />
                        <button type="button" className="profile-edit-button" disabled={uploadingPhoto} onClick={() => isGuest ? goToLogin() : photoInputRef.current?.click()}>{uploadingPhoto ? "Uploading…" : "Change profile picture"}</button>
                        {photoError && <p role="alert">{photoError}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Profile;
