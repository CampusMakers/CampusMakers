import { api } from "./api.js";

// Campus events from the backend (GET /api/events), used by the Map and
// Calendar pages. Locations without stored coordinates are geocoded by the
// backend through OpenStreetMap Nominatim, so most events arrive with
// latitude/longitude already filled in.

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

const toNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const toDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

/** Backend event -> the shape the Map and Calendar pages use. */
export function toCampusEvent(event) {
    const location = event.location || null;
    const lat = toNumber(location?.latitude);
    const lng = toNumber(location?.longitude);
    const hasCoordinates = lat !== null && lng !== null;
    const creatorName = event.creator?.username
        ? `@${event.creator.username}`
        : event.creator?.name || null;

    return {
        id: event.id,
        title: event.title || "Campus event",
        description: event.description || "",
        startsAt: toDate(event.startsAt),
        endsAt: toDate(event.endsAt),
        host: event.host?.name || creatorName || "Campus Makers",
        hostOwnerId: event.host?.ownerId ?? null,
        creatorId: event.creator?.id ?? null,
        locationId: location?.id ?? null,
        locationName: location?.name || "Location to be announced",
        address: [location?.address, location?.city, location?.state]
            .filter(Boolean)
            .join(", "),
        lat: hasCoordinates ? lat : null,
        lng: hasCoordinates ? lng : null,
        hasCoordinates,
        approximate: Boolean(location?.approximate),
        goingCount: Number(event.goingCount) || 0,
        interestedCount: Number(event.interestedCount) || 0,
        vendors: Array.isArray(event.vendors) ? event.vendors : [],
        myRsvp: event.myRsvp || null,
        myRole: event.myRole || null
    };
}

/** True when the signed-in user runs this event. */
export function isEventHost(event, user) {
    if (!user?.id) return false;
    return (
        event.myRole === "host" ||
        event.hostOwnerId === user.id ||
        event.creatorId === user.id
    );
}

/**
 * Loads every event matching the filters, following pagination.
 * from/to are Date objects bounding the events' time range.
 */
export async function listEvents({
    when = "upcoming",
    from,
    to,
    campusId,
    signal
} = {}) {
    const events = [];
    for (let page = 0; page < MAX_PAGES; page += 1) {
        const params = new URLSearchParams({
            when,
            limit: String(PAGE_SIZE),
            offset: String(page * PAGE_SIZE)
        });
        if (from) params.set("from", from.toISOString());
        if (to) params.set("to", to.toISOString());
        if (campusId) params.set("campusId", String(campusId));

        const rows = await api(`/events?${params}`, { signal });
        events.push(...(rows || []).map(toCampusEvent));
        if (!rows || rows.length < PAGE_SIZE) break;
    }
    return events;
}

export async function getEvent(id, { signal } = {}) {
    return toCampusEvent(
        await api(`/events/${encodeURIComponent(id)}`, { signal })
    );
}

/** RSVP the signed-in user as "going" (or "interested"). */
export function rsvpToEvent(id, status = "going") {
    return api(`/events/${encodeURIComponent(id)}/rsvps/me`, {
        method: "PUT",
        body: JSON.stringify({ status })
    });
}

/** Remove the signed-in user's RSVP. */
export function cancelEventRsvp(id) {
    return api(`/events/${encodeURIComponent(id)}/rsvps/me`, {
        method: "DELETE"
    });
}

/** Local calendar-day key (YYYY-MM-DD) for a date. */
export function dateKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

/** Reads "?name=value" from the current hash route (e.g. #map?event=4). */
export function hashParam(name) {
    const query = window.location.hash.split("?")[1] || "";
    return new URLSearchParams(query).get(name);
}
