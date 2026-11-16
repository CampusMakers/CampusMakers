import { useCallback, useSyncExternalStore } from "react";
import { addCartItem, changeCartQuantity, readCart, removeCartItem, writeCart } from "./cartModel.js";

// A shared snapshot keeps the cart badge, cart page, and checkout in sync.
const snapshots = new Map();
const listeners = new Set();
const notify = () => listeners.forEach(listener => listener());

if (typeof window !== "undefined") {
    window.addEventListener("storage", event => {
        if (event.key?.startsWith("campus-makers-cart-preview:v1:") || event.key === null) {
            snapshots.clear();
            notify();
        }
    });
}

function getSnapshot(owner) {
    if (!snapshots.has(owner)) snapshots.set(owner, readCart(owner));
    return snapshots.get(owner);
}

function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function update(owner, updater) {
    const next = updater(getSnapshot(owner));
    if (!writeCart(owner, next)) return false;
    snapshots.set(owner, readCart(owner));
    notify();
    return true;
}

export function useCart(owner) {
    const key = String(owner || "guest");
    const get = useCallback(() => getSnapshot(key), [key]);
    const items = useSyncExternalStore(subscribe, get, get);
    return {
        items,
        add(product, count) {
            let added = 0;
            const saved = update(key, current => {
                const result = addCartItem(current, product, count);
                added = result.added;
                return result.items;
            });
            return saved ? added : 0;
        },
        setQuantity(id, quantity) {
            return update(key, current => changeCartQuantity(current, id, quantity));
        },
        remove(id) {
            return update(key, current => removeCartItem(current, id));
        }
    };
}
