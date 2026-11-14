import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getQuantityLimit, getSuggestedProducts } from "./productListing.js";

test("quantity choices respect the seller limit and available stock", () => {
    assert.equal(getQuantityLimit({}), 5);
    assert.equal(getQuantityLimit({ maxPerOrder: 8 }), 8);
    assert.equal(getQuantityLimit({ maxPerOrder: 8, quantity: 3 }), 3);
    assert.equal(getQuantityLimit({ maxPerOrder: 8, quantity: 0 }), 0);
    assert.equal(getQuantityLimit({ maxPerOrder: -1, quantity: 10 }), 5);
});

test("suggestions exclude the current product, posts and duplicate listings", () => {
    const current = { id: "listing-1", type: "listing", category: "Art", tags: ["Print"] };
    const matches = [
        { id: "listing-2", type: "listing", category: "Art", tags: ["print"] },
        { id: "listing-3", type: "listing", tags: [] }
    ];
    const result = getSuggestedProducts(current, [current, { id: 7, type: "image" }, matches[1], matches[0], matches[0]]);
    assert.deepEqual(result.map(item => item.id), ["listing-2", "listing-3"]);
});
