import { useState } from "react";
import { sellerSavedItems } from "./mockProfileData";
import "./Home.css";

function ProductCard({ product }) {
    const [imageFailed, setImageFailed] = useState(false);
    return (
        <article className="home-product-card">
            {imageFailed ? (
                <div className="home-product-placeholder">
                    Product image
                </div>
            ) : (
                <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    onError={() => setImageFailed(true)}
                />
            )}
            <div className="home-product-info">
                <p>{product.creator}</p>
                <h3>{product.name}</h3>
                <span>${product.price.toFixed(2)}</span>
            </div>
        </article>
    );
}

export default function Home({ posts }) {
    const [feed, setFeed] = useState("For you");
    const [showAllProducts, setShowAllProducts] =
        useState(false);
    const [showAllPosts, setShowAllPosts] = useState(false);
    const visibleProducts = showAllProducts
        ? sellerSavedItems
        : sellerSavedItems.slice(0, 2);
    const visiblePosts = showAllPosts
        ? posts
        : posts.slice(0, 2);

    return (
        <div className="home-page">
            <section
                className="home-intro"
                aria-labelledby="home-title">
                <p className="home-eyebrow">
                    Your campus community
                </p>
                <h2 id="home-title">Made here. Found here.</h2>
                <p>
                    Discover little things made with a lot of
                    heart.
                </p>
            </section>

            <div
                className="home-feed-switch"
                aria-label="Choose home feed">
                {["For you", "Creator updates"].map((item) => (
                    <button
                        key={item}
                        type="button"
                        aria-pressed={feed === item}
                        onClick={() => setFeed(item)}>
                        {item}
                    </button>
                ))}
            </div>

            {feed === "For you" && (
                <section
                    className="home-panel"
                    aria-labelledby="home-products-heading">
                    <div className="home-panel-heading">
                        <h2 id="home-products-heading">
                            Discover handmade
                        </h2>
                        <span className="home-count">
                            {sellerSavedItems.length} finds
                        </span>
                    </div>
                    <div
                        className="home-product-grid"
                        id="home-products">
                        {visibleProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                            />
                        ))}
                    </div>
                    <button
                        className="home-more"
                        type="button"
                        aria-expanded={showAllProducts}
                        aria-controls="home-products"
                        onClick={() =>
                            setShowAllProducts(!showAllProducts)
                        }>
                        {showAllProducts
                            ? "Show fewer finds"
                            : "See all finds"}
                        <span aria-hidden="true">
                            {showAllProducts ? "−" : "+"}
                        </span>
                    </button>
                </section>
            )}

            <section
                className="home-panel"
                aria-labelledby="home-creators-heading">
                <div className="home-panel-heading">
                    <h2 id="home-creators-heading">
                        From your creators
                    </h2>
                    <span className="home-count">
                        {posts.length} updates
                    </span>
                </div>
                <div
                    className="home-post-stack"
                    id="home-posts">
                    {visiblePosts.map((post) => (
                        <a
                            className="home-post-card"
                            key={post.id}
                            href={`#explore/${post.id}`}>
                            <div className="home-post-author">
                                <span
                                    className="home-creator-avatar"
                                    aria-hidden="true">
                                    {post.creator
                                        .slice(1, 3)
                                        .toUpperCase()}
                                </span>
                                <span>
                                    {post.creator}
                                    <small>{post.tag}</small>
                                </span>
                                <span
                                    className="home-post-arrow"
                                    aria-hidden="true">
                                    ↗
                                </span>
                            </div>
                            <p>{post.caption}</p>
                            <span className="home-post-link">
                                View post{" "}
                                <span aria-hidden="true">
                                    →
                                </span>
                            </span>
                        </a>
                    ))}
                </div>
                <button
                    className="home-more"
                    type="button"
                    aria-expanded={showAllPosts}
                    aria-controls="home-posts"
                    onClick={() =>
                        setShowAllPosts(!showAllPosts)
                    }>
                    {showAllPosts
                        ? "Show fewer updates"
                        : "See all updates"}
                    <span aria-hidden="true">
                        {showAllPosts ? "−" : "+"}
                    </span>
                </button>
            </section>

            {feed === "For you" && (
                <section
                    className="home-community"
                    aria-labelledby="home-community-heading">
                    <div
                        className="home-avatar-stack"
                        aria-hidden="true">
                        {sellerSavedItems
                            .slice(0, 3)
                            .map((item) => (
                                <span key={item.id}>
                                    {item.creator
                                        .slice(1, 3)
                                        .toUpperCase()}
                                </span>
                            ))}
                    </div>
                    <h2 id="home-community-heading">
                        Meet your next favorite maker
                    </h2>
                    <p>
                        A campus full of creativity, just around
                        the corner.
                    </p>
                    <a href="#explore">
                        Explore the community{" "}
                        <span aria-hidden="true">→</span>
                    </a>
                </section>
            )}
        </div>
    );
}
