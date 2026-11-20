import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Replace the geocoder and database with in-memory fakes.
class GeocoderUnavailableError extends Error {}
let geocodeImpl = async () => null;
let reverseImpl = async () => null;
const geocodeCalls = [];
let pending = [];
const updates = [];

mock.module("../../src/lib/geocode.js", {
    namedExports: {
        GeocoderUnavailableError,
        geocode: async (...args) => {
            geocodeCalls.push(args);
            return geocodeImpl(...args);
        },
        reverseGeocode: (...args) => reverseImpl(...args)
    }
});
mock.module("../../src/db/pool.js", {
    namedExports: {
        many: async () => pending,
        query: async (sql, values) => updates.push({ sql, values })
    }
});

const { addressForCoordinates, ensureLocationCoordinates, geocodeLocation, simplifyPlaceName, withLocationCoordinates } =
    await import("../../src/lib/locationCoordinates.js");

beforeEach(() => {
    geocodeImpl = async () => null;
    reverseImpl = async () => null;
    geocodeCalls.length = 0;
    updates.length = 0;
    pending = [];
});

const campusPlace = { latitude: 40, longitude: -75, boundingBox: [39.99, 40.01, -75.01, -74.99] };

describe("simplifyPlaceName", () => {
    it("removes rooms, numbers, entrances and trailing detail", () => {
        assert.equal(simplifyPlaceName("Kennedy Library Entrance"), "Kennedy Library");
        assert.equal(simplifyPlaceName("Campus Library, 2nd Floor"), "Campus Library");
        assert.equal(simplifyPlaceName("Dexter Art Studio 102"), "Dexter Art Studio");
        assert.equal(simplifyPlaceName("Science Hall Room 4B"), "Science Hall");
        assert.equal(simplifyPlaceName("Student  Union"), "Student Union");
    });
});

describe("geocodeLocation", () => {
    it("returns null when nothing matches and there is no campus", async () => {
        assert.equal(await geocodeLocation({ name: "Somewhere" }, null), null);
    });

    it("searches by name within the campus box first", async () => {
        geocodeImpl = async (query, options) => {
            if (query.q === "State U") return campusPlace;
            if (options?.bounded) return { latitude: 40.005, longitude: -75.005 };
            return null;
        };
        const result = await geocodeLocation({ name: "Library" }, { name: "State U" });
        assert.deepEqual(result, { latitude: 40.005, longitude: -75.005, source: "geocoded" });
        const bounded = geocodeCalls.find(([q]) => q.q === "Library");
        assert.deepEqual(bounded[1].viewbox, [-75.013, 39.987, -74.987, 40.013]);
    });

    it("marks hits on the campus point as approximate", async () => {
        geocodeImpl = async () => campusPlace;
        const result = await geocodeLocation({ name: "Library" }, { name: "State U" });
        assert.equal(result.source, "approximate");
    });

    it("falls back to the campus point when nothing else matches", async () => {
        geocodeImpl = async (query) => (query.q === "State U" ? { ...campusPlace, boundingBox: null } : null);
        const result = await geocodeLocation({ name: "Hidden Spot" }, { name: "State U" });
        assert.deepEqual(result, { latitude: 40, longitude: -75, source: "approximate" });
    });

    it("tries the campus name with its state", async () => {
        await geocodeLocation({ name: "Library" }, { name: "State U", state: "PA" });
        assert.deepEqual(geocodeCalls[1][0], { q: "State U, PA" });
    });

    it("uses structured and free-form address searches", async () => {
        geocodeImpl = async (query) => (query.street ? { latitude: 1, longitude: 2 } : null);
        const result = await geocodeLocation({ name: "X", address: "1 Main St, Apt 2", city: "Town", state: "PA" }, null);
        assert.deepEqual(result, { latitude: 1, longitude: 2, source: "geocoded" });
        assert.deepEqual(geocodeCalls[0][0], { street: "1 Main St", city: "Town", state: "PA", postalcode: undefined });
    });
});

describe("ensureLocationCoordinates", () => {
    it("does nothing without ids", async () => {
        assert.equal((await ensureLocationCoordinates([null, undefined])).size, 0);
    });

    it("stores matches and records misses", async () => {
        pending = [
            { id: 1, name: "Hit Hall", city: "Town", campus: null },
            { id: 2, name: "Miss Hall", campus: null }
        ];
        geocodeImpl = async (query) => (query.q?.startsWith("Hit") ? { latitude: 3, longitude: 4 } : null);
        const result = await ensureLocationCoordinates([1, 2, 1]);
        assert.deepEqual([...result], [[1, { latitude: 3, longitude: 4, approximate: false }]]);
        assert.deepEqual(updates[0].values, [1, 3, 4, "geocoded"]);
        assert.deepEqual(updates[1].values, [2]);
    });

    it("stops when the geocoder is unavailable", async (t) => {
        t.mock.method(console, "warn", () => {});
        pending = [
            { id: 1, name: "Hall", city: "Town", campus: null },
            { id: 2, name: "Hall", city: "Town", campus: null }
        ];
        geocodeImpl = async () => {
            throw new GeocoderUnavailableError("down");
        };
        assert.equal((await ensureLocationCoordinates([1, 2])).size, 0);
        assert.equal(updates.length, 0);
        assert.equal(geocodeCalls.length, 1);
    });

    it("rethrows unexpected errors", async () => {
        pending = [{ id: 1, name: "Hall", city: "Town", campus: null }];
        geocodeImpl = async () => {
            throw new Error("boom");
        };
        await assert.rejects(ensureLocationCoordinates([1]), /boom/);
    });

    it("skips work once the budget is spent", async () => {
        pending = [{ id: 1, name: "Hall", city: "Town", campus: null }];
        assert.equal((await ensureLocationCoordinates([1], { budgetMs: -1 })).size, 0);
        assert.equal(geocodeCalls.length, 0);
    });
});

describe("withLocationCoordinates", () => {
    it("returns rows unchanged when nothing is missing", async () => {
        const rows = [{ location: { id: 1, latitude: 1, longitude: 2 } }, { location: null }];
        assert.equal(await withLocationCoordinates(rows), rows);
    });

    it("merges found coordinates into rows under the given key", async () => {
        pending = [{ id: 7, name: "Hall", city: "Town", campus: null }];
        geocodeImpl = async () => ({ latitude: 9, longitude: 8 });
        const rows = [{ place: { id: 7, latitude: null, longitude: null, name: "Hall" } }, { place: null }];
        const result = await withLocationCoordinates(rows, "place");
        assert.deepEqual(result[0].place, { id: 7, latitude: 9, longitude: 8, approximate: false, name: "Hall" });
        assert.equal(result[1], rows[1]);
    });
});

describe("addressForCoordinates", () => {
    it("formats a reverse geocoded address", async () => {
        reverseImpl = async () => ({ address: { house_number: "5", road: "Main St", town: "Town", state: "PA", postcode: "19000" } });
        assert.deepEqual(await addressForCoordinates(1, 2), { address: "5 Main St", city: "Town", state: "PA", zip: "19000" });
    });

    it("falls back to building names or the display name", async () => {
        reverseImpl = async () => ({ displayName: "Old Main, Town", address: {} });
        assert.equal((await addressForCoordinates(1, 2)).address, "Old Main");
    });

    it("returns null for no match or an unavailable geocoder", async () => {
        assert.equal(await addressForCoordinates(1, 2), null);
        reverseImpl = async () => {
            throw new GeocoderUnavailableError("down");
        };
        assert.equal(await addressForCoordinates(1, 2), null);
    });

    it("rethrows unexpected errors", async () => {
        reverseImpl = async () => {
            throw new Error("boom");
        };
        await assert.rejects(addressForCoordinates(1, 2), /boom/);
    });
});
