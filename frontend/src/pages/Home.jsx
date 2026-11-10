import { useAuth } from "../auth/useAuth";
import { useState } from "react";
import { sellerSavedItems } from "./mockProfileData";
import { PostCard } from "./Explore Page/Explore";
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

export default function Home({
    posts,
    onOpenPost,
    onOpenSeller
}) {
    const { user } = useAuth();
    const [showAllProducts, setShowAllProducts] =
        useState(false);
    const [showAllPosts, setShowAllPosts] = useState(false);
    const visibleProducts = showAllProducts
        ? sellerSavedItems
        : sellerSavedItems.slice(0, 2);
    const visiblePosts = showAllPosts
        ? posts
        : posts.slice(0, 4);
    return (
        <div className="home-page">
            <section
                className="home-intro"
                aria-labelledby="home-title">
                <h2 id="home-title">
                    {user ? <>Welcome back, <span>@{user.username || user.email.split("@")[0]}</span></> : "Welcome"}
                </h2>
                <p>
                    Find your next favorite creation and the
                    makers behind it.
                </p>
            </section>
            <section
                className="home-panel"
                aria-labelledby="home-products-heading">
                <div className="home-panel-heading">
                    <h2 id="home-products-heading">
                        Product listings
                    </h2>
                    <span className="home-count">
                        {sellerSavedItems.length} items
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
                        ? "Show fewer listings"
                        : "See all listings"}
                    <span aria-hidden="true">
                        {showAllProducts ? "−" : "+"}
                    </span>
                </button>
            </section>
            <section
                className="home-panel"
                aria-labelledby="home-creators-heading">
                <div className="home-panel-heading">
                    <h2 id="home-creators-heading">
                        Suggested creators
                    </h2>
                    <span className="home-count">
                        {
                            new Set(
                                posts.map(
                                    (post) => post.creator
                                )
                            ).size
                        }{" "}
                        makers
                    </span>
                </div>
                <p className="home-section-note">
                    A peek at what your campus is making. Open a
                    post to see more.
                </p>
                <div
                    className="home-suggestions"
                    id="home-posts">
                    {visiblePosts.map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            onOpenPost={onOpenPost}
                            onOpenSeller={onOpenSeller}
                        />
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
                        ? "Show fewer creators"
                        : "See all creators"}
                    <span aria-hidden="true">
                        {showAllPosts ? "−" : "+"}
                    </span>
                </button>
            </section>
            <section
                className="home-panel home-login-prompt"
                aria-labelledby="home-updates-heading">
                <div className="home-panel-heading">
                    <h2 id="home-updates-heading">
                        {user ? "Follow a creator to see updates" : "Your creator updates"}
                    </h2>
                </div>
                <p>
                    {user ? "Follow a creator to see their updates here." : "Log in or create an account to follow your favorite creators and see their updates here."}
                </p>
                <a className="home-login-link" href={user ? "#explore" : "#login"}>
                    {user ? "Explore creators" : "Log in / Create an account"}{" "}
                    <span aria-hidden="true">→</span>
                </a>
            </section>
        </div>
    );
}
