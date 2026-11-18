import { useEffect, useState } from "react";
import { PostComposer } from "./SellerTools";
import SellerListingForm from "./SellerListingForm";
import { sellerSavedItems } from "./mockProfileData";
import { previewStore } from "../services/previewStore";
import "./Profile.css";
import "./SellerWorkspace.css";
import "./SellerDemo.css";

const demoUser = { id: "preview-user", username: "demo_maker", name: "Campus Maker Demo", email: "demo@example.invalid" };
const demoListings = sellerSavedItems.slice(0, 2).map((item, index) => ({
    ...item,
    id: `demo-${item.id}`,
    description: "Example handmade product for the seller studio preview.",
    status: "Active",
    category: index ? "Crochet & Textiles" : "Ceramics & Pottery",
    quantity: 5,
    maxPerOrder: 2,
    images: [item.image]
}));
const tabNames = ["Listings", "Posts", "Events"];

function readDemoListings() {
    try {
        const value = JSON.parse(window.sessionStorage.getItem("campus-makers-demo-listings") || "null");
        return Array.isArray(value) ? value : demoListings;
    } catch {
        return demoListings;
    }
}

export default function SellerDemo() {
    const [tab, setTab] = useState("Listings");
    const [listings, setListings] = useState(readDemoListings);
    const [posts, setPosts] = useState([]);
    const [listingForm, setListingForm] = useState(false);
    const [editingListing, setEditingListing] = useState(null);
    const [composerOpen, setComposerOpen] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [notice, setNotice] = useState("");

    useEffect(() => {
        try { window.sessionStorage.setItem("campus-makers-demo-listings", JSON.stringify(listings)); }
        catch { /* The preview still works in memory. */ }
    }, [listings]);

    useEffect(() => {
        let active = true;
        const reload = () => previewStore.from("maker_posts").select("*").eq("seller_id", demoUser.id)
            .then(({ data }) => { if (active) setPosts(data || []); });
        reload();
        window.addEventListener("campus-makers-preview", reload);
        return () => { active = false; window.removeEventListener("campus-makers-preview", reload); };
    }, []);

    const saveListing = data => {
        setListings(current => editingListing
            ? current.map(item => item.id === editingListing.id ? { ...item, ...data, id: item.id } : item)
            : [...current, { ...data, id: `demo-${crypto.randomUUID()}` }]
        );
        setListingForm(false);
        setEditingListing(null);
        setNotice("Listing saved in this browser-only demo.");
    };

    async function deletePost(post) {
        if (!window.confirm("Delete this demo post from this browser?")) return;
        const { error } = await previewStore.from("maker_posts").delete()
            .eq("id", post.id).eq("seller_id", demoUser.id);
        setNotice(error ? "Could not delete demo post." : "Demo post deleted locally.");
    }

    if (listingForm) return (
        <section className="seller-demo-page">
            <p className="seller-demo-banner">DEMO ONLY — no seller privileges or production data</p>
            <SellerListingForm key={editingListing?.id || "new-listing"} initialListing={editingListing} onSave={saveListing} onCancel={() => { setListingForm(false); setEditingListing(null); }} />
        </section>
    );

    if (composerOpen) return (
        <section className="seller-demo-page">
            <p className="seller-demo-banner">DEMO ONLY — posts and events are saved only in this browser</p>
            <PostComposer
                key={editingPost?.id || "new-post"}
                user={demoUser}
                listings={listings}
                initialPost={editingPost}
                promotablePosts={posts.filter(item => !item.is_event)}
                onCancel={() => { setComposerOpen(false); setEditingPost(null); }}
                onUpdated={() => { setComposerOpen(false); setEditingPost(null); setNotice("Demo content updated locally."); }}
                onPublished={() => { setComposerOpen(false); setEditingPost(null); setNotice("Demo content published locally. Events can also appear on Calendar."); }}
            />
        </section>
    );

    const shownPosts = posts.filter(post => Boolean(post.is_event) === (tab === "Events"));
    return (
        <section className="seller-demo-page">
            <button type="button" className="cart-back" onClick={() => { window.location.hash = "home"; }}>← Back to Home</button>
            <p className="seller-demo-banner">SELLER STUDIO PREVIEW — sample data, browser-only changes, no production access</p>
            <div className="seller-demo-header">
                <span className="seller-demo-avatar">CM</span>
                <div><h2>Campus Maker Demo</h2><p>@demo_maker · Seller Mode preview</p></div>
            </div>
            <p className="seller-demo-explainer">Explore the seller content tools from R03/R04 without signing in or changing anyone's real storefront. This does not verify an account.</p>
            <nav className="seller-demo-tabs" aria-label="Demo seller tabs">
                {tabNames.map(name => <button key={name} type="button" aria-current={tab === name ? "page" : undefined} onClick={() => { setTab(name); setNotice(""); }}>{name}</button>)}
            </nav>
            {notice && <p className="seller-demo-message" role="status">{notice}</p>}

            {tab === "Listings" ? (
                <div className="seller-demo-panel">
                    <div className="seller-demo-panel-title"><h3>Your listings</h3><button type="button" onClick={() => { setEditingListing(null); setListingForm(true); }}>+ Create listing</button></div>
                    {listings.length === 0 && <p>There are no demo listings yet.</p>}
                    {listings.map(item => (
                        <article className="seller-demo-card" key={item.id}>
                            {item.images?.[0] ? <img src={item.images[0]} alt={item.name} /> : <div className="seller-demo-placeholder">Photo</div>}
                            <div><strong>{item.name}</strong><p>${Number(item.price).toFixed(2)} · {item.status}</p><p>Stock {item.quantity} · Max/order {item.maxPerOrder}</p></div>
                            <div className="seller-demo-card-actions"><button type="button" onClick={() => { setEditingListing(item); setListingForm(true); }}>Edit</button><button type="button" onClick={() => { if (window.confirm("Delete this demo listing?")) setListings(current => current.filter(other => other.id !== item.id)); }}>Delete</button></div>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="seller-demo-panel">
                    <div className="seller-demo-panel-title"><h3>{tab === "Events" ? "Hosted events" : "Your posts"}</h3><button type="button" onClick={() => { setEditingPost(null); setComposerOpen(true); }}>+ Create {tab === "Events" ? "event" : "post"}</button></div>
                    <p className="seller-demo-helper">The shared composer lets you choose Post or Event. Posts are never sent to the server in this preview.</p>
                    {shownPosts.length === 0 && <p>No {tab.toLowerCase()} created yet. Try the create button.</p>}
                    {shownPosts.map(post => (
                        <article className="seller-demo-post" key={post.id}>
                            <strong>{post.is_event ? post.event_title : "Post"}</strong>
                            <p>{post.caption}</p>
                            {post.is_event && <p>{post.event_location} · {new Date(post.event_starts_at).toLocaleString()}</p>}
                            <div className="seller-demo-card-actions"><button type="button" onClick={() => { setEditingPost(post); setComposerOpen(true); }}>Edit</button><button type="button" onClick={() => deletePost(post)}>Delete</button></div>
                        </article>
                    ))}
                    {tab === "Events" && <button type="button" className="seller-demo-calendar" onClick={() => { window.location.hash = "calendar"; }}>View Calendar →</button>}
                </div>
            )}
        </section>
    );
}
