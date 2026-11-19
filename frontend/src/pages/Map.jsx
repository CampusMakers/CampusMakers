import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";

import {
    dateKey,
    getEvent,
    hashParam,
    listEvents
} from "../services/eventsApi";
import "leaflet/dist/leaflet.css";
import "./Map.css";

const CAMPUS_CENTER = [35.3006, -120.6615];
const START_ZOOM = 16;
const FIT_OPTIONS = {
    paddingTopLeft: [24, 48],
    paddingBottomRight: [150, 24],
    maxZoom: 17
};
// Events without an end time count as "happening now" for this long.
const DEFAULT_EVENT_MS = 2 * 60 * 60 * 1000;

function placeBounds(places) {
    return L.latLngBounds(places.map((place) => [place.lat, place.lng]));
}

// Flat, light basemap from OpenFreeMap (OpenStreetMap data, no API key).
// Its credits are read from the style and shown automatically.
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

// Hide every text label and icon so only our location labels show.
function hideBasemapLabels(glMap) {
    glMap.getStyle().layers.forEach((layer) => {
        if (layer.type === "symbol") {
            glMap.setLayoutProperty(layer.id, "visibility", "none");
        }
    });
}

function formatDate(date) {
    if (!date) return "Date to be announced";
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

function formatTime(date) {
    if (!date) return "Time to be announced";
    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

function formatTimeRange(event) {
    if (!event.startsAt) return formatTime(null);
    if (!event.endsAt) return formatTime(event.startsAt);
    const sameDay = dateKey(event.startsAt) === dateKey(event.endsAt);
    const end = sameDay
        ? formatTime(event.endsAt)
        : `${event.endsAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric"
          })}, ${formatTime(event.endsAt)}`;
    return `${formatTime(event.startsAt)} – ${end}`;
}

function eventStatus(event, now = Date.now()) {
    if (!event.startsAt) return "Upcoming";
    const start = event.startsAt.getTime();
    const end = event.endsAt?.getTime() ?? start + DEFAULT_EVENT_MS;
    if (now >= end) return "Ended";
    if (now >= start) return "Happening now";
    return "Upcoming";
}

function formatCoordinates(lat, lng) {
    const latText = `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? "N" : "S"}`;
    const lngText = `${Math.abs(lng).toFixed(5)}° ${lng >= 0 ? "E" : "W"}`;
    return `${latText}, ${lngText}`;
}

function pinIcon(variant) {
    return L.divIcon({
        className: "map-pin-icon",
        html: `<span class="map-pin map-pin-${variant}"><span class="map-pin-dot"></span></span>`,
        iconSize: [30, 38],
        iconAnchor: [15, 38],
        tooltipAnchor: [12, -24]
    });
}

// Events at the same location share one pin.
function groupByPlace(events) {
    const places = new Map();
    events.forEach((event) => {
        if (!event.hasCoordinates) return;
        const key = event.locationId
            ? `location-${event.locationId}`
            : `${event.lat.toFixed(5)},${event.lng.toFixed(5)}`;
        if (!places.has(key)) {
            places.set(key, {
                key,
                name: event.locationName,
                lat: event.lat,
                lng: event.lng,
                events: []
            });
        }
        places.get(key).events.push(event);
    });
    return [...places.values()];
}

function DetailRow({ icon, label, children }) {
    return (
        <div className="map-detail-row">
            <span className="map-detail-icon">{icon}</span>
            <div>
                <span className="map-detail-label">{label}</span>
                <div className="map-detail-value">{children}</div>
            </div>
        </div>
    );
}

const icons = {
    pin: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
        </svg>
    ),
    date: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M7 3v4M17 3v4M3 10h18" />
        </svg>
    ),
    time: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </svg>
    ),
    people: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="9" cy="8" r="3.5" />
            <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
        </svg>
    )
};

const selectedFromHash = () => {
    const id = Number(hashParam("event"));
    return Number.isInteger(id) && id > 0 ? id : null;
};

function MapPage() {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const layerRef = useRef(null);
    const fittedRef = useRef(false);

    // Upcoming events from the API.
    const [reloadKey, setReloadKey] = useState(0);
    const [result, setResult] = useState({
        status: "loading",
        events: [],
        error: ""
    });
    // An event linked from elsewhere (e.g. #map?event=12) that is not in the upcoming list.
    const [linkedEvent, setLinkedEvent] = useState(null);
    const [selectedId, setSelectedId] = useState(selectedFromHash);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        listEvents({ when: "upcoming", signal: controller.signal })
            .then((events) =>
                setResult({ status: "ready", events, error: "" })
            )
            .catch((error) => {
                if (controller.signal.aborted) return;
                setResult({
                    status: "error",
                    events: [],
                    error: error.message || "Events could not be loaded."
                });
            });
        return () => controller.abort();
    }, [reloadKey]);

    // Follow links such as #map?event=12 while the page is open.
    useEffect(() => {
        const onHashChange = () => {
            const id = selectedFromHash();
            if (id) {
                setCopied(false);
                setSelectedId(id);
            }
        };
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);

    const events = useMemo(() => {
        const list = [...result.events];
        if (linkedEvent && !list.some((event) => event.id === linkedEvent.id)) {
            list.push(linkedEvent);
        }
        return list.sort(
            (a, b) => (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0)
        );
    }, [result.events, linkedEvent]);

    const places = useMemo(() => groupByPlace(events), [events]);
    const selected = events.find((event) => event.id === selectedId) || null;
    const selectedPlace = selected
        ? places.find((place) => place.events.includes(selected))
        : null;
    const unplacedCount = events.filter((event) => !event.hasCoordinates).length;

    // Load a linked event that is not upcoming (e.g. already finished).
    useEffect(() => {
        if (result.status !== "ready" || !selectedId) return;
        if (result.events.some((event) => event.id === selectedId)) return;
        if (linkedEvent?.id === selectedId) return;
        const controller = new AbortController();
        getEvent(selectedId, { signal: controller.signal })
            .then(setLinkedEvent)
            .catch(() => {
                if (!controller.signal.aborted) setSelectedId(null);
            });
        return () => controller.abort();
    }, [result, selectedId, linkedEvent]);

    // Create the map once.
    useEffect(() => {
        const map = L.map(containerRef.current, {
            center: CAMPUS_CENTER,
            zoom: START_ZOOM,
            minZoom: 3,
            maxZoom: 19,
            zoomControl: false
        });

        map.attributionControl.setPrefix(false);
        L.control.zoom({ position: "topright" }).addTo(map);

        // MapLibre is large, so it only loads when this page opens.
        let cancelled = false;
        Promise.all([
            import("@maplibre/maplibre-gl-leaflet"),
            import("maplibre-gl"),
            import("maplibre-gl/dist/maplibre-gl-worker.mjs?url"),
            import("maplibre-gl/dist/maplibre-gl.css")
        ]).then(([{ maplibreGL }, maplibre, worker]) => {
            if (cancelled) return;
            // Point MapLibre at its worker file, which bundling moves.
            maplibre.setWorkerUrl(worker.default);
            const basemap = maplibreGL({ style: MAP_STYLE_URL }).addTo(map);
            const glMap = basemap.getMaplibreMap();
            glMap.on("style.load", () => hideBasemapLabels(glMap));
        });
        layerRef.current = L.layerGroup().addTo(map);
        map.on("click", () => setSelectedId(null));
        mapRef.current = map;

        const resizeObserver = new ResizeObserver(() => map.invalidateSize());
        resizeObserver.observe(containerRef.current);

        return () => {
            cancelled = true;
            resizeObserver.disconnect();
            map.remove();
            mapRef.current = null;
            layerRef.current = null;
        };
    }, []);

    // Draw one pin per location.
    useEffect(() => {
        const layer = layerRef.current;
        if (!layer) return;
        layer.clearLayers();

        places.forEach((place) => {
            const isSelected = place === selectedPlace;
            const count = place.events.length;
            const marker = L.marker([place.lat, place.lng], {
                icon: pinIcon(isSelected ? "selected" : "default"),
                title: count > 1 ? `${count} events at ${place.name}` : place.events[0].title,
                alt: `${count > 1 ? `${count} events` : place.events[0].title} at ${place.name}`,
                riseOnHover: true,
                zIndexOffset: isSelected ? 1000 : 0
            });

            marker.bindTooltip(count > 1 ? `${place.name} · ${count}` : place.name, {
                permanent: true,
                direction: "right",
                className: "map-label"
            });

            marker.on("click", () => {
                setCopied(false);
                const next =
                    place.events.find((event) => eventStatus(event) !== "Ended") ||
                    place.events[0];
                setSelectedId(next.id);
            });

            layer.addLayer(marker);
        });
    }, [places, selectedPlace]);

    // Frame all pins once the first results arrive.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || fittedRef.current || result.status !== "ready") return;
        fittedRef.current = true;
        if (places.length && !selectedFromHash()) {
            map.fitBounds(placeBounds(places), FIT_OPTIONS);
        }
    }, [places, result.status]);

    // Keep the chosen pin visible above the bottom sheet.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !selectedPlace) return;
        const sheet = containerRef.current?.parentElement?.querySelector(".map-sheet");
        const sheetSpace = (sheet?.offsetHeight || map.getSize().y * 0.6) + 24;
        if (map.getZoom() < 15) map.setView([selectedPlace.lat, selectedPlace.lng], 16);
        map.panInside([selectedPlace.lat, selectedPlace.lng], {
            paddingTopLeft: [40, 60],
            paddingBottomRight: [40, sheetSpace]
        });
    }, [selectedPlace]);

    const closeDetails = () => {
        setSelectedId(null);
        // Drop ?event= so Back/refresh does not reopen it.
        if (hashParam("event")) window.history.replaceState(null, "", "#map");
    };

    // Escape closes the details sheet.
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key !== "Escape") return;
            setSelectedId(null);
            if (hashParam("event")) window.history.replaceState(null, "", "#map");
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const copyCoordinates = async (event) => {
        try {
            await navigator.clipboard.writeText(
                `${event.lat.toFixed(6)}, ${event.lng.toFixed(6)}`
            );
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    const recenter = () => {
        const map = mapRef.current;
        if (!map) return;
        if (places.length) {
            map.flyToBounds(placeBounds(places), { ...FIT_OPTIONS, duration: 0.6 });
        } else {
            map.flyTo(CAMPUS_CENTER, START_ZOOM, { duration: 0.6 });
        }
    };

    const retry = () => {
        setResult((current) => ({ ...current, status: "loading", error: "" }));
        setReloadKey((key) => key + 1);
    };

    let hint = null;
    if (result.status === "loading") {
        hint = <div className="map-hint" role="status">Loading campus events…</div>;
    } else if (result.status === "error") {
        hint = (
            <div className="map-hint map-hint-error" role="alert">
                <span>Events could not be loaded. {result.error}</span>
                <button type="button" className="map-hint-action" onClick={retry}>
                    Retry
                </button>
            </div>
        );
    } else if (!selected && !places.length) {
        hint = (
            <div className="map-hint" role="status">
                {unplacedCount
                    ? `${unplacedCount} upcoming ${unplacedCount === 1 ? "event has" : "events have"} no map location yet.`
                    : "No upcoming events yet. Check back soon."}
            </div>
        );
    } else if (!selected && unplacedCount) {
        hint = (
            <div className="map-hint" role="status">
                {unplacedCount} {unplacedCount === 1 ? "event isn't" : "events aren't"} on the map
                because {unplacedCount === 1 ? "its" : "their"} location couldn't be found.
            </div>
        );
    }

    const others = selectedPlace
        ? selectedPlace.events.filter((event) => event !== selected)
        : [];

    return (
        <div className="map-page">
            {/* MAP */}
            <div className="map-frame">
                <div
                    className="map-canvas"
                    ref={containerRef}
                    role="application"
                    aria-label="Campus events map"
                />

                <button
                    type="button"
                    className="map-recenter"
                    aria-label="Show all events"
                    title="Show all events"
                    onClick={recenter}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                    </svg>
                </button>

                {hint}

                {/* EVENT DETAILS */}
                {selected && (
                    <section
                        className="map-sheet"
                        aria-label={`${selected.title} details`}>
                        <div className="map-sheet-header">
                            <span className="map-tag">{eventStatus(selected)}</span>
                            <button
                                type="button"
                                className="map-sheet-close"
                                aria-label="Close details"
                                onClick={closeDetails}>
                                ×
                            </button>
                        </div>

                        <div className="map-sheet-body">
                            <h4 className="map-project-title">{selected.title}</h4>
                            <p className="map-project-creator">Hosted by {selected.host}</p>

                            <div className="map-details">
                                <DetailRow icon={icons.pin} label="Location">
                                    <strong>{selected.locationName}</strong>
                                    {selected.address && (
                                        <span className="map-detail-coords">{selected.address}</span>
                                    )}
                                    {selected.hasCoordinates && (
                                        <span className="map-detail-coords">
                                            {formatCoordinates(selected.lat, selected.lng)}
                                        </span>
                                    )}
                                    {selected.approximate && (
                                        <span className="map-detail-note">
                                            Approximate: the exact spot couldn't be found on
                                            OpenStreetMap, so the pin marks the campus.
                                        </span>
                                    )}
                                </DetailRow>

                                <DetailRow icon={icons.date} label="Date">
                                    {formatDate(selected.startsAt)}
                                </DetailRow>

                                <DetailRow icon={icons.time} label="Time">
                                    {formatTimeRange(selected)}
                                </DetailRow>

                                <DetailRow icon={icons.people} label="Attendance">
                                    {selected.goingCount} going · {selected.interestedCount} interested
                                </DetailRow>
                            </div>

                            {selected.description && (
                                <p className="map-description">{selected.description}</p>
                            )}

                            {others.length > 0 && (
                                <div className="map-more">
                                    <span className="map-detail-label">Also at this location</span>
                                    {others.map((event) => (
                                        <button
                                            type="button"
                                            key={event.id}
                                            className="map-more-item"
                                            onClick={() => {
                                                setCopied(false);
                                                setSelectedId(event.id);
                                            }}>
                                            <strong>{event.title}</strong>
                                            <span>
                                                {event.startsAt
                                                    ? `${event.startsAt.toLocaleDateString("en-US", {
                                                          month: "short",
                                                          day: "numeric"
                                                      })} · ${formatTime(event.startsAt)}`
                                                    : "Date to be announced"}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selected.hasCoordinates && (
                                <div className="map-actions">
                                    <button
                                        type="button"
                                        className="map-secondary"
                                        onClick={() => copyCoordinates(selected)}>
                                        {copied ? "Copied!" : "Copy coordinates"}
                                    </button>
                                    <a
                                        className="map-primary"
                                        href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`}
                                        target="_blank"
                                        rel="noreferrer">
                                        Get directions
                                    </a>
                                </div>
                            )}

                            {selected.startsAt && (
                                <a
                                    className="map-calendar-link"
                                    href={`#calendar?date=${dateKey(selected.startsAt)}`}>
                                    See this day in the calendar
                                </a>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

export default MapPage;
