
import test from "node:test";
import assert from "node:assert/strict";
import {
    createVerificationToken,
    hashVerificationToken,
    getVerificationExpiry
} from "./sellerVerificationTokens.js";

test("generates properly formatted verification tokens", () => {
    const token = createVerificationToken();

    assert.match(token, /^[a-f0-9]{64}$/);
});

test("generates different tokens for different requests", () => {
    const first = createVerificationToken();
    const second = createVerificationToken();

    assert.notEqual(first, second);
});

test("hashes tokens consistently without retaining raw values", async () => {
    const token = createVerificationToken();

    const firstHash = await hashVerificationToken(token);
    const secondHash = await hashVerificationToken(token);

    assert.equal(firstHash, secondHash);
    assert.match(firstHash, /^[a-f0-9]{64}$/);
    assert.notEqual(firstHash, token);
});

test("different tokens produce different hashes", async () => {
    const first = createVerificationToken();
    const second = createVerificationToken();

    assert.notEqual(
        await hashVerificationToken(first),
        await hashVerificationToken(second)
    );
});

test("verification links expire after approximately 30 minutes", () => {
    const remaining = getVerificationExpiry().getTime() - Date.now();

    assert.ok(remaining > 29 * 60 * 1000);
    assert.ok(remaining <= 30 * 60 * 1000);
});
