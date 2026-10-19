import { useState } from "react";

import ListingGallery from "./ListingGallery";
import SellerSaved from "./SellerSaved";
import BuyerPickups from "./BuyerPickups";
import BuyerPurchases from "./BuyerPurchases";
import BuyerSaved from "./BuyerSaved";

import {
    sellerListings,
    sellerAppointments,
    sellerEvents,
    sellerSavedItems
} from "./mockProfileData";

import "./Profile.css";

function Profile() {
    const [mode, setMode] = useState("seller");
    const [activeTab, setActiveTab] = useState("Listings");
    const [notice, setNotice] = useState("");

    // Saved items are shared between buyer and seller modes.
    const [savedIds, setSavedIds] = useState(() =>
        sellerSavedItems.map((item) => item.id)
    );

    const tabs =
        mode === "seller"
            ? ["Listings", "Appointments", "Saved"]
            : ["Pickups", "Purchases", "Saved"];

    const changeMode = (newMode) => {
        setMode(newMode);

        setActiveTab(
            newMode === "seller" ? "Listings" : "Pickups"
        );

        setNotice("");
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

    return (
        <div className="profile-page">
            {/* BUYER / SELLER MODE SWITCH */}
            <div className="profile-mode-switch">
                <button
                    type="button"
                    aria-pressed={mode === "seller"}
                    onClick={() => changeMode("seller")}>
                    Seller Mode
                </button>

                <button
                    type="button"
                    aria-pressed={mode === "buyer"}
                    onClick={() => changeMode("buyer")}>
                    Buyer Mode
                </button>
            </div>

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

            {/* DEMO ACTION MESSAGE */}
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

            {/* PROFILE NAVIGATION */}
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
            {mode === "seller" && activeTab === "Listings" && (
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
                                    productName={listing.name}
                                />

                                <h4>{listing.name}</h4>

                                <p>
                                    ${listing.price.toFixed(2)}
                                </p>

                                <span>{listing.status}</span>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {/* SELLER: APPOINTMENTS */}
            {mode === "seller" &&
                activeTab === "Appointments" && (
                    <div className="profile-content-stack">
                        <section className="profile-panel">
                            <div className="profile-panel-heading">
                                <h3>Your Appointments</h3>

                                <span className="profile-count">
                                    {sellerAppointments.length}{" "}
                                    active
                                </span>
                            </div>

                            <div className="profile-card-stack">
                                {sellerAppointments.map(
                                    (appointment) => (
                                        <article
                                            className="profile-appointment-card"
                                            key={
                                                appointment.id
                                            }>
                                            <div className="profile-appointment-top">
                                                {appointment.image ? (
                                                    <img
                                                        className="profile-appointment-photo"
                                                        src={
                                                            appointment.image
                                                        }
                                                        alt={
                                                            appointment.title
                                                        }
                                                    />
                                                ) : (
                                                    <div className="profile-appointment-photo profile-photo-placeholder">
                                                        CM
                                                    </div>
                                                )}

                                                <div className="profile-appointment-details">
                                                    <h4>
                                                        {
                                                            appointment.title
                                                        }
                                                    </h4>

                                                    <p>
                                                        Buyer:{" "}
                                                        <strong>
                                                            {
                                                                appointment.buyer
                                                            }
                                                        </strong>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="profile-appointment-meta">
                                                <p>
                                                    <strong>
                                                        When:
                                                    </strong>{" "}
                                                    {
                                                        appointment.date
                                                    }
                                                </p>

                                                <p>
                                                    <strong>
                                                        Where:
                                                    </strong>{" "}
                                                    {
                                                        appointment.location
                                                    }
                                                </p>
                                            </div>

                                            <div className="profile-appointment-payment">
                                                <span>
                                                    {
                                                        appointment.payment
                                                    }
                                                </span>

                                                <strong>
                                                    $
                                                    {appointment.price.toFixed(
                                                        2
                                                    )}
                                                </strong>
                                            </div>

                                            <span
                                                className={`profile-status ${
                                                    appointment.status ===
                                                    "Confirmed"
                                                        ? "profile-status-confirmed"
                                                        : "profile-status-pending"
                                                }`}>
                                                {
                                                    appointment.status
                                                }
                                            </span>

                                            <div className="profile-appointment-actions">
                                                <button
                                                    type="button"
                                                    className="profile-action-button profile-action-primary"
                                                    onClick={() =>
                                                        showDemoNotice(
                                                            appointment.primaryAction
                                                        )
                                                    }>
                                                    {
                                                        appointment.primaryAction
                                                    }
                                                </button>

                                                <button
                                                    type="button"
                                                    className="profile-action-button"
                                                    onClick={() =>
                                                        showDemoNotice(
                                                            appointment.secondaryAction
                                                        )
                                                    }>
                                                    {
                                                        appointment.secondaryAction
                                                    }
                                                </button>
                                            </div>
                                        </article>
                                    )
                                )}
                            </div>
                        </section>

                        {/* UPCOMING SELLER EVENTS */}
                        <section className="profile-panel">
                            <div className="profile-panel-heading">
                                <h3>
                                    Upcoming Events & Pop-ups
                                </h3>

                                <span className="profile-count">
                                    {sellerEvents.length} events
                                </span>
                            </div>

                            <div className="profile-card-stack">
                                {sellerEvents.map((event) => (
                                    <article
                                        className="profile-event-card"
                                        key={event.id}>
                                        <div className="profile-event-main">
                                            <div className="profile-event-date">
                                                <span>
                                                    {
                                                        event.month
                                                    }
                                                </span>
                                                <strong>
                                                    {event.day}
                                                </strong>
                                            </div>

                                            <div className="profile-event-details">
                                                <h4>
                                                    {
                                                        event.title
                                                    }
                                                </h4>

                                                <p>
                                                    {event.date}
                                                </p>
                                                <p>
                                                    {
                                                        event.location
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        <div className="profile-event-footer">
                                            <span className="profile-event-role">
                                                {event.role}
                                            </span>

                                            <p>
                                                {
                                                    event.description
                                                }
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            className="profile-action-button profile-event-button"
                                            onClick={() =>
                                                showDemoNotice(
                                                    event.action
                                                )
                                            }>
                                            {event.action}
                                        </button>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <div className="profile-tip">
                            <strong>Campus Hand-off Tip</strong>

                            <p>
                                Meet buyers at recognizable
                                campus locations and confirm the
                                hand-off before marking an order
                                complete.
                            </p>
                        </div>
                    </div>
                )}

            {/* SELLER: SAVED */}
            {mode === "seller" && activeTab === "Saved" && (
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
