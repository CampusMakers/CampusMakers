import config from "../config.js";
import { many, query } from "../db/pool.js";
import { GeocoderUnavailableError, geocode, reverseGeocode } from "./geocode.js";

// Fills in map coordinates for locations that were saved with only a name
// and/or an address, using OpenStreetMap Nominatim. Results are written back to
// the locations table so each location is looked up once.

const CAMPUS_BOX_DEGREES = 0.02; // about 2 km around the campus point
const SAME_SPOT_METERS = 60;

const distanceMeters = (a, b) => {
    const rad = Math.PI / 180;
    const dLat = (b.latitude - a.latitude) * rad;
    const dLon = (b.longitude - a.longitude) * rad;
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(h));
};

// "Kennedy Library Entrance" -> "Kennedy Library", "Campus Library, 2nd Floor"
// -> "Campus Library", "Dexter Art Studio 102" -> "Dexter Art Studio".
export const simplifyPlaceName = (name) =>
    name
        .split(",")[0]
        .replace(/\s+(room|rm\.?|suite|ste\.?|floor|booth)\s*#?\s*\w+$/i, "")
        .replace(/\s+#?\d+[a-z]?$/i, "")
        .replace(/\s+(entrance|entry|lobby|steps|plaza)$/i, "")
        .replace(/\s{2,}/g, " ")
        .trim();

const campusArea = async (campus, deadline) => {
    const place =
        (await geocode({ q: campus.name }, { deadline })) ||
        (campus.state ? await geocode({ q: `${campus.name}, ${campus.state}` }, { deadline }) : null);
    if (!place) return null;
    const [south, north, west, east] = place.boundingBox ?? [];
    const box =
        [south, north, west, east].every(Number.isFinite) && north - south < 0.1 && east - west < 0.1
            ? [west - 0.003, south - 0.003, east + 0.003, north + 0.003]
            : [
                  place.longitude - CAMPUS_BOX_DEGREES,
                  place.latitude - CAMPUS_BOX_DEGREES,
                  place.longitude + CAMPUS_BOX_DEGREES,
                  place.latitude + CAMPUS_BOX_DEGREES
              ];
    return { point: place, viewbox: box };
};

/**
 * Works out coordinates for one location. Returns
 * { latitude, longitude, source } or null when nothing matched.
 */
export const geocodeLocation = async (location, campus, { deadline } = {}) => {
    const area = campus ? await campusArea(campus, deadline) : null;
    const nearCampus = (place) =>
        area && distanceMeters(place, area.point) < SAME_SPOT_METERS ? "approximate" : "geocoded";

    const names = [...new Set([location.name, simplifyPlaceName(location.name)].filter((n) => n?.length > 2))];
    const street = location.address?.split(",")[0]?.trim();
    const cityLine = [location.city, location.state].filter(Boolean).join(", ");

    const attempts = [];
    if (area) {
        for (const name of names) attempts.push(() => geocode({ q: name }, { viewbox: area.viewbox, bounded: true, deadline }));
    }
    if (street && (location.city || location.zip)) {
        attempts.push(() =>
            geocode(
                { street, city: location.city, state: location.state, postalcode: location.zip },
                { viewbox: area?.viewbox, deadline }
            )
        );
    }
    if (location.address) {
        attempts.push(() => geocode({ q: [location.address, cityLine].filter(Boolean).join(", ") }, { deadline }));
    }
    if (cityLine) {
        for (const name of names) attempts.push(() => geocode({ q: `${name}, ${cityLine}` }, { viewbox: area?.viewbox, deadline }));
    }

    for (const attempt of attempts) {
        const place = await attempt();
        if (place) return { latitude: place.latitude, longitude: place.longitude, source: nearCampus(place) };
    }

    // Last resort: put the pin on the campus and flag it as approximate.
    if (area) return { latitude: area.point.latitude, longitude: area.point.longitude, source: "approximate" };
    return null;
};

/**
 * Makes sure the given locations have coordinates, geocoding the ones that do
 * not (within the per-request time budget). Returns a Map of location id to
 * { latitude, longitude, approximate } for every location that was updated.
 */
export const ensureLocationCoordinates = async (locationIds, { budgetMs = config.geocoder.requestBudgetMs } = {}) => {
    const updated = new Map();
    const ids = [...new Set(locationIds.filter((value) => value !== null && value !== undefined))];
    if (!ids.length || !config.geocoder.enabled) return updated;

    const pending = await many(
        `select l.id, l.name, l.address, l.city, l.state, l.zip,
                json_build_object('id', c.id, 'name', c.name, 'state', c.state) as campus
         from locations l
         join campuses c on c.id = l.campus_id
         where l.id = any($1::bigint[])
           and (l.latitude is null or l.longitude is null)
           and (l.geocoded_at is null or l.geocoded_at < now() - make_interval(hours => $2))
         order by l.id`,
        [ids, config.geocoder.retryAfterHours]
    );

    const deadline = Date.now() + budgetMs;
    for (const location of pending) {
        if (Date.now() >= deadline) break;
        let result;
        try {
            result = await geocodeLocation(location, location.campus, { deadline });
        } catch (error) {
            if (error instanceof GeocoderUnavailableError) {
                // Nominatim is down or the budget ran out: try again next time.
                console.warn(`Geocoding paused: ${error.message}`);
                break;
            }
            throw error;
        }

        if (result) {
            await query(
                `update locations
                 set latitude = $2, longitude = $3, coordinates_source = $4, geocoded_at = now()
                 where id = $1 and (latitude is null or longitude is null)`,
                [location.id, result.latitude, result.longitude, result.source]
            );
            updated.set(location.id, {
                latitude: result.latitude,
                longitude: result.longitude,
                approximate: result.source === "approximate"
            });
        } else {
            // Nothing matched: remember the attempt so it is not repeated on every request.
            await query("update locations set geocoded_at = now() where id = $1", [location.id]);
        }
    }
    return updated;
};

/**
 * Adds coordinates found by ensureLocationCoordinates to rows that embed a
 * location object ({ id, latitude, longitude, ... }) under `key`.
 */
export const withLocationCoordinates = async (rows, key = "location") => {
    const missing = rows
        .map((row) => row[key])
        .filter((location) => location && (location.latitude === null || location.longitude === null))
        .map((location) => location.id);
    if (!missing.length) return rows;

    const found = await ensureLocationCoordinates(missing);
    if (!found.size) return rows;
    return rows.map((row) => {
        const coordinates = row[key] && found.get(row[key].id);
        return coordinates ? { ...row, [key]: { ...row[key], ...coordinates } } : row;
    });
};

/** Best-effort readable address for a dropped pin; null when unknown. */
export const addressForCoordinates = async (latitude, longitude) => {
    try {
        const place = await reverseGeocode(latitude, longitude, { deadline: Date.now() + config.geocoder.requestBudgetMs });
        if (!place) return null;
        const a = place.address ?? {};
        const street = [a.house_number, a.road].filter(Boolean).join(" ");
        return {
            address: street || a.building || a.amenity || place.displayName?.split(",")[0] || null,
            city: a.city || a.town || a.village || a.hamlet || null,
            state: a.state || null,
            zip: a.postcode || null
        };
    } catch (error) {
        if (error instanceof GeocoderUnavailableError) return null;
        throw error;
    }
};
