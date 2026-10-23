import { useState } from "react";

import {
    buyerPurchases,
    buyerAttendedEvents
} from "./mockBuyerPurchasesData";

import "./BuyerPurchases.css";

function BuyerPurchases({ onDemoAction }) {
    const [expandedOrder, setExpandedOrder] = useState(null);

    // Only completed orders belong in purchase history.
    const completedPurchases = buyerPurchases.filter(
        (purchase) => purchase.status === "Completed"
    );

    const toggleDetails = (id) => {
        setExpandedOrder((current) =>
            current === id ? null : id
        );
    };

    return (
        <div className="buyer-purchases-page">
            {/* COMPLETED PURCHASES */}
            <section className="buyer-purchases-panel">
                <div className="buyer-purchases-heading">
                    <h3>Purchase History</h3>

                    <span className="buyer-purchases-count">
                        {completedPurchases.length} completed
                    </span>
                </div>

                <p className="buyer-purchases-description">
                    Review your completed orders and support the
                    campus makers you purchased from.
                </p>

                <div className="buyer-purchases-list">
                    {completedPurchases.map((purchase) => (
                        <article
                            className="buyer-purchase-card"
                            key={purchase.id}>
                            {/* ORDER HEADER */}
                            <div className="buyer-purchase-order-header">
                                <span>
                                    Order #{purchase.id}
                                </span>

                                <span>
                                    {purchase.orderDate}
                                </span>
                            </div>

                            {/* PRODUCT INFORMATION */}
                            <div className="buyer-purchase-product">
                                {purchase.image ? (
                                    <img
                                        src={purchase.image}
                                        alt={
                                            purchase.productName
                                        }
                                        className="buyer-purchase-image"
                                    />
                                ) : (
                                    <div className="buyer-purchase-image buyer-purchase-placeholder">
                                        CM
                                    </div>
                                )}

                                <div className="buyer-purchase-product-info">
                                    <h4>
                                        {purchase.productName}
                                    </h4>

                                    <p>By {purchase.seller}</p>

                                    <strong>
                                        $
                                        {purchase.price.toFixed(
                                            2
                                        )}
                                    </strong>
                                </div>
                            </div>

                            {/* COMPLETED STATUS */}
                            <div className="buyer-purchase-status-row">
                                <span className="buyer-purchase-status buyer-purchase-status-complete">
                                    ✓ Completed
                                </span>

                                <span className="buyer-purchase-delivery">
                                    {purchase.delivery}
                                </span>
                            </div>

                            {/* VIEW DETAILS & LEAVE REVIEW */}
                            <div className="buyer-purchase-actions">
                                <button
                                    type="button"
                                    className="buyer-purchase-primary"
                                    aria-expanded={
                                        expandedOrder ===
                                        purchase.id
                                    }
                                    onClick={() =>
                                        toggleDetails(
                                            purchase.id
                                        )
                                    }>
                                    {expandedOrder ===
                                    purchase.id
                                        ? "Hide Details"
                                        : "View Details"}
                                </button>

                                <button
                                    type="button"
                                    className="buyer-purchase-secondary"
                                    onClick={() =>
                                        onDemoAction(
                                            `Leave a review for ${purchase.productName}`
                                        )
                                    }>
                                    Leave Review
                                </button>
                            </div>

                            {/* EXPANDABLE ORDER INFORMATION */}
                            {expandedOrder === purchase.id && (
                                <div className="buyer-purchase-expanded">
                                    <h5>Order Information</h5>

                                    <div>
                                        <span>
                                            Order Number
                                        </span>
                                        <strong>
                                            {purchase.id}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Seller</span>
                                        <strong>
                                            {purchase.seller}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Payment</span>
                                        <strong>
                                            {purchase.payment}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Fulfillment</span>
                                        <strong>
                                            {purchase.delivery}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Pickup Location
                                        </span>
                                        <strong>
                                            {
                                                purchase.pickupLocation
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Completed Pickup
                                        </span>
                                        <strong>
                                            {
                                                purchase.pickupTime
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Total Paid</span>
                                        <strong>
                                            $
                                            {purchase.price.toFixed(
                                                2
                                            )}
                                        </strong>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            onDemoAction(
                                                `View receipt for order ${purchase.id}`
                                            )
                                        }>
                                        View Receipt
                                    </button>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            </section>

            {/* PAST EVENT ATTENDANCE */}
            <section className="buyer-purchases-panel">
                <div className="buyer-purchases-heading">
                    <h3>Past Events</h3>

                    <span className="buyer-purchases-count">
                        {buyerAttendedEvents.length} attended
                    </span>
                </div>

                <div className="buyer-purchase-events">
                    {buyerAttendedEvents.map((event) => (
                        <article
                            className="buyer-purchase-event"
                            key={event.id}>
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
        </div>
    );
}

export default BuyerPurchases;
