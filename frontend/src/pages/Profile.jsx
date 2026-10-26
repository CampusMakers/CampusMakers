import { useState } from "react";

import ListingGallery from "./ListingGallery";
import SellerAppointments from "./SellerAppointments";
import SellerSaved from "./SellerSaved";
import BuyerPickups from "./BuyerPickups";
import BuyerPurchases from "./BuyerPurchases";
import BuyerSaved from "./BuyerSaved";
import BecomeSeller from "./BecomeSeller";
import Settings from "./Settings";

import {
    sellerListings,
    sellerSavedItems
} from "./mockProfileData";

import "./Profile.css";

// Temporary browser storage for the seller demo.
// Remove this when real seller verification is connected.
const DEMO_SELLER_KEY = "campusMakersDemoSeller";

function Profile({ sellerVerified = false }) {
    const [mode, setMode] = useState("buyer");
    const [activeTab, setActiveTab] = useState("Pickups");
    const [notice, setNotice] = useState("");

    // Controls whether the Settings page is displayed.
    const [showSettings, setShowSettings] = useState(false);

    const [showSellerSignup, setShowSellerSignup] =
        useState(false);

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

    // Display Settings without leaving the Profile page.
    if (showSettings) {
        return (
            <div className="profile-page">
                <Settings
                    onBack={() => setShowSettings(false)}
                />
            </div>
        );
    }

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

    return (
        <div className="profile-page">
            {/* MODE SWITCH FOR REAL OR DEMO SELLERS */}
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

            {/* PROFILE HEADER */}
            <div className="profile-header">
                <div className="profile-avatar">CM</div>

                <div className="profile-info">
                    <h2>Your Name</h2>
                    <p className="profile-username">
                        @username
                    </p>
                    <p>Student creator at Campus Makers</p>
                </div>
            </div>

            <button
                type="button"
                className="profile-edit-button"
                onClick={() => showDemoNotice("Edit Profile")}>
                Edit Profile
            </button>

            {/* SETTINGS BUTTON */}
            <button
                type="button"
                className="profile-edit-button"
                onClick={() => {
                    setNotice("");
                    setShowSettings(true);
                }}>
                ⚙ Settings
            </button>

            {/* BECOME A SELLER CALL TO ACTION */}
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
                            <h3>Your Active Listings</h3>

                            <span className="profile-count">
                                {sellerListings.length} items
                            </span>
                        </div>

                        <div className="profile-listings-grid">
                            {sellerListings.map((listing) => (
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
                                </article>
                            ))}
                        </div>
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
        </div>
    );
}

export default Profile;
