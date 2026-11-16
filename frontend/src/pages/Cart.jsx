import { useState } from "react";
import { cartItemCount, cartTotal } from "../services/cartModel.js";
import "./Cart.css";

const dollars = amount => `$${Number(amount).toFixed(2)}`;

export function CartPage({ items, onQuantity, onRemove, onCheckout, onContinue }) {
    const count = cartItemCount(items);
    const [notice, setNotice] = useState("");
    return (
        <section className="cart-page" aria-labelledby="cart-heading">
            <button type="button" className="cart-back" onClick={onContinue}>← Continue exploring</button>
            <div className="cart-title-row">
                <h2 id="cart-heading">Your Cart</h2>
                <span className="cart-count-chip">{count} {count === 1 ? "item" : "items"}</span>
            </div>
            <p className="cart-explainer">Items from different makers stay together here. Check out each product separately.</p>
            <p className="cart-demo-label">Browser preview only — cart contents are saved on this device. No orders have been placed.</p>

            {items.length === 0 ? (
                <div className="cart-empty">
                    <span aria-hidden="true" className="cart-empty-icon">🛒</span>
                    <h3>Your cart is empty</h3>
                    <p>Find something handmade that catches your eye.</p>
                    <button type="button" className="cart-primary" onClick={onContinue}>Browse listings</button>
                </div>
            ) : (
                <>
                    <div className="cart-items">
                        {items.map(item => (
                            <article key={item.id} className="cart-item">
                                <div className="cart-item-main">
                                    {item.image ? <img className="cart-product-image" src={item.image} alt={item.name} /> : <div className="cart-product-image cart-placeholder">Photo</div>}
                                    <div className="cart-product-info">
                                        <span className="cart-seller">{item.creator}</span>
                                        <h3>{item.name}</h3>
                                        <strong>{dollars(item.price)} each</strong>
                                    </div>
                                    <strong className="cart-line-total">{dollars(item.price * item.quantity)}</strong>
                                </div>
                                <div className="cart-item-actions">
                                    <div className="cart-stepper" aria-label={`Quantity of ${item.name}`}>
                                        <button type="button" aria-label={`Decrease ${item.name} quantity`} disabled={item.quantity <= 1} onClick={() => onQuantity(item.id, item.quantity - 1)}>−</button>
                                        <output aria-label="Quantity">{item.quantity}</output>
                                        <button type="button" aria-label={`Increase ${item.name} quantity`} disabled={item.quantity >= item.maxPerOrder} onClick={() => onQuantity(item.id, item.quantity + 1)}>+</button>
                                    </div>
                                    <button type="button" className="cart-checkout-button" onClick={() => onCheckout(item.id)}>Checkout</button>
                                    <button type="button" className="cart-remove-button" onClick={() => { onRemove(item.id); setNotice(`${item.name} removed from your cart.`); }}>Remove</button>
                                </div>
                                <p className="cart-limit-text">Maximum {item.maxPerOrder} per order (preview inventory)</p>
                            </article>
                        ))}
                    </div>
                    {notice && <p className="cart-status" role="status">{notice}</p>}
                    <div className="cart-total-row"><strong>Total ({count} items)</strong><strong>{dollars(cartTotal(items))}</strong></div>
                    <p className="cart-footnote">This is your cart total, not a charge. Prices and stock must be checked by the server before purchase.</p>
                </>
            )}
        </section>
    );
}

export function CheckoutPage({ item, onBack }) {
    const [pickupLocation, setPickupLocation] = useState("");
    const [pickupDate, setPickupDate] = useState("");
    const [notes, setNotes] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [showPreview, setShowPreview] = useState(false);
    if (!item) return (
        <section className="cart-page cart-empty">
            <h2>Item not found in cart</h2>
            <button type="button" className="cart-primary" onClick={onBack}>Back to cart</button>
        </section>
    );
    const total = item.price * item.quantity;
    const now = new Date();
    const earliest = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    return (
        <section className="cart-page" aria-labelledby="checkout-heading">
            <button type="button" className="cart-back" onClick={onBack}>← Back to Cart</button>
            <h2 id="checkout-heading">Checkout — {item.name}</h2>
            <p className="cart-explainer">Only this product is included. Your other cart items stay in the cart.</p>
            <p className="cart-demo-label">Checkout preview — ordering and payments are not connected. No purchase will be submitted.</p>
            <div className="cart-checkout-summary">
                <h3>Order summary</h3>
                <div className="cart-item-main">
                    {item.image ? <img className="cart-product-image" src={item.image} alt={item.name} /> : <div className="cart-product-image cart-placeholder">Photo</div>}
                    <div className="cart-product-info"><strong>{item.name}</strong><span className="cart-seller">{item.creator}</span><span>Quantity: {item.quantity}</span></div>
                </div>
                <div className="cart-total-row"><strong>Estimated total</strong><strong>{dollars(total)}</strong></div>
            </div>
            <form className="cart-pickup-form" onSubmit={event => { event.preventDefault(); setShowPreview(true); }}>
                <h3>Pickup details</h3>
                <label htmlFor="cart-pickup-location">Preferred pickup location</label>
                <input id="cart-pickup-location" placeholder="e.g. University Union entrance" value={pickupLocation} maxLength={120} onChange={event => { setPickupLocation(event.target.value); setShowPreview(false); }} required />
                <label htmlFor="cart-pickup-date">Preferred pickup date</label>
                <input id="cart-pickup-date" type="date" min={earliest} value={pickupDate} onChange={event => { setPickupDate(event.target.value); setShowPreview(false); }} required />
                <label htmlFor="cart-payment-method">Preferred payment method</label>
                <select id="cart-payment-method" value={paymentMethod} onChange={event => { setPaymentMethod(event.target.value); setShowPreview(false); }}>
                    <option value="cash">Cash at pickup</option>
                    <option value="venmo">Venmo (arrange with seller)</option>
                    <option value="card">Card (subject to seller availability)</option>
                    <option value="other">Other (arrange with seller)</option>
                </select>
                <label htmlFor="cart-pickup-notes">Notes for the seller (optional)</label>
                <textarea id="cart-pickup-notes" rows={3} maxLength={500} placeholder="Preferred time or meetup details" value={notes} onChange={event => { setNotes(event.target.value); setShowPreview(false); }} />
                <button className="cart-primary" type="submit">Preview order details</button>
            </form>
            {showPreview && (
                <div className="cart-preview-result" role="status">
                    <h3>Ready to review — not placed</h3>
                    <p>{item.quantity} × {item.name} · {dollars(total)}</p>
                    <p>Preferred pickup: {pickupLocation} on {pickupDate}</p>
                    <p>Preferred payment: {paymentMethod} (not charged)</p>
                    {notes && <p>Notes: {notes}</p>}
                    <p>Real checkout will become available after we verify listing IDs, stock and the Orders API.</p>
                    <button type="button" className="cart-secondary" onClick={onBack}>Return to cart</button>
                </div>
            )}
            <p className="cart-footnote">Nothing has been purchased. The real backend must validate the product, inventory, seller, price, payment method, and pickup details.</p>
        </section>
    );
}
