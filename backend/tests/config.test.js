import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// config.js reads process.env at import time, so each test imports a fresh copy.
let counter = 0;
const load = async () => (await import(`../src/config.js?case=${counter++}`)).default;

describe("config", () => {
    let saved;
    beforeEach(() => (saved = { ...process.env }));
    afterEach(() => (process.env = saved));

    it("throws when a required variable is missing", async () => {
        delete process.env.DATABASE_URL;
        await assert.rejects(load(), /Missing required environment variable DATABASE_URL/);
    });

    it("parses lists, integers and booleans", async () => {
        Object.assign(process.env, {
            CLIENT_ORIGINS: " https://a.com , ,https://b.com",
            MAX_UPLOAD_MB: "2",
            DB_SSL: "true",
            DB_POOL_MAX: "not-a-number",
            GEOCODER_ENABLED: "false",
            NOMINATIM_URL: "https://geo.example/"
        });
        const config = await load();
        assert.deepEqual(config.clientOrigins, ["https://a.com", "https://b.com"]);
        assert.equal(config.uploads.maxBytes, 2 * 1024 * 1024);
        assert.equal(config.db.ssl, true);
        assert.equal(config.db.poolMax, 5);
        assert.equal(config.geocoder.enabled, false);
        assert.equal(config.geocoder.url, "https://geo.example");
    });

    it("derives the R2 endpoint from the account id", async () => {
        delete process.env.R2_ENDPOINT;
        process.env.R2_ACCOUNT_ID = "acct";
        assert.equal((await load()).r2.endpoint, "https://acct.r2.cloudflarestorage.com");
        delete process.env.R2_ACCOUNT_ID;
        assert.equal((await load()).r2.endpoint, null);
    });

    it("uses defaults", async () => {
        for (const name of ["DEFAULT_PAGE_SIZE", "MAX_PAGE_SIZE", "SELLER_EMAIL_SUFFIX", "PICKUP_PIN_LENGTH"]) {
            delete process.env[name];
        }
        const config = await load();
        assert.deepEqual(config.pagination, { defaultSize: 20, maxSize: 100 });
        assert.equal(config.sellers.emailSuffix, ".edu");
        assert.equal(config.orders.pinLength, 4);
    });
});
