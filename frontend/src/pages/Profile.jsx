import { useEffect, useRef, useState } from "react";

import ListingGallery from "./ListingGallery";
import SellerAppointments from "./SellerAppointments";
import SellerSaved from "./SellerSaved";
import BuyerPickups from "./BuyerPickups";
import BuyerPurchases from "./BuyerPurchases";
import BuyerSaved from "./BuyerSaved";
import BecomeSeller from "./BecomeSeller";
import Settings from "./Settings";
import EditProfile from "./EditProfile";
import Messages from "./Messages";
import Conversation from "./Conversation";
import SellerListingForm from "./SellerListingForm";

import {
    sellerListings,
    sellerSavedItems
} from "./mockProfileData";

import "./Profile.css";

// Temporary browser storage for the seller demo.
// Remove this when real seller verification is connected.
const DEMO_SELLER_KEY = "campusMakersDemoSeller";

const PROFILE_KEY = "campusMakersDemoProfile";

const DEFAULT_PROFILE = {
    name: "Your Name",
    username: "username",
    bio: "Student creator at Campus Makers ✨",
    image: ""
};

function Profile({
    sellerVerified = false,
    initialConversation = null
}) {
    const [mode, setMode] = useState("buyer");
    const [activeTab, setActiveTab] = useState("Pickups");
    const [notice, setNotice] = useState("");

    // R03: Seller listings managed by the frontend.
    // The backend team can replace the initial mock data
    // with listings from the API later.
    const [myListings, setMyListings] = useState(() =>
        sellerListings.map((listing) => ({
            ...listing,
            images: [...(listing.images || [])]
        }))
    );
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

    const [profile, setProfile] = useState(() => {
        try {
            const saved =
                window.localStorage.getItem(PROFILE_KEY);
            return saved
                ? { ...DEFAULT_PROFILE, ...JSON.parse(saved) }
                : { ...DEFAULT_PROFILE };
        } catch {
            return { ...DEFAULT_PROFILE };
        }
    });

    const saveProfile = (updatedProfile) => {
        try {
            window.localStorage.setItem(
                PROFILE_KEY,
                JSON.stringify(updatedProfile)
            );
        } catch {
            return false;
        }

        setProfile(updatedProfile);
        setShowEditProfile(false);
        setNotice(
            "Profile changes saved in this browser (demo)."
        );
        return true;
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
                event.preventDefault();
                avatarCloseButtonRef.current?.focus();
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

    // Remember whether this browser completed demo signup.
    const [demoSellerRegistered, setDemoSellerRegistered] =
        useState(() => {
            return (
                typeof window !== "undefined" &&
                window.localStorage.getItem(DEMO_SELLER_KEY) ===
                    "true"
            );
        });

    // Real verification OR temporary demo registration.
    const hasSellerAccess =
        sellerVerified || demoSellerRegistered;

    const [savedIds, setSavedIds] = useState(() =>
        sellerSavedItems.map((item) => item.id)
    );

    const tabs =
        mode === "seller"
            ? ["Listings", "Appointments", "Saved"]
            : ["Pickups", "Purchases", "Saved"];

    // Switch between Buyer and Seller profiles.
    const changeMode = (newMode) => {
        if (newMode === "seller" && !hasSellerAccess) {
            return;
        }

        setMode(newMode);
        setActiveTab(
            newMode === "seller" ? "Listings" : "Pickups"
        );
        setNotice("");
    };

    // Called when the demo seller form is submitted.
    const completeDemoSellerSignup = () => {
        setDemoSellerRegistered(true);

        window.localStorage.setItem(DEMO_SELLER_KEY, "true");

        setShowSellerSignup(false);
        setMode("seller");
        setActiveTab("Listings");

        setNotice(
            "Seller preview enabled! Student verification " +
                "will be added when the backend is connected."
        );
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
            {hasSellerAccess && (
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

                {/* PROFILE STATISTICS */}
                <div
                    className="profile-social-stats"
                    aria-label="Profile statistics">
                    <div>
                        <strong>—</strong>
                        <span>Posts</span>
                    </div>

                    <div>
                        <strong>—</strong>
                        <span>Followers</span>
                    </div>

                    <div>
                        <strong>—</strong>
                        <span>Following</span>
                    </div>
                </div>
            </div>

            {/* NAME, USERNAME AND BIO */}
            <div className="profile-bio">
                <h3>{profile.name}</h3>

                <p className="profile-username">
                    @{profile.username}
                </p>

                <p className="profile-description">
                    {profile.bio}
                </p>
            </div>

            {/* EDIT PROFILE - ONLY MAIN PROFILE ACTION */}
            <button
                type="button"
                className="profile-edit-button"
                onClick={() => {
                    setNotice("");
                    setShowEditProfile(true);
                }}>
                Edit Profile
            </button>

            {/* BECOME A SELLER */}
            {!hasSellerAccess && (
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

            {/* SELLER: LISTINGS */}
            {mode === "seller" &&
                hasSellerAccess &&
                activeTab === "Listings" && (
                    <section className="profile-listings">
                        <div className="profile-panel-heading">
                            <h3>Your Listings</h3>

                            <span className="profile-count">
                                {myListings.length} items
                            </span>
                        </div>

                        <button
                            type="button"
                            className="profile-add-listing-button"
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
                            <p className="profile-listings-empty">
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
                    <SellerAppointments
                        onDemoAction={showDemoNotice}
                    />
                )}

            {/* SELLER: SAVED */}
            {mode === "seller" &&
                hasSellerAccess &&
                activeTab === "Saved" && (
                    <SellerSaved
                        savedItems={sellerSavedItems}
                        savedIds={savedIds}
                        onToggleSaved={toggleSaved}
                        onDemoAction={showDemoNotice}
                    />
                )}

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
                    </div>
                </div>
            )}
        </div>
    );
}

export default Profile;
