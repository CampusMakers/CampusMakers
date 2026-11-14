import { useRef, useState } from "react";
import "./SellerListingForm.css";

const MAX_PHOTOS = 8;
const MAX_PHOTO_SIZE = 4 * 1024 * 1024;

const CATEGORIES = [
    "Ceramics & Pottery",
    "Jewelry",
    "Art & Prints",
    "Clothing",
    "Accessories",
    "Home Decor",
    "Crochet & Textiles",
    "Stationery",
    "Other Handmade Goods"
];
const CONDITIONS = ["New", "Like New", "Good", "Fair"];

function readPhoto(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Unable to read the photo."));
        reader.readAsDataURL(file);
    });
}

function initialPhotoList(listing) {
    return (listing?.images || [])
        .filter((src) => typeof src === "string" && src.length > 0)
        .map((src) => ({ id: crypto.randomUUID(), src }));
}

export default function SellerListingForm({
    initialListing = null,
    onSave,
    onCancel
}) {
    const isEditing = Boolean(initialListing);
    const fileInputRef = useRef(null);

    const [name, setName] = useState(initialListing?.name || "");
    const [description, setDescription] = useState(initialListing?.description || "");
    const [category, setCategory] = useState(initialListing?.category || "");
    const [condition, setCondition] = useState(initialListing?.condition || "New");
    const [color, setColor] = useState(initialListing?.color || "");
    const [quantity, setQuantity] = useState(String(initialListing?.quantity ?? 1));
    const [tags, setTags] = useState(
        Array.isArray(initialListing?.tags) ? initialListing.tags.join(", ") : ""
    );
    const [price, setPrice] = useState(
        initialListing?.price != null && initialListing.price !== 0
            ? String(initialListing.price)
            : ""
    );
    const [pickupLocation, setPickupLocation] = useState(
        initialListing?.pickupLocation || ""
    );

    const [photos, setPhotos] = useState(() => initialPhotoList(initialListing));
    const [coverId, setCoverId] = useState(() => photos[0]?.id ?? null);
    const [processingPhotos, setProcessingPhotos] = useState(false);
    const [error, setError] = useState("");

    const handlePhotos = async (event) => {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        if (!files.length || processingPhotos) return;

        if (photos.length + files.length > MAX_PHOTOS) {
            setError(`You can upload up to ${MAX_PHOTOS} photos.`);
            return;
        }

        if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
            setError("Only JPG, PNG, and WebP photos are supported.");
            return;
        }

        if (files.some((file) => file.size > MAX_PHOTO_SIZE)) {
            setError("Each photo must be 4 MB or smaller.");
            return;
        }

        setError("");
        setProcessingPhotos(true);
        try {
            const added = await Promise.all(
                files.map(async (file) => ({
                    id: crypto.randomUUID(),
                    src: await readPhoto(file)
                }))
            );
            setPhotos((current) => [...current, ...added]);
            setCoverId((current) => current ?? added[0]?.id ?? null);
        } catch {
            setError("The selected photos could not be opened. Please try again.");
        } finally {
            setProcessingPhotos(false);
        }
    };

    const removePhoto = (id) => {
        const remaining = photos.filter((photo) => photo.id !== id);
        setPhotos(remaining);
        if (coverId === id) setCoverId(remaining[0]?.id ?? null);
    };

    const handleSubmit = (status) => {
        setError("");
        const title = name.trim();
        const enteredPrice = price.trim();
        const amount = Number(enteredPrice);
        const count = Number(quantity);
        const parsedTags = [
            ...new Set(
                tags.split(",")
                    .map((tag) => tag.trim().replace(/^#/, ""))
                    .filter(Boolean)
            )
        ];

        if (status === "Active" && !title) {
            setError("Enter a product name before publishing.");
            return;
        }

        // New published listings need a photo, description, and category.
        // Existing sample listings can still be edited without adding missing mock fields.
        if (status === "Active" && !isEditing) {
            if (photos.length === 0) {
                setError("Add at least one product photo before publishing.");
                return;
            }
            if (!description.trim()) {
                setError("Describe your item before publishing.");
                return;
            }
            if (!category) {
                setError("Select a category before publishing.");
                return;
            }
        }

        if (status === "Active" && !enteredPrice) {
            setError("Enter a price before publishing.");
            return;
        }
        if (enteredPrice && (!/^\d+(\.\d{1,2})?$/.test(enteredPrice) || amount <= 0)) {
            setError("Enter a valid price above $0, with up to two decimal places.");
            return;
        }
        if (!Number.isInteger(count) || count < 1) {
            setError("Quantity must be a whole number of at least 1.");
            return;
        }
        if (parsedTags.length > 5) {
            setError("Use five tags or fewer, separated by commas.");
            return;
        }

        const orderedPhotos = [
            ...photos.filter((photo) => photo.id === coverId),
            ...photos.filter((photo) => photo.id !== coverId)
        ];

        // The parent handles local state now; the backend team can later
        // replace the save handler with its create/update API calls.
        onSave({
            name: title || "Untitled draft",
            description: description.trim(),
            category,
            condition,
            color: color.trim(),
            quantity: count,
            tags: parsedTags,
            price: enteredPrice ? amount : 0,
            pickupLocation: pickupLocation.trim(),
            status,
            images: orderedPhotos.map((photo) => photo.src)
        });
    };

    return (
        <div className="seller-listing-page">
            <header className="seller-listing-page-header">
                <button type="button" className="seller-listing-back" onClick={onCancel}>
                    ← Back to Listings
                </button>
                <div className="seller-listing-title">
                    <span>SELLER STUDIO</span>
                    <h2>{isEditing ? "Edit Listing" : "List an Item"}</h2>
                    <p>
                        {isEditing
                            ? "Update the details of your Campus Makers listing."
                            : "Share something you've made with your campus community."}
                    </p>
                </div>
            </header>

            <section className="seller-listing-section">
                <div className="seller-listing-section-header">
                    <h3>Photos</h3>
                    <span>{photos.length}/{MAX_PHOTOS}</span>
                </div>
                <p className="seller-listing-helper">
                    Add up to 8 photos. Choose the one buyers will see first.
                </p>
                <input
                    ref={fileInputRef}
                    className="seller-listing-file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={processingPhotos}
                    onChange={handlePhotos}
                    aria-label="Upload product photos"
                />
                <div className="seller-listing-photo-grid">
                    {photos.map((photo, index) => (
                        <div className="seller-listing-photo-card" key={photo.id}>
                            <img src={photo.src} alt={`Listing photo ${index + 1}`} />
                            {coverId === photo.id && (
                                <span className="seller-listing-cover-label">Cover</span>
                            )}
                            <div className="seller-listing-photo-actions">
                                {coverId !== photo.id && (
                                    <button type="button" onClick={() => setCoverId(photo.id)}>
                                        Set Cover
                                    </button>
                                )}
                                <button
                                    type="button"
                                    aria-label={`Remove photo ${index + 1}`}
                                    onClick={() => removePhoto(photo.id)}>
                                    ×
                                </button>
                            </div>
                        </div>
                    ))}
                    {photos.length < MAX_PHOTOS && (
                        <button
                            type="button"
                            className="seller-listing-add-photo"
                            disabled={processingPhotos}
                            onClick={() => fileInputRef.current?.click()}>
                            <span className="seller-listing-camera">+</span>
                            <span>{processingPhotos ? "Preparing..." : "Add a photo"}</span>
                        </button>
                    )}
                    {Array.from({
                        length: MAX_PHOTOS - photos.length - (photos.length < MAX_PHOTOS ? 1 : 0)
                    }).map((_, index) => (
                        <div className="seller-listing-empty-photo" key={`empty-${index}`}>
                            Photo
                        </div>
                    ))}
                </div>
                <p className="seller-listing-helper">JPG, PNG, or WebP. Up to 4 MB each.</p>
            </section>

            <section className="seller-listing-section">
                <h3>Description</h3>
                <label htmlFor="seller-product-name">Product Name</label>
                <input
                    id="seller-product-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Handmade Ceramic Mug"
                    maxLength={100}
                />
                <label htmlFor="seller-product-description">Describe your item</label>
                <textarea
                    id="seller-product-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Share the materials, size, and details that make this special..."
                    rows={5}
                    maxLength={1000}
                />
                <div className="seller-listing-character-count">{description.length}/1000</div>
            </section>

            <section className="seller-listing-section">
                <h3>Item Information</h3>
                <div className="seller-listing-field-grid">
                    <div>
                        <label htmlFor="seller-category">Category</label>
                        <select id="seller-category" value={category} onChange={(event) => setCategory(event.target.value)}>
                            <option value="">Select category</option>
                            {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="seller-condition">Condition</label>
                        <select id="seller-condition" value={condition} onChange={(event) => setCondition(event.target.value)}>
                            {CONDITIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="seller-color">Color</label>
                        <input id="seller-color" value={color} onChange={(event) => setColor(event.target.value)} placeholder="e.g. Cream" />
                    </div>
                    <div>
                        <label htmlFor="seller-quantity">Quantity</label>
                        <input id="seller-quantity" type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                    </div>
                </div>
                <label htmlFor="seller-tags">Tags</label>
                <input id="seller-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="ceramics, handmade, pottery" />
                <p className="seller-listing-helper">Up to five comma-separated tags.</p>
            </section>

            <section className="seller-listing-section">
                <h3>Pricing</h3>
                <label htmlFor="seller-price">Item Price</label>
                <div className="seller-listing-price-input">
                    <span>$</span>
                    <input id="seller-price" type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" />
                </div>
            </section>

            <section className="seller-listing-section">
                <h3>Campus Pickup</h3>
                <label htmlFor="seller-pickup">Preferred Meetup Location</label>
                <input
                    id="seller-pickup"
                    value={pickupLocation}
                    onChange={(event) => setPickupLocation(event.target.value)}
                    placeholder="e.g. Kennedy Library Entrance"
                    maxLength={150}
                />
                <p className="seller-listing-helper">Buyers can finalize meetup details through Messages.</p>
            </section>

            {error && <p className="seller-listing-error" role="alert">{error}</p>}

            <div className="seller-listing-bottom-actions">
                <button type="button" className="seller-listing-draft-button" disabled={processingPhotos} onClick={() => handleSubmit("Draft")}>
                    Save as Draft
                </button>
                <button type="button" className="seller-listing-publish-button" disabled={processingPhotos} onClick={() => handleSubmit("Active")}>
                    {isEditing ? "Save & Publish" : "Post Listing"}
                </button>
            </div>
            <p className="seller-listing-demo-note">
                Preview only: listing changes reset when the page reloads.
            </p>
        </div>
    );
}
