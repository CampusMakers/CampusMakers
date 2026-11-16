import { api } from "../services/api";
import { requestLogin } from "../services/loginFlow";
import { useState } from "react";
import {
    cartItemCount,
    cartTotal
} from "../services/cartModel.js";
import "./Cart.css";

const dollars = (amount) => `$${Number(amount).toFixed(2)}`;

export function CartPage({
    items,
    onQuantity,
    onRemove,
    onCheckout,
    onContinue
}) {
    const count = cartItemCount(items);
    const [notice, setNotice] = useState("");
    return (
        <section
            className="cart-page"
            aria-labelledby="cart-heading">
            <button
                type="button"
                className="cart-back"
                onClick={onContinue}>
                ← Continue exploring
            </button>
            <div className="cart-title-row">
                <h2 id="cart-heading">Your Cart</h2>
                <span className="cart-count-chip">
                    {count} {count === 1 ? "item" : "items"}
                </span>
            </div>
            <p className="cart-explainer">
                Items from different makers stay together here.
                Check out each product separately.
            </p>
            <p className="cart-demo-label">
                Cart contents are saved on this device. Items
                are reserved only when you place an order.
            </p>

            {items.length === 0 ? (
                <div className="cart-empty">
                    <span
                        aria-hidden="true"
                        className="cart-empty-icon">
                        🛒
                    </span>
                    <h3>Your cart is empty</h3>
                    <p>
                        Find something handmade that catches
                        your eye.
                    </p>
                    <button
                        type="button"
                        className="cart-primary"
                        onClick={onContinue}>
                        Browse listings
                    </button>
                </div>
            ) : (
                <>
                    <div className="cart-items">
                        {items.map((item) => (
                            <article
                                key={item.id}
                                className="cart-item">
                                <div className="cart-item-main">
                                    {item.image ? (
                                        <img
                                            className="cart-product-image"
                                            src={item.image}
                                            alt={item.name}
                                        />
                                    ) : (
                                        <div className="cart-product-image cart-placeholder">
                                            Photo
                                        </div>
                                    )}
                                    <div className="cart-product-info">
                                        <span className="cart-seller">
                                            {item.creator}
                                        </span>
                                        <h3>{item.name}</h3>
                                        <strong>
                                            {dollars(
                                                item.price
                                            )}{" "}
                                            each
                                        </strong>
                                    </div>
                                    <strong className="cart-line-total">
                                        {dollars(
                                            item.price *
                                                item.quantity
                                        )}
                                    </strong>
                                </div>
                                <div className="cart-item-actions">
                                    <div
                                        className="cart-stepper"
                                        aria-label={`Quantity of ${item.name}`}>
                                        <button
                                            type="button"
                                            aria-label={`Decrease ${item.name} quantity`}
                                            disabled={
                                                item.quantity <=
                                                1
                                            }
                                            onClick={() =>
                                                onQuantity(
                                                    item.id,
                                                    item.quantity -
                                                        1
                                                )
                                            }>
                                            −
                                        </button>
                                        <output aria-label="Quantity">
                                            {item.quantity}
                                        </output>
                                        <button
                                            type="button"
                                            aria-label={`Increase ${item.name} quantity`}
                                            disabled={
                                                item.quantity >=
                                                item.maxPerOrder
                                            }
                                            onClick={() =>
                                                onQuantity(
                                                    item.id,
                                                    item.quantity +
                                                        1
                                                )
                                            }>
                                            +
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        className="cart-checkout-button"
                                        onClick={() =>
                                            onCheckout(item.id)
                                        }>
                                        Checkout
                                    </button>
                                    <button
                                        type="button"
                                        className="cart-remove-button"
                                        onClick={() => {
                                            onRemove(item.id);
                                            setNotice(
                                                `${item.name} removed from your cart.`
                                            );
                                        }}>
                                        Remove
                                    </button>
                                </div>
                                <p className="cart-limit-text">
                                    Maximum {item.maxPerOrder}{" "}
                                    per order{" "}
                                </p>
                            </article>
                        ))}
                    </div>
                    {notice && (
                        <p
                            className="cart-status"
                            role="status">
                            {notice}
                        </p>
                    )}
                    <div className="cart-total-row">
                        <strong>Total ({count} items)</strong>
                        <strong>
                            {dollars(cartTotal(items))}
                        </strong>
                    </div>
                    <p className="cart-footnote">
                        This is your cart total, not a charge.
                        Prices and stock are checked at
                        checkout.
                    </p>
                </>
            )}
        </section>
    );
}

export function CheckoutPage({
    item,
    onBack,
    user,
    onPurchased
}) {
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [busy, setBusy] = useState(false),
        [error, setError] = useState(""),
        [order, setOrder] = useState(null);
    if (order)
        return (
            <section className="cart-page">
                <h2>Order placed</h2>
                <p>
                    {order.orderNumber} · {dollars(order.total)}
                </p>
                <p>
                    Payment is arranged with the seller. No
                    online payment has been charged.
                </p>
                <button
                    onClick={() => {
                        window.location.hash = "profile";
                    }}>
                    Go to profile
                </button>
            </section>
        );
    if (!item)
        return (
            <section className="cart-page">
                <h2>Item not found in cart</h2>
                <button onClick={onBack}>Back to cart</button>
            </section>
        );
    async function submit(event) {
        event.preventDefault();
        if (!user) return requestLogin("purchase", true);
        if (busy) return;
        const listingId = Number(
            String(item.id).replace(/^listing-/, "")
        );
        if (!Number.isSafeInteger(listingId) || listingId < 1) {
            setError("Sample listings cannot be purchased.");
            return;
        }
        setBusy(true);
        setError("");
        try {
            const result = await api("/orders", {
                method: "POST",
                body: JSON.stringify({
                    items: [
                        { listingId, quantity: item.quantity }
                    ],
                    paymentMethod
                })
            });
            setOrder(result);
            onPurchased?.();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }
    return (
        <section className="cart-page">
            <button className="cart-back" onClick={onBack}>
                ← Back to cart
            </button>
            <h2>Checkout — {item.name}</h2>
            <p>
                {item.quantity} × {dollars(item.price)} ·
                Estimated total{" "}
                {dollars(item.quantity * item.price)}
            </p>
            <p>
                The server confirms stock and the final price.
                Arrange pickup with the maker through Messages.
            </p>
            <form
                className="cart-pickup-form"
                onSubmit={submit}>
                <label htmlFor="payment">Payment method</label>
                <select
                    id="payment"
                    value={paymentMethod}
                    onChange={(e) =>
                        setPaymentMethod(e.target.value)
                    }>
                    {[
                        "cash",
                        "card",
                        "venmo",
                        "zelle",
                        "paypal",
                        "other"
                    ].map((value) => (
                        <option key={value} value={value}>
                            {value}
                        </option>
                    ))}
                </select>
                <p>No payment is collected online.</p>
                {error && <p role="alert">{error}</p>}
                <button
                    className="cart-primary"
                    disabled={busy}>
                    {busy ? "Placing order…" : "Place order"}
                </button>
            </form>
        </section>
    );
}
