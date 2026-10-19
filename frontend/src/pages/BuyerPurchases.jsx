
import { useEffect, useRef, useState } from "react";

import {
    buyerPurchases,
    buyerAttendedEvents
} from "./mockBuyerPurchasesData";

import "./BuyerPurchases.css";

function BuyerPurchases({ onDemoAction }) {
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [pinPurchase, setPinPurchase] = useState(null);

    const closeButtonRef = useRef(null);

    useEffect(() => {
        if (!pinPurchase) return;

        closeButtonRef.current?.focus();

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setPinPurchase(null);
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [pinPurchase]);

    const toggleDetails = (id) => {
        setExpandedOrder((current) =>
            current === id ? null : id
        );
    };

    return (
        <div className="buyer-purchases-page">

            {/* PURCHASE HISTORY */}
            <section className="buyer-purchases-panel">
                <div className="buyer-purchases-heading">
                    <h3>Purchase History</h3>

                    <span className="buyer-purchases-count">
                        {buyerPurchases.length} orders
                    </span>
                </div>

                <p className="buyer-purchases-description">
                    Track your purchases from campus makers
                    and view your order details.
                </p>

                <div className="buyer-purchases-list">
                    {buyerPurchases.map((purchase) => (
                        <article
                            className="buyer-purchase-card"
                            key={purchase.id}
                        >
                            {/* ORDER HEADER */}
                            <div className="buyer-purchase-order-header">
                                <span>Order #{purchase.id}</span>
                                <span>{purchase.orderDate}</span>
                            </div>

                            {/* PRODUCT */}
                            <div className="buyer-purchase-product">
                                {purchase.image ? (
                                    <img
                                        src={purchase.image}
                                        alt={purchase.productName}
                                        className="buyer-purchase-image"
                                    />
                                ) : (
                                    <div className="buyer-purchase-image buyer-purchase-placeholder">
                                        CM
                                    </div>
                                )}

                                <div className="buyer-purchase-product-info">
                                    <h4>{purchase.productName}</h4>
                                    <p>By {purchase.seller}</p>

                                    <strong>
                                        ${purchase.price.toFixed(2)}
                                    </strong>
                                </div>
                            </div>

                            {/* STATUS */}
                            <div className="buyer-purchase-status-row">
                                <span
                                    className={`buyer-purchase-status ${
                                        purchase.status === "Completed"
                                            ? "buyer-purchase-status-complete"
                                            : purchase.status === "Ready for Pickup"
                                            ? "buyer-purchase-status-ready"
                                            : "buyer-purchase-status-scheduled"
                                    }`}
                                >
                                    {purchase.status}
                                </span>

                                <span className="buyer-purchase-delivery">
                                    {purchase.delivery}
                                </span>
                            </div>

                            {/* ACTIONS */}
                            <div className="buyer-purchase-actions">
                                <button
                                    type="button"
                                    className="buyer-purchase-primary"
                                    aria-expanded={
                                        expandedOrder === purchase.id
                                    }
                                    onClick={() =>
                                        toggleDetails(purchase.id)
                                    }
                                >
                                    {expandedOrder === purchase.id
                                        ? "Hide Details"
                                        : "View Details"}
                                </button>

                                {purchase.status === "Ready for Pickup" ? (
                                    <button
                                        type="button"
                                        className="buyer-purchase-secondary"
                                        onClick={() =>
                                            setPinPurchase(purchase)
                                        }
                                    >
                                        View Pickup PIN
                                    </button>
                                ) : purchase.status === "Completed" ? (
                                    <button
                                        type="button"
                                        className="buyer-purchase-secondary"
                                        onClick={() =>
                                            onDemoAction(
                                                `Leave a review for ${purchase.productName}`
                                            )
                                        }
                                    >
                                        Leave Review
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="buyer-purchase-secondary"
                                        onClick={() =>
                                            onDemoAction(
                                                `Message seller ${purchase.seller}`
                                            )
                                        }
                                    >
                                        Contact Seller
                                    </button>
                                )}
                            </div>

                            {/* EXPANDABLE ORDER DETAILS */}
                            {expandedOrder === purchase.id && (
                                <div
                                    className="buyer-purchase-expanded"
                                    id={`purchase-details-${purchase.id}`}
                                >
                                    <h5>Order Information</h5>

                                    <div>
                                        <span>Payment</span>
                                        <strong>{purchase.payment}</strong>
                                    </div>

                                    <div>
                                        <span>Fulfillment</span>
                                        <strong>{purchase.delivery}</strong>
                                    </div>

                                    <div>
                                        <span>Pickup Location</span>
                                        <strong>
                                            {purchase.pickupLocation}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Pickup Date & Time</span>
                                        <strong>
                                            {purchase.pickupTime}
                                        </strong>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            onDemoAction(
                                                `View receipt for order ${purchase.id}`
                                            )
                                        }
                                    >
                                        View Receipt
                                    </button>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            </section>

            {/* PAST EVENTS */}
            <section className="buyer-purchases-panel">
                <div className="buyer-purchases-heading">
                    <h3>Event Attendance</h3>

                    <span className="buyer-purchases-count">
                        {buyerAttendedEvents.length} events
                    </span>
                </div>

                <div className="buyer-purchase-events">
                    {buyerAttendedEvents.map((event) => (
                        <article
                            className="buyer-purchase-event"
                            key={event.id}
                        >
                            <div className="buyer-purchase-event-icon">
                                ✓
                            </div>

                            <div className="buyer-purchase-event-info">
                                <h4>{event.title}</h4>
                                <p>{event.date}</p>
                                <p>{event.location}</p>
                            </div>

                            <span className="buyer-purchase-attended">
                                {event.status}
                            </span>
                        </article>
                    ))}
                </div>
            </section>

            {/* PICKUP PIN MODAL */}
            {pinPurchase && (
                <div
                    className="buyer-pin-backdrop"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setPinPurchase(null);
                        }
                    }}
                >
                    <div
                        className="buyer-pin-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="buyer-pin-title"
                    >
                        <button
                            type="button"
                            ref={closeButtonRef}
                            className="buyer-pin-close"
                            aria-label="Close pickup PIN"
                            onClick={() =>
                                setPinPurchase(null)
                            }
                        >
                            ×
                        </button>

                        <div className="buyer-pin-icon">
                            ✓
                        </div>

                        <h3 id="buyer-pin-title">
                            Your Pickup PIN
                        </h3>

                        <p className="buyer-pin-description">
                            Sample pickup code for
                            your {pinPurchase.productName}.
                        </p>

                        <div className="buyer-pin-code">
                            {pinPurchase.samplePin}
                        </div>

                        <p className="buyer-pin-order">
                            Order #{pinPurchase.id}
                        </p>

                        <div className="buyer-pin-instructions">
                            <strong>Demo Only</strong>

                            <p>
                                This is a sample PIN for the
                                frontend design. It cannot verify
                                or complete a real pickup.
                                Secure PIN verification must
                                happen on the backend.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="buyer-pin-done"
                            onClick={() =>
                                setPinPurchase(null)
                            }
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BuyerPurchases;
