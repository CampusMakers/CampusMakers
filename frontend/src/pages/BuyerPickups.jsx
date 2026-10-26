import { useEffect, useRef, useState } from "react";

import {
    buyerPickups,
    buyerUpcomingEvents
} from "./mockBuyerPickupsData";

import "./BuyerPickups.css";

function BuyerPickups({ onDemoAction }) {
    const [expandedPickup, setExpandedPickup] = useState(null);
    const [pinPickup, setPinPickup] = useState(null);
    const closeButtonRef = useRef(null);

    // Only active orders belong in Pickups.
    const activePickups = buyerPickups.filter(
        (pickup) =>
            pickup.status !== "Completed" &&
            pickup.status !== "Cancelled"
    );

    const toggleDetails = (id) => {
        setExpandedPickup((current) =>
            current === id ? null : id
        );
    };

    // Handle keyboard access for the PIN popup.
    useEffect(() => {
        if (!pinPickup) return;

        const previousFocus = document.activeElement;

        closeButtonRef.current?.focus();

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setPinPickup(null);
            }

            if (event.key === "Tab") {
                const modal = closeButtonRef.current?.closest(
                    ".buyer-pickup-pin-modal"
                );

                const controls = Array.from(
                    modal?.querySelectorAll(
                        "button:not([disabled])"
                    ) || []
                );

                if (controls.length === 0) return;

                const first = controls[0];
                const last = controls[controls.length - 1];

                if (
                    event.shiftKey &&
                    document.activeElement === first
                ) {
                    event.preventDefault();
                    last.focus();
                } else if (
                    !event.shiftKey &&
                    document.activeElement === last
                ) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );

            previousFocus?.focus?.();
        };
    }, [pinPickup]);

    return (
        <div className="buyer-pickups-page">
            {/* ACTIVE PICKUPS */}
            <section className="buyer-pickups-panel">
                <div className="buyer-pickups-heading">
                    <h3>Active Pickups</h3>

                    <span className="buyer-pickups-count">
                        {activePickups.length} active
                    </span>
                </div>

                <p className="buyer-pickups-intro">
                    Track orders that are being prepared,
                    scheduled, or ready to collect.
                </p>

                <div className="buyer-pickups-list">
                    {activePickups.map((pickup) => (
                        <article
                            className="buyer-pickup-card"
                            key={pickup.id}>
                            {/* PRODUCT */}
                            <div className="buyer-pickup-product">
                                {pickup.image ? (
                                    <img
                                        src={pickup.image}
                                        alt={pickup.productName}
                                        className="buyer-pickup-image"
                                    />
                                ) : (
                                    <div className="buyer-pickup-image buyer-pickup-placeholder">
                                        CM
                                    </div>
                                )}

                                <div className="buyer-pickup-product-info">
                                    <h4>
                                        {pickup.productName}
                                    </h4>
                                    <p>
                                        Sold by {pickup.seller}
                                    </p>

                                    <strong>
                                        $
                                        {pickup.price.toFixed(
                                            2
                                        )}
                                    </strong>
                                </div>
                            </div>

                            {/* STATUS */}
                            <div className="buyer-pickup-status-row">
                                <span
                                    className={`buyer-pickup-status ${
                                        pickup.status ===
                                        "Ready for Pickup"
                                            ? "buyer-pickup-ready"
                                            : "buyer-pickup-scheduled"
                                    }`}>
                                    {pickup.status}
                                </span>

                                <span className="buyer-pickup-order">
                                    #{pickup.orderNumber}
                                </span>
                            </div>

                            {/* DATE, TIME, LOCATION */}
                            <div className="buyer-pickup-details">
                                <div className="buyer-pickup-detail">
                                    <span className="buyer-pickup-detail-icon">
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            aria-hidden="true">
                                            <rect
                                                x="3"
                                                y="5"
                                                width="18"
                                                height="16"
                                                rx="2"
                                            />
                                            <path d="M7 3v4M17 3v4M3 10h18" />
                                        </svg>
                                    </span>

                                    <div>
                                        <span className="buyer-pickup-label">
                                            Pickup Date
                                        </span>
                                        <p>{pickup.date}</p>
                                    </div>
                                </div>

                                <div className="buyer-pickup-detail">
                                    <span className="buyer-pickup-detail-icon">
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            aria-hidden="true">
                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="9"
                                            />
                                            <path d="M12 7v5l3 2" />
                                        </svg>
                                    </span>

                                    <div>
                                        <span className="buyer-pickup-label">
                                            Pickup Time
                                        </span>
                                        <p>{pickup.time}</p>
                                    </div>
                                </div>

                                <div className="buyer-pickup-detail">
                                    <span className="buyer-pickup-detail-icon">
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            aria-hidden="true">
                                            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                                            <circle
                                                cx="12"
                                                cy="10"
                                                r="2.5"
                                            />
                                        </svg>
                                    </span>

                                    <div>
                                        <span className="buyer-pickup-label">
                                            Meeting Location
                                        </span>
                                        <p>{pickup.location}</p>
                                    </div>
                                </div>
                            </div>

                            {/* ACTIONS */}
                            <div className="buyer-pickup-actions">
                                <button
                                    type="button"
                                    className="buyer-pickup-primary"
                                    aria-expanded={
                                        expandedPickup ===
                                        pickup.id
                                    }
                                    onClick={() =>
                                        toggleDetails(pickup.id)
                                    }>
                                    {expandedPickup ===
                                    pickup.id
                                        ? "Hide Details"
                                        : "View Details"}
                                </button>

                                <button
                                    type="button"
                                    className="buyer-pickup-secondary"
                                    onClick={() =>
                                        onDemoAction(
                                            `Message seller ${pickup.seller}`
                                        )
                                    }>
                                    Message Seller
                                </button>
                            </div>

                            {/* EXPANDABLE ORDER DETAILS */}
                            {expandedPickup === pickup.id && (
                                <div className="buyer-pickup-expanded">
                                    <h5>Order Details</h5>

                                    <div>
                                        <span>
                                            Order Number
                                        </span>
                                        <strong>
                                            {pickup.orderNumber}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Seller</span>
                                        <strong>
                                            {pickup.seller}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Payment Method
                                        </span>
                                        <strong>
                                            {pickup.payment}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Order Total</span>
                                        <strong>
                                            $
                                            {pickup.price.toFixed(
                                                2
                                            )}
                                        </strong>
                                    </div>
                                </div>
                            )}

                            {/* PIN ONLY FOR READY PICKUPS */}
                            {pickup.status ===
                                "Ready for Pickup" &&
                                pickup.samplePin && (
                                    <button
                                        type="button"
                                        className="buyer-pickup-pin-trigger"
                                        onClick={() =>
                                            setPinPickup(pickup)
                                        }>
                                        View Pickup PIN
                                    </button>
                                )}
                        </article>
                    ))}
                </div>
            </section>

            {/* UPCOMING EVENTS */}
            <section className="buyer-pickups-panel">
                <div className="buyer-pickups-heading">
                    <h3>Upcoming Campus Events</h3>

                    <span className="buyer-pickups-count">
                        {buyerUpcomingEvents.length} events
                    </span>
                </div>

                <div className="buyer-events-list">
                    {buyerUpcomingEvents.map((event) => (
                        <article
                            className="buyer-event-card"
                            key={event.id}>
                            <div className="buyer-event-top">
                                <div className="buyer-event-date">
                                    <span>{event.month}</span>
                                    <strong>{event.day}</strong>
                                </div>

                                <div className="buyer-event-info">
                                    <h4>{event.title}</h4>
                                    <p>{event.date}</p>
                                    <p>{event.time}</p>
                                    <p>{event.location}</p>
                                </div>
                            </div>

                            <p className="buyer-event-description">
                                {event.description}
                            </p>

                            <div className="buyer-event-bottom">
                                <span className="buyer-event-status">
                                    {event.status}
                                </span>

                                <button
                                    type="button"
                                    onClick={() =>
                                        onDemoAction(
                                            `View event ${event.title}`
                                        )
                                    }>
                                    View Event
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            {/* CAMPUS PICKUP TIP */}
            <div className="buyer-pickup-tip">
                <strong>Campus Pickup Tip</strong>

                <p>
                    Meet sellers in public campus spaces and
                    confirm the correct item before completing
                    your pickup.
                </p>
            </div>

            {/* PICKUP PIN POPUP */}
            {pinPickup && (
                <div
                    className="buyer-pickup-pin-backdrop"
                    onClick={(event) => {
                        if (
                            event.target === event.currentTarget
                        ) {
                            setPinPickup(null);
                        }
                    }}>
                    <div
                        className="buyer-pickup-pin-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pickup-pin-heading">
                        <button
                            type="button"
                            ref={closeButtonRef}
                            className="buyer-pickup-pin-close"
                            aria-label="Close pickup PIN"
                            onClick={() => setPinPickup(null)}>
                            ×
                        </button>

                        <div className="buyer-pickup-pin-icon">
                            ✓
                        </div>

                        <h3 id="pickup-pin-heading">
                            Your Pickup PIN
                        </h3>

                        <p>{pinPickup.productName}</p>

                        <div className="buyer-pickup-pin-code">
                            {pinPickup.samplePin}
                        </div>

                        <p className="buyer-pickup-pin-order">
                            Order #{pinPickup.orderNumber}
                        </p>

                        <div className="buyer-pickup-pin-note">
                            <strong>Demo Only</strong>
                            <p>
                                This sample code cannot verify
                                or complete a real pickup.
                                Secure verification will be
                                handled by the backend.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="buyer-pickup-pin-done"
                            onClick={() => setPinPickup(null)}>
                            Got It
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BuyerPickups;
