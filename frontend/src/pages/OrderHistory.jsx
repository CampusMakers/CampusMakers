import { useEffect, useState } from "react";
import { api } from "../services/api";
import "./BuyerPurchases.css";
export default function OrderHistory({ active = false }) {
    const [orders, setOrders] = useState([]),
        [error, setError] = useState(""),
        [loading, setLoading] = useState(true);
    useEffect(() => {
        let live = true;
        api(
            `/orders?role=buyer&state=${active ? "active" : "all"}&limit=100`
        )
            .then((data) => {
                if (live) setOrders(data);
            })
            .catch((e) => {
                if (live) setError(e.message);
            })
            .finally(() => {
                if (live) setLoading(false);
            });
        return () => {
            live = false;
        };
    }, [active]);
    return (
        <section className="buyer-purchases-page profile-order-panel">
            <div className="profile-section-heading">
                <h3>
                    {active
                        ? "Active orders and pickups"
                        : "Your orders"}
                </h3>
                <span className="profile-count">
                    {loading ? "…" : orders.length} orders
                </span>
            </div>
            <p className="profile-section-description">
                {active
                    ? "Keep track of your upcoming pickups and connect with your maker."
                    : "Your campus finds, order details, and makers in one place."}
            </p>
            {loading && <p role="status">Loading orders…</p>}
            {error && <p role="alert">{error}</p>}
            {!loading && !error && !orders.length && (
                <p>No orders yet.</p>
            )}
            {orders.map((order) => (
                <article
                    className="buyer-purchase-card"
                    key={order.id}>
                    <h4>
                        {order.orderNumber}
                        <span className="profile-order-status">
                            {order.status.replaceAll("_", " ")}
                        </span>
                    </h4>
                    <p>
                        {order.store?.name} · $
                        {Number(order.total).toFixed(2)}
                    </p>
                    {order.items.map((item) => (
                        <p key={item.id}>
                            {item.quantity} × {item.title}
                        </p>
                    ))}
                    {order.pickupAt && (
                        <p>
                            Pickup:{" "}
                            {new Date(
                                order.pickupAt
                            ).toLocaleString()}
                        </p>
                    )}
                    {order.pickupLocation && (
                        <p>{order.pickupLocation.name}</p>
                    )}
                    {order.pickupPin && (
                        <p>
                            Pickup PIN:{" "}
                            <strong>{order.pickupPin}</strong>
                        </p>
                    )}
                    {order.store?.owner?.username && (
                        <button
                            type="button"
                            className="profile-section-button"
                            onClick={() => {
                                window.location.hash = `profile/messages/${encodeURIComponent(order.store.owner.username)}`;
                            }}>
                            Message maker
                        </button>
                    )}
                </article>
            ))}
        </section>
    );
}
