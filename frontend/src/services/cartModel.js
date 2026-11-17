import { getQuantityLimit } from "./productListing.js";

const CART_PREFIX = "campus-makers-cart-preview:v1:";
const MAX_CART_LINES = 50;

export function cartStorageKey(owner) {
    return `${CART_PREFIX}${encodeURIComponent(String(owner || "guest"))}`;
}

// Cart data is a browser-only preview. No payment or private user data is stored.
export function normalizeCartItem(product) {
    if (!product || !String(product.id ?? "").trim()) return null;
    const price = Number(product.price);
    const limit = getQuantityLimit(product);
    if (!Number.isFinite(price) || price <= 0 || limit < 1) return null;
    const image = product.image || product.images?.[0] || "";
    return {
        id: String(product.id),
        name: String(product.name || product.title || "Product").slice(0, 120),
        creator: String(product.creator || product.store?.name || "Campus maker").slice(0, 80),
        image: typeof image === "string" && image.length <= 2048 ? image : "",
        price: Math.round(price * 100) / 100,
        quantity: 1,
        maxPerOrder: limit,
        // No inventory authority is implied by this locally cached number.
        stockLimit: limit,
        sellerId: product.seller_id || product.store?.owner?.id || null
    };
}

export function cleanCart(items) {
    if (!Array.isArray(items)) return [];
    const result = [];
    const seen = new Set();
    for (const item of items.slice(0, MAX_CART_LINES)) {
        const clean = normalizeCartItem({
            ...item,
            quantity: item?.stockLimit ?? item?.maxPerOrder,
            maxPerOrder: item?.maxPerOrder
        });
        if (!clean || seen.has(clean.id)) continue;
        clean.stockLimit = Math.max(1, Math.min(1000, Number(item.stockLimit) || clean.maxPerOrder));
        clean.maxPerOrder = Math.min(clean.maxPerOrder, clean.stockLimit);
        clean.quantity = Math.min(clean.maxPerOrder, Math.max(1, Math.floor(Number(item.quantity) || 1)));
        seen.add(clean.id);
        result.push(clean);
    }
    return result;
}

export function addCartItem(items, product, count = 1) {
    const next = cleanCart(items);
    const candidate = normalizeCartItem(product);
    if (!candidate || !Number.isInteger(count) || count < 1) {
        return { items: next, added: 0 };
    }
    const index = next.findIndex(item => item.id === candidate.id);
    if (index < 0 && next.length >= MAX_CART_LINES) return { items: next, added: 0 };
    const currentCount = index < 0 ? 0 : next[index].quantity;
    const cap = index < 0 ? candidate.maxPerOrder : Math.min(next[index].maxPerOrder, candidate.maxPerOrder);
    const added = Math.max(0, Math.min(count, cap - currentCount));
    if (!added) return { items: next, added: 0 };
    if (index < 0) next.push({ ...candidate, quantity: added });
    else next[index] = { ...next[index], maxPerOrder: cap, quantity: currentCount + added };
    return { items: next, added };
}

export function changeCartQuantity(items, id, quantity) {
    return cleanCart(items).map(item => item.id !== String(id) ? item : {
        ...item,
        quantity: Math.max(1, Math.min(item.maxPerOrder, Math.floor(Number(quantity) || 1)))
    });
}

export function removeCartItem(items, id) {
    return cleanCart(items).filter(item => item.id !== String(id));
}

export function cartItemCount(items) {
    return cleanCart(items).reduce((total, item) => total + item.quantity, 0);
}

export function cartTotal(items) {
    return cleanCart(items).reduce((cents, item) => cents + Math.round(item.price * 100) * item.quantity, 0) / 100;
}

export function readCart(owner) {
    try {
        return cleanCart(JSON.parse(window.localStorage.getItem(cartStorageKey(owner)) || "[]"));
    } catch {
        return [];
    }
}

export function writeCart(owner, items) {
    const cleaned = cleanCart(items);
    try {
        window.localStorage.setItem(cartStorageKey(owner), JSON.stringify(cleaned));
        return true;
    } catch {
        return false;
    }
}
