import test from "node:test";
import assert from "node:assert/strict";
import { addCartItem, changeCartQuantity, removeCartItem, cartItemCount, cartTotal, cleanCart, cartStorageKey } from "./cartModel.js";

const mug = { id: "listing-101", name: "Mug", creator: "@clay", price: 28, quantity: 5, maxPerOrder: 3 };
const print = { id: "listing-102", name: "Print", creator: "@art", price: 12.5, quantity: 2, maxPerOrder: 2 };

test("adding listings from two sellers sums quantities and totals", () => {
    const first = addCartItem([], mug, 2);
    const second = addCartItem(first.items, print, 1);
    assert.equal(cartItemCount(second.items), 3);
    assert.equal(cartTotal(second.items), 68.5);
});

test("adding the same product increments quantity up to max-per-order", () => {
    const first = addCartItem([], mug, 2);
    const result = addCartItem(first.items, mug, 3);
    assert.equal(result.added, 1);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].quantity, 3);
    assert.equal(addCartItem(result.items, mug, 1).added, 0);
});

test("stock limits and invalid products are enforced", () => {
    assert.equal(addCartItem([], { ...mug, quantity: 0 }, 1).added, 0);
    assert.equal(addCartItem([], { ...mug, price: -1 }, 1).added, 0);
    assert.equal(addCartItem([], print, 9).items[0].quantity, 2);
});

test("per-item quantity and delete leave other seller's items intact", () => {
    const withBoth = addCartItem(addCartItem([], mug, 1).items, print, 2).items;
    const changed = changeCartQuantity(withBoth, mug.id, 3);
    assert.equal(changed[0].quantity, 3);
    const removed = removeCartItem(changed, mug.id);
    assert.equal(removed.length, 1);
    assert.equal(removed[0].id, print.id);
});

test("invalid stored entries are normalized and account keys separated", () => {
    assert.equal(cleanCart([{ ...mug, quantity: 99 }])[0].quantity, 3);
    assert.notEqual(cartStorageKey("guest"), cartStorageKey("user:123"));
    assert.equal(cleanCart([{ id: "", price: 0 }]).length, 0);
});

test("a guest cart is stored separately from a signed-in user's cart", async () => {
    const { readCart, writeCart } = await import("./cartModel.js");
    const entries = new Map();
    const oldWindow = globalThis.window;
    globalThis.window = {
        localStorage: {
            setItem(key, value) { entries.set(key, value); },
            getItem(key) { return entries.get(key) ?? null; }
        }
    };
    try {
        assert.equal(writeCart("guest", addCartItem([], mug).items), true);
        assert.equal(readCart("user:123").length, 0);
        assert.equal(readCart("guest")[0].id, mug.id);
    } finally {
        globalThis.window = oldWindow;
    }
});
