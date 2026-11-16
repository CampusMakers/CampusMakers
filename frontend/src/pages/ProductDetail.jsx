import { useState } from "react";
import { PostCard } from "./Explore Page/Explore";
import { getQuantityLimit, getSuggestedProducts } from "../services/productListing";
import { useProductRating } from "../services/useProductRating";
import PostComments from "./PostComments";
import "./ProductDetail.css";

const emptyActivity = { liked: false, comments: [] };

function readActivity(key) {
    try {
        const saved = JSON.parse(window.localStorage.getItem(key));
        return {
            liked: saved?.liked === true,
            comments: Array.isArray(saved?.comments) ? saved.comments.filter(item => typeof item.id === "string" && typeof item.text === "string") : []
        };
    } catch {
        return emptyActivity;
    }
}

export default function ProductDetail({ product, products = [], user, viewerId, backLabel, onBack, onOpenProduct, onOpenSeller, onOpenTag, onMessageUser, onAddToCart, onViewCart }) {
    const storageKey = `campus-makers-product-activity:${product.id}`;
    const [activity, setActivity] = useState(() => readActivity(storageKey));
    const [commentCount, setCommentCount] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [cartNotice, setCartNotice] = useState("");
    const [storageError, setStorageError] = useState(false);
    const [draftRating, setDraftRating] = useState(null);
    const [editingRating, setEditingRating] = useState(false);
    const [ratingNotice, setRatingNotice] = useState("");
    const rating = useProductRating(product.id, viewerId);
    const selectedRating = draftRating ?? rating.ownRating ?? 0;
    const quantityLimit = getQuantityLimit(product);
    const selectedQuantity = quantityLimit ? Math.min(quantity, quantityLimit) : 0;
    const suggestions = getSuggestedProducts(product, products);
    const suggestionColumns = [[], []];
    suggestions.forEach((item, index) => suggestionColumns[index % 2].push(item));
    const image = product.image || product.images?.[0];

    const updateActivity = (next) => {
        setActivity(next);
        try {
            const saved = JSON.parse(window.localStorage.getItem(storageKey)) || {};
            window.localStorage.setItem(storageKey, JSON.stringify({ ...saved, ...next }));
            setStorageError(false);
        } catch {
            setStorageError(true);
        }
    };

    return (
        <section className="explore-post-page product-detail-page">
            <button type="button" className="explore-back" onClick={onBack}>← {backLabel}</button>
            <article className="explore-post-detail">
                <button type="button" className="explore-creator-link product-creator" onClick={() => onOpenSeller(product.creator)}>
                    <span className="explore-avatar" aria-hidden="true">{product.creator.replace(/^@/, "").slice(0, 2).toUpperCase()}</span>
                    <span className="explore-creator">{product.creator}</span>
                </button>
                <div className={`explore-visual ${product.tone || "peach"}`}>
                    {image ? <img className="seller-post-photo" src={image} alt={product.name} /> : <span className="explore-placeholder-label">Product photo</span>}
                </div>
                <div className="explore-detail-body">
                    <h2 className="product-detail-name">{product.name}</h2>
                    <p className="product-detail-description">{product.description || "No details provided yet."}</p>
                    {(product.category || product.condition || product.color || product.pickupLocation) && <dl className="product-detail-specs">
                        {product.category && <><dt>Category</dt><dd>{product.category}</dd></>}
                        {product.condition && <><dt>Condition</dt><dd>{product.condition}</dd></>}
                        {product.color && <><dt>Color</dt><dd>{product.color}</dd></>}
                        {product.pickupLocation && <><dt>Pickup</dt><dd>{product.pickupLocation}</dd></>}
                    </dl>}
                    <div className="product-price-rating">
                        <p className="product-detail-price">${Number(product.price || 0).toFixed(2)}</p>
                        <div className="product-rating-summary" aria-live="polite">
                            {rating.loading ? <strong>Loading ratings…</strong> : rating.loadError ? <strong>Ratings unavailable</strong> : <>
                                <strong><span aria-hidden="true">★</span> {rating.count ? `${Number(rating.average).toFixed(1)} / 5` : "No ratings yet"}</strong>
                                <span>{rating.count} {rating.count === 1 ? "rating" : "ratings"}</span>
                            </>}
                        </div>
                    </div>
                    {product.availability && <p className="event-listing-label">{{ event: "Available at event", preorder: "Available for preorder", both: "At event and for preorder" }[product.availability]}</p>}
                    {!!product.tags?.length && <div className="explore-tag-list">{product.tags.map(tag => <button type="button" className="explore-tag" key={tag} onClick={() => onOpenTag(tag)}>#{tag}</button>)}</div>}

                    <fieldset className="product-rating">
                        <legend>Your rating</legend>
                        {rating.ownRating && !editingRating ? <>
                            <p className="product-rating-submitted">{rating.ownRating} out of 5 stars</p>
                            <button className="product-rating-action" type="button" onClick={() => { setDraftRating(rating.ownRating); setEditingRating(true); setRatingNotice(""); }}>Change rating</button>
                        </> : <>
                            <div className="product-rating-stars" role="radiogroup" aria-label="Rate this product">
                                {[1, 2, 3, 4, 5].map(star => <label key={star} className={star <= selectedRating ? "selected" : ""}>
                                    <input type="radio" name="product-rating" value={star} checked={selectedRating === star} onChange={() => { setDraftRating(star); setRatingNotice(""); }} />
                                    <span aria-hidden="true">{star <= selectedRating ? "★" : "☆"}</span>
                                    <span className="product-rating-sr-only">{star} {star === 1 ? "star" : "stars"}</span>
                                </label>)}
                            </div>
                            <span>{selectedRating ? `${selectedRating} out of 5` : "Choose 1 to 5 stars"}</span>
                            <div className="product-rating-actions">
                                <button className="product-rating-action" type="button" disabled={!selectedRating || rating.loading || rating.busy} onClick={async () => {
                                    if (!viewerId) { setRatingNotice("Sign in to submit a rating."); return; }
                                    if (await rating.submitRating(selectedRating)) { setDraftRating(null); setEditingRating(false); setRatingNotice("Rating submitted."); }
                                }}>{rating.busy ? "Saving…" : rating.ownRating ? "Update rating" : "Submit rating"}</button>
                                {editingRating && <button className="product-rating-cancel" type="button" disabled={rating.busy} onClick={() => { setDraftRating(null); setEditingRating(false); setRatingNotice(""); }}>Cancel</button>}
                            </div>
                        </>}
                        {ratingNotice && <p className="product-rating-notice" role="status">{ratingNotice}</p>}
                        {(rating.loadError || rating.error) && <p className="product-rating-error" role="alert">{rating.error || rating.loadError}</p>}
                    </fieldset>
                    <div className="explore-engagement">
                        <button type="button" aria-pressed={activity.liked} aria-label={activity.liked ? "Unlike product" : "Like product"} onClick={() => updateActivity({ ...activity, liked: !activity.liked })}>
                            <span className="explore-heart">{activity.liked ? "♥" : "♡"}</span> {activity.liked ? "Liked" : "Like"}
                        </button>
                        <span>{commentCount} {commentCount === 1 ? "comment" : "comments"}</span>
                    </div>
                    <div className="product-purchase">
                        <label htmlFor="product-quantity">Quantity</label>
                        <div className="product-purchase-controls">
                            <select id="product-quantity" value={selectedQuantity} disabled={quantityLimit === 0} onChange={event => setQuantity(Number(event.target.value))}>
                                {quantityLimit === 0 ? <option value="0">0</option> : Array.from({ length: quantityLimit }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
                            </select>
                            <button type="button" disabled={quantityLimit === 0} onClick={() => {
                                const added = onAddToCart?.(product, selectedQuantity) || 0;
                                setCartNotice(added ? `Added ${added} ${added === 1 ? "item" : "items"} to your cart.` : "Could not add this quantity. Check the stock limit or browser storage.");
                            }}>Add to cart</button>
                        </div>
                        {quantityLimit === 0 && <p>Out of stock</p>}
                        {cartNotice && <div className="product-cart-notice" role="status"><p>{cartNotice}</p><button type="button" onClick={onViewCart}>View Cart →</button></div>}
                    </div>
                    <PostComments post={product} user={user} canReply={Boolean(user?.sellerVerified)} onOpenSeller={onOpenSeller} onMessageUser={onMessageUser} onCountChange={setCommentCount} productStorageKey={storageKey} />
                    {storageError && <p className="explore-comment-error" role="alert">Like could not be saved on this device.</p>}
                </div>
            </article>
            <section className="explore-suggestions" aria-label="Suggested products">
                <div className="explore-suggestions-heading">
                    <h2>Suggested products</h2>
                    <span>{suggestions.length} {suggestions.length === 1 ? "product" : "products"}</span>
                </div>
                {suggestions.length ? <div className="explore-two-column-grid">
                    {suggestionColumns.map((column, index) => <div className="explore-two-column" key={index}>
                        {column.map(item => <PostCard key={item.id} post={item} onOpenPost={onOpenProduct} onOpenSeller={onOpenSeller} />)}
                    </div>)}
                </div> : <div className="explore-empty">No other products to suggest yet.</div>}
            </section>
        </section>
    );
}
