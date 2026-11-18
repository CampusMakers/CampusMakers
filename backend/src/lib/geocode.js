import config from "../config.js";

// Small OpenStreetMap Nominatim client.
// - Requests are serialized and spaced by geocoder.minIntervalMs, as the
//   public Nominatim usage policy allows at most one request per second.
// - Answers (including "no match") are cached in memory for the life of the
//   process or Worker isolate. Matches are also stored on the locations table
//   (see lib/locationCoordinates.js), so this cache only saves repeat lookups.

const CACHE_LIMIT = 500;
const cache = new Map();
let queue = Promise.resolve();
let lastRequestAt = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const remember = (key, value) => {
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
    cache.set(key, value);
    return value;
};

export class GeocoderUnavailableError extends Error {}

const request = (path, params, deadline) => {
    const run = async () => {
        const wait = lastRequestAt + config.geocoder.minIntervalMs - Date.now();
        if (deadline && Date.now() + Math.max(wait, 0) > deadline) {
            throw new GeocoderUnavailableError("Geocoding time budget used up");
        }
        if (wait > 0) await sleep(wait);
        lastRequestAt = Date.now();

        const url = new URL(`${config.geocoder.url}${path}`);
        for (const [name, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && value !== "") url.searchParams.set(name, String(value));
        }
        url.searchParams.set("format", "jsonv2");
        if (config.geocoder.email) url.searchParams.set("email", config.geocoder.email);

        let response;
        try {
            response = await fetch(url, {
                headers: {
                    "User-Agent": config.geocoder.userAgent,
                    "Accept-Language": "en"
                },
                signal: AbortSignal.timeout(config.geocoder.timeoutMs)
            });
        } catch (error) {
            throw new GeocoderUnavailableError(`Nominatim request failed: ${error.message}`);
        }
        if (!response.ok) throw new GeocoderUnavailableError(`Nominatim answered ${response.status}`);
        return response.json();
    };

    const result = queue.then(run, run);
    queue = result.catch(() => {});
    return result;
};

const toPlace = (hit) => {
    if (!hit) return null;
    const latitude = Number(hit.lat);
    const longitude = Number(hit.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return {
        latitude: Number(latitude.toFixed(6)),
        longitude: Number(longitude.toFixed(6)),
        displayName: hit.display_name ?? null,
        boundingBox: Array.isArray(hit.boundingbox) ? hit.boundingbox.map(Number) : null,
        address: hit.address ?? null
    };
};

const cached = async (key, lookup) => {
    if (cache.has(key)) return cache.get(key);
    // Only definite answers are cached; outages are retried later.
    return remember(key, await lookup());
};

/**
 * Forward geocoding. Pass either { q } for a free-form query or structured
 * fields { street, city, state, postalcode, country }.
 * viewbox is [minLon, minLat, maxLon, maxLat]; with bounded it limits matches
 * to that box. Returns the best match or null.
 */
export const geocode = async (query, { viewbox, bounded = false, deadline } = {}) => {
    if (!config.geocoder.enabled) return null;
    const params = {
        ...query,
        limit: 1,
        addressdetails: 0,
        viewbox: viewbox ? viewbox.join(",") : undefined,
        bounded: viewbox && bounded ? 1 : undefined
    };
    const key = `search:${JSON.stringify(params)}`;
    return cached(key, async () => toPlace((await request("/search", params, deadline))?.[0]));
};

/** Reverse geocoding: coordinates to a readable address, or null. */
export const reverseGeocode = async (latitude, longitude, { deadline } = {}) => {
    if (!config.geocoder.enabled) return null;
    const params = { lat: latitude, lon: longitude, zoom: 18, addressdetails: 1 };
    const key = `reverse:${Number(latitude).toFixed(6)},${Number(longitude).toFixed(6)}`;
    return cached(key, async () => {
        const hit = await request("/reverse", params, deadline);
        return hit?.error ? null : toPlace(hit);
    });
};

// For tests.
export const resetGeocoderCache = () => {
    cache.clear();
    lastRequestAt = 0;
};
