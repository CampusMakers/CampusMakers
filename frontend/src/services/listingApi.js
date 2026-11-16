import { authFetch } from "./authApi";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(
    /\/$/,
    ""
);

async function readResponse(response, fallback) {
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            payload?.error?.message ||
                payload?.message ||
                fallback
        );
    }

    return payload;
}

/**
 * Convert backend listing data into the format used by Seller Mode.
 */
export function toSellerListing(listing) {
    return {
        id: listing.id,
        name: listing.title,
        description: listing.description || "",
        category: listing.category?.name || "",
        categoryId: listing.category?.id ?? null,
        quantity: Number(listing.quantity),
        price: Number(listing.price),
        images: (listing.images || []).map(
            (image) => image.url
        ),
        status:
            listing.status === "active"
                ? "Active"
                : listing.status === "sold_out"
                  ? "Sold Out"
                  : "Inactive"
    };
}

// Load all listings belonging to the signed-in seller's store.
export async function getStoreListings(storeId) {
    const params = new URLSearchParams({
        storeId: String(storeId),
        status: "all"
    });

    const response = await authFetch(
        `${API_ORIGIN}/api/listings?${params}`
    );

    const payload = await readResponse(
        response,
        "Unable to load your listings."
    );

    return payload.data.map(toSellerListing);
}

// Create a listing using the existing backend endpoint.
export async function createListing(listingData) {
    const response = await authFetch(
        `${API_ORIGIN}/api/listings`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(listingData)
        }
    );

    const payload = await readResponse(
        response,
        "Unable to create listing."
    );

    return toSellerListing(payload.data);
}

// Update a listing owned by the signed-in seller.
export async function updateListing(listingId, listingData) {
    const response = await authFetch(
        `${API_ORIGIN}/api/listings/${listingId}`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(listingData)
        }
    );

    const payload = await readResponse(
        response,
        "Unable to update listing."
    );

    return toSellerListing(payload.data);
}

// Delete a listing using the existing backend endpoint.
export async function deleteListing(listingId) {
    const response = await authFetch(
        `${API_ORIGIN}/api/listings/${listingId}`,
        { method: "DELETE" }
    );

    await readResponse(response, "Unable to delete listing.");
}

/**
 * Upload a seller listing photo to private R2 storage
 * through our authenticated backend.
 */
export async function uploadListingPhoto(file) {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        throw new Error("Choose a JPG, PNG, or WebP image.");
    }

    if (file.size > 4 * 1024 * 1024) {
        throw new Error(
            "Listing photos must be 4 MB or smaller."
        );
    }

    const form = new FormData();
    form.append("file", file);

    const response = await authFetch(
        `${API_ORIGIN}/api/uploads/listing-photos`,
        {
            method: "POST",
            body: form
        }
    );

    const payload = await readResponse(
        response,
        "Unable to upload listing photo."
    );

    const url = payload?.data?.url;

    if (
        typeof url !== "string" ||
        !/^https?:\/\//.test(url) ||
        !new URL(url).pathname.startsWith(
            "/api/uploads/listing-photos/"
        )
    ) {
        throw new Error("Invalid listing photo URL returned.");
    }

    return url;
}

/**
 * Load listing categories and their IDs from the database.
 */
export async function getListingCategories() {
    const response = await fetch(
        `${API_ORIGIN}/api/categories`
    );

    const payload = await readResponse(
        response,
        "Unable to load listing categories."
    );

    if (!Array.isArray(payload?.data)) {
        throw new Error("Invalid listing categories response.");
    }

    return payload.data;
}

/**
 * Load published listings for Home and Explore.
 * Convert backend records into the existing product-card format.
 */
export async function getPublicListings() {
    const response = await fetch(
        `${API_ORIGIN}/api/listings?status=active&limit=100`,
        { cache: "no-store" }
    );

    const payload = await readResponse(
        response,
        "Unable to load published listings."
    );

    if (!Array.isArray(payload?.data)) {
        throw new Error("Invalid listings response.");
    }

    return payload.data.map((listing) => {
        const item = toSellerListing(listing);

        return {
            ...item,
            id: `listing-${item.id}`,
            image: item.images[0] || "",
            creator: `@${listing.store?.owner?.username || "maker"}`,
            type: "listing",
            caption: item.name,
            tags: [],
            layout: "portrait",
            tone: "peach",
            store: listing.store
        };
    });
}
