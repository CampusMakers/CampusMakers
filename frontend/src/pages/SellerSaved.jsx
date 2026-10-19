import "./SellerSaved.css";

function SellerSaved({
    savedItems,
    savedIds,
    onToggleSaved,
    onDemoAction
}) {
    return (
        <div className="seller-saved-page">
            <section className="seller-saved-section">
                <div className="seller-saved-heading">
                    <h3>Saved Inspiration</h3>

                    <span className="seller-saved-count">
                        {savedIds.length} items
                    </span>
                </div>

                <p className="seller-saved-description">
                    Handmade pieces and inspiration from fellow
                    campus creators.
                </p>

                <div className="seller-saved-grid">
                    {savedItems.map((item) => {
                        const isSaved = savedIds.includes(
                            item.id
                        );

                        return (
                            <article
                                className={`seller-saved-item ${
                                    !isSaved
                                        ? "seller-saved-item--removed"
                                        : ""
                                }`}
                                key={item.id}>
                                <div className="seller-saved-image-wrapper">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="seller-saved-image"
                                    />

                                    <span className="seller-saved-price">
                                        ${item.price.toFixed(2)}
                                    </span>

                                    <button
                                        type="button"
                                        className="seller-saved-bookmark"
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

                                    <div className="seller-saved-overlay">
                                        <h4>{item.name}</h4>
                                        <p>{item.creator}</p>
                                    </div>
                                </div>

                                {!isSaved && (
                                    <div className="seller-saved-removed-label">
                                        Removed — tap bookmark
                                        to save again
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="seller-saved-moodboard">
                <div className="seller-saved-moodboard-icon">
                    ✦
                </div>

                <div className="seller-saved-moodboard-text">
                    <h4>Artisan Moodboard</h4>

                    <p>
                        Organize your saved campus pieces into
                        inspiration collections.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        onDemoAction(
                            "Organize saved inspiration"
                        )
                    }>
                    Organize
                </button>
            </section>
        </div>
    );
}

export default SellerSaved;
