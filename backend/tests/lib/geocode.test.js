import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import config from "../../src/config.js";
import { GeocoderUnavailableError, geocode, resetGeocoderCache, reverseGeocode } from "../../src/lib/geocode.js";

const respond = (body, ok = true, status = 200) => async () => ({ ok, status, json: async () => body });

describe("geocode", () => {
    beforeEach(() => {
        resetGeocoderCache();
        config.geocoder.enabled = true;
        config.geocoder.minIntervalMs = 0;
        config.geocoder.email = null;
    });

    it("returns null when disabled", async (t) => {
        config.geocoder.enabled = false;
        const fetch = t.mock.method(globalThis, "fetch", respond([]));
        assert.equal(await geocode({ q: "x" }), null);
        assert.equal(await reverseGeocode(1, 2), null);
        assert.equal(fetch.mock.callCount(), 0);
    });

    it("builds the search request and normalizes the hit", async (t) => {
        config.geocoder.email = "ops@example.com";
        const fetch = t.mock.method(
            globalThis,
            "fetch",
            respond([{ lat: "40.1234567", lon: "-75.7654321", display_name: "Place", boundingbox: ["1", "2", "3", "4"] }])
        );
        const place = await geocode({ q: "Library", city: "" }, { viewbox: [1, 2, 3, 4], bounded: true });
        assert.deepEqual(place, {
            latitude: 40.123457,
            longitude: -75.765432,
            displayName: "Place",
            boundingBox: [1, 2, 3, 4],
            address: null
        });
        const [url, options] = fetch.mock.calls[0].arguments;
        assert.equal(url.pathname, "/search");
        assert.equal(url.searchParams.get("q"), "Library");
        assert.equal(url.searchParams.has("city"), false);
        assert.equal(url.searchParams.get("viewbox"), "1,2,3,4");
        assert.equal(url.searchParams.get("bounded"), "1");
        assert.equal(url.searchParams.get("format"), "jsonv2");
        assert.equal(url.searchParams.get("email"), "ops@example.com");
        assert.equal(options.headers["User-Agent"], config.geocoder.userAgent);
    });

    it("caches answers, including no match", async (t) => {
        const fetch = t.mock.method(globalThis, "fetch", respond([]));
        assert.equal(await geocode({ q: "nowhere" }), null);
        assert.equal(await geocode({ q: "nowhere" }), null);
        assert.equal(fetch.mock.callCount(), 1);
    });

    it("drops hits with invalid coordinates", async (t) => {
        t.mock.method(globalThis, "fetch", respond([{ lat: "x", lon: "1" }]));
        assert.equal(await geocode({ q: "bad" }), null);
    });

    it("raises GeocoderUnavailableError on HTTP and network failures without caching", async (t) => {
        const fetch = t.mock.method(globalThis, "fetch", respond(null, false, 503));
        await assert.rejects(geocode({ q: "a" }), GeocoderUnavailableError);
        fetch.mock.mockImplementation(async () => {
            throw new Error("offline");
        });
        await assert.rejects(geocode({ q: "a" }), /Nominatim request failed: offline/);
        assert.equal(fetch.mock.callCount(), 2);
    });

    it("refuses requests that would pass the deadline", async (t) => {
        config.geocoder.minIntervalMs = 60_000;
        t.mock.method(globalThis, "fetch", respond([]));
        await geocode({ q: "first" });
        await assert.rejects(geocode({ q: "second" }, { deadline: Date.now() + 10 }), /time budget/);
    });

    it("reverse geocodes and treats error answers as no match", async (t) => {
        const fetch = t.mock.method(globalThis, "fetch", respond({ lat: "1", lon: "2", address: { road: "Main" } }));
        assert.deepEqual((await reverseGeocode(1, 2)).address, { road: "Main" });
        assert.equal(fetch.mock.calls[0].arguments[0].pathname, "/reverse");
        fetch.mock.mockImplementation(respond({ error: "Unable to geocode" }));
        assert.equal(await reverseGeocode(5, 6), null);
    });
});
