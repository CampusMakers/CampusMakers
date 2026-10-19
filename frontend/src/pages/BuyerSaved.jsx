import "./BuyerSaved.css";

function BuyerSaved({
    savedItems,
    savedIds,
    onToggleSaved,
    onDemoAction
}) {
    return (
        <div className="buyer-saved-page">
            {/* SAVED PRODUCTS */}
            <section className="buyer-saved-panel">
                <div className="buyer-saved-heading">
                    <h3>Saved Items</h3>

                    <span className="buyer-saved-count">
                        {savedIds.length} saved
                    </span>
                </div>

                <p className="buyer-saved-description">
                    Your favorite handmade pieces from campus
                    creators.
                </p>

                <div className="buyer-saved-products-grid">
                    {savedItems.map((item) => {
                        const isSaved = savedIds.includes(
                            item.id
                        );

                        return (
                            <article
                                className={`buyer-saved-product ${
                                    !isSaved
                                        ? "buyer-saved-product-removed"
                                        : ""
                                }`}
                                key={item.id}>
                                <div className="buyer-saved-product-image-wrapper">
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="buyer-saved-product-image"
                                        />
                                    ) : (
                                        <div className="buyer-saved-product-placeholder">
                                            Product Image
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        className="buyer-saved-bookmark"
                                        aria-label={
                                            isSaved
                                                ? `Remove ${item.name} from saved items`
                                                : `Save ${item.name}`
                                        }
                                        aria-pressed={isSaved}
                                        onClick={() =>
                                            onToggleSaved(
                                                item.id
                                            )
                                        }>
                                        <svg
                                            viewBox="0 0 24 24"
                                            width="19"
                                            height="19"
                                            fill={
                                                isSaved
                                                    ? "currentColor"
                                                    : "none"
                                            }
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinejoin="round"
                                            aria-hidden="true">
                                            <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-5-7 5V4a1 1 0 0 1 1-1z" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="buyer-saved-product-info">
                                    <h4>{item.name}</h4>

                                    <p>{item.creator}</p>

                                    <strong>
                                        ${item.price.toFixed(2)}
                                    </strong>

                                    {!isSaved && (
                                        <span className="buyer-saved-unsaved">
                                            Unsaved — tap
                                            bookmark to restore
                                        </span>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>

                <button
                    type="button"
                    className="buyer-saved-discover"
                    onClick={() =>
                        onDemoAction("Discover more products")
                    }>
                    Explore More Products
                </button>
            </section>

            {/* SAVED ITEMS MESSAGE */}
            <div className="buyer-saved-tip">
                <strong>Your Saved Collection</strong>

                <p>
                    Bookmark handmade products you love so you
                    can easily find them again.
                </p>
            </div>
        </div>
    );
}

export default BuyerSaved;
