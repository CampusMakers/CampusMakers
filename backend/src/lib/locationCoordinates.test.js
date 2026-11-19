import test from "node:test";
import assert from "node:assert/strict";

// config.js reads these at import time.
process.env.BETTER_AUTH_URL ??= "http://localhost";
process.env.BETTER_AUTH_SECRET ??= "test-secret";
process.env.DATABASE_URL ??= "postgres://localhost/test";
process.env.GEOCODER_MIN_INTERVAL_MS = "0";

const { geocodeLocation, simplifyPlaceName } = await import("./locationCoordinates.js");
const { resetGeocoderCache } = await import("./geocode.js");

const campus = { id: 1, name: "California Polytechnic State University, San Luis Obispo", state: "California" };
const campusHit = {
    lat: "35.3050",
    lon: "-120.6625",
    boundingbox: ["35.29", "35.32", "-120.68", "-120.64"],
    display_name: "Cal Poly"
};

// Fakes Nominatim: `answer(url)` returns the JSON body for each request.
const mockNominatim = (t, answer) => {
    const calls = [];
    t.mock.method(globalThis, "fetch", async (url, options) => {
        calls.push({ url: new URL(url), options });
        return new Response(JSON.stringify(answer(new URL(url))), { status: 200 });
    });
    return calls;
};

test.beforeEach(() => resetGeocoderCache());

test("simplifyPlaceName drops rooms, floors and entrances", () => {
    assert.equal(simplifyPlaceName("Kennedy Library Entrance"), "Kennedy Library");
    assert.equal(simplifyPlaceName("Campus Library, 2nd Floor"), "Campus Library");
    assert.equal(simplifyPlaceName("Dexter Art Studio 102"), "Dexter Art Studio");
    assert.equal(simplifyPlaceName("Kennedy Library Room 202"), "Kennedy Library");
    assert.equal(simplifyPlaceName("Dexter Lawn"), "Dexter Lawn");
});

test("a named campus place is matched inside the campus area", async (t) => {
    const calls = mockNominatim(t, (url) => {
        const q = url.searchParams.get("q");
        if (q === campus.name) return [campusHit];
        if (q === "Kennedy Library" && url.searchParams.get("bounded") === "1") {
            return [{ lat: "35.30188", lon: "-120.66392" }];
        }
        return [];
    });

    const result = await geocodeLocation(
        { name: "Kennedy Library Entrance", address: "1 Grand Ave, Building 35", city: "San Luis Obispo", state: "CA", zip: "93407" },
        campus
    );

    assert.deepEqual(result, { latitude: 35.30188, longitude: -120.66392, source: "geocoded" });
    assert.ok(calls.every((call) => call.options.headers["User-Agent"]), "every request identifies the app");
    assert.equal(calls.at(-1).url.searchParams.get("viewbox"), "-120.683,35.287,-120.637,35.323");
});

test("falls back to the street address, then to the campus as an approximate point", async (t) => {
    mockNominatim(t, (url) => {
        if (url.searchParams.get("q") === campus.name) return [campusHit];
        if (url.searchParams.get("street") === "200 Main St") return [{ lat: "35.28", lon: "-120.66" }];
        return [];
    });

    const offCampus = await geocodeLocation(
        { name: "Pop-up Booth", address: "200 Main St", city: "San Luis Obispo", state: "CA", zip: "93401" },
        campus
    );
    assert.deepEqual(offCampus, { latitude: 35.28, longitude: -120.66, source: "geocoded" });

    const unknown = await geocodeLocation({ name: "Somewhere Secret", address: null, city: null, state: null, zip: null }, campus);
    assert.deepEqual(unknown, { latitude: 35.305, longitude: -120.6625, source: "approximate" });
});

test("an address that resolves to the campus point itself is flagged approximate", async (t) => {
    mockNominatim(t, (url) => {
        if (url.searchParams.get("q") === campus.name) return [campusHit];
        if (url.searchParams.get("street") === "1 Grand Ave") return [{ lat: "35.30502", lon: "-120.66251" }];
        return [];
    });

    const result = await geocodeLocation(
        { name: "Dexter Lawn", address: "1 Grand Ave, Dexter Lawn", city: "San Luis Obispo", state: "CA", zip: "93407" },
        campus
    );
    assert.equal(result.source, "approximate");
});

test("Nominatim outages surface as GeocoderUnavailableError so nothing is cached", async (t) => {
    const { GeocoderUnavailableError } = await import("./geocode.js");
    t.mock.method(globalThis, "fetch", async () => new Response("busy", { status: 503 }));
    await assert.rejects(
        geocodeLocation({ name: "Dexter Lawn" }, campus),
        (error) => error instanceof GeocoderUnavailableError
    );
});
