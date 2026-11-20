import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
    createVerificationToken,
    getVerificationExpiry,
    hashVerificationToken
} from "../../src/lib/sellerVerificationTokens.js";

describe("seller verification tokens", () => {
    it("creates 64-character hex tokens that differ each time", () => {
        const a = createVerificationToken();
        assert.match(a, /^[0-9a-f]{64}$/);
        assert.notEqual(a, createVerificationToken());
    });

    it("hashes with SHA-256 hex", async () => {
        const expected = createHash("sha256").update("token").digest("hex");
        assert.equal(await hashVerificationToken("token"), expected);
    });

    it("expires 30 minutes from now", (t) => {
        t.mock.timers.enable({ apis: ["Date"], now: 1_000_000 });
        assert.equal(getVerificationExpiry().getTime(), 1_000_000 + 30 * 60 * 1000);
    });
});
