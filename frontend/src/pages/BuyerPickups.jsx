import {
    buyerPickups,
    buyerUpcomingEvents
} from "./mockBuyerPickupsData";

import "./BuyerPickups.css";

function BuyerPickups({ onDemoAction }) {
    return (
        <div className="buyer-pickups-page">
            {/* UPCOMING PICKUPS */}
            <section className="buyer-pickups-panel">
                <div className="buyer-pickups-heading">
                    <h3>Upcoming Pickups</h3>

                    <span className="buyer-pickups-count">
                        {buyerPickups.length} scheduled
                    </span>
                </div>

                <p className="buyer-pickups-intro">
                    Your handmade orders are waiting for you!
                    Check your pickup details below.
                </p>

                <div className="buyer-pickups-list">
                    {buyerPickups.map((pickup) => (
                        <article
                            className="buyer-pickup-card"
                            key={pickup.id}>
                            {/* PRODUCT INFORMATION */}
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

                            {/* ORDER STATUS */}
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

                            {/* PICKUP DETAILS */}
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

                            {/* PAYMENT */}
                            <div className="buyer-pickup-payment">
                                <span>Payment Method</span>
                                <strong>
                                    {pickup.payment}
                                </strong>
                            </div>

                            {/* ACTION BUTTONS */}
                            <div className="buyer-pickup-actions">
                                <button
                                    type="button"
                                    className="buyer-pickup-primary"
                                    onClick={() =>
                                        onDemoAction(
                                            `View pickup details for ${pickup.productName}`
                                        )
                                    }>
                                    View Details
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
                        </article>
                    ))}
                </div>
            </section>

            {/* UPCOMING CAMPUS EVENTS */}
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

            {/* CAMPUS SAFETY TIP */}
            <div className="buyer-pickup-tip">
                <strong>Campus Pickup Tip</strong>
                <p>
                    Always meet sellers in public campus spaces
                    and confirm the correct item before
                    completing your pickup.
                </p>
            </div>
        </div>
    );
}

export default BuyerPickups;
