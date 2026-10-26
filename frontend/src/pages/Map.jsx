import { useEffect, useRef, useState } from "react";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import "./Map.css";

const CAMPUS_CENTER = [35.3006, -120.6615];
const START_ZOOM = 16;
const FIT_OPTIONS = {
    paddingTopLeft: [24, 48],
    paddingBottomRight: [150, 24],
    maxZoom: 17
};

function projectBounds(projects) {
    return L.latLngBounds(
        projects.map((project) => [project.lat, project.lng])
    );
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

const TAGS = [
    "Ceramics",
    "Printmaking",
    "Paper Arts",
    "Design",
    "Fabrication",
    "Textiles",
    "Craft",
    "Market"
];

// Sample project markers. Replace with real data when the backend is connected.
const sampleProjects = [
    {
        id: 1,
        title: "Fall Artisan Market",
        creator: "@campusmakers",
        tag: "Market",
        locationName: "Dexter Lawn",
        lat: 35.30036,
        lng: -120.66478,
        date: "2026-10-24",
        time: "11:00",
        description:
            "Handmade goods from student creators. Booths line the lawn from the library side."
    },
    {
        id: 2,
        title: "Zine Making Circle",
        creator: "@campusnotes",
        tag: "Paper Arts",
        locationName: "Kennedy Library",
        lat: 35.30188,
        lng: -120.66392,
        date: "2026-10-27",
        time: "15:00",
        description:
            "Bring scraps, stamps and ideas. Paper, glue and staplers provided on the 2nd floor."
    },
    {
        id: 3,
        title: "Wheel Throwing Basics",
        creator: "@slo_clay",
        tag: "Ceramics",
        locationName: "Art & Design Studio",
        lat: 35.30098,
        lng: -120.66262,
        date: "2026-10-29",
        time: "13:30",
        description:
            "Intro session on centering and pulling walls. Aprons recommended, clay included."
    },
    {
        id: 4,
        title: "Sticker Design Sprint",
        creator: "@jules.illustrates",
        tag: "Design",
        locationName: "University Union Plaza",
        lat: 35.29998,
        lng: -120.65858,
        date: "2026-11-02",
        time: "12:00",
        description:
            "Sketch, vectorize and print a sticker sheet in one hour."
    },
    {
        id: 5,
        title: "Laser Cutter Office Hours",
        creator: "@noah.builds",
        tag: "Fabrication",
        locationName: "Innovation Sandbox",
        lat: 35.30152,
        lng: -120.65792,
        date: "2026-11-05",
        time: "16:30",
        description:
            "Drop in with an SVG and cut it on the spot. Safety walkthrough at the start."
    }
];

function todayISO() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}

function formatDate(iso) {
    if (!iso) return "Date to be announced";
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(
        "en-US",
        {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        }
    );
}

function formatTime(value) {
    if (!value) return "Time to be announced";
    const [hours, minutes] = value.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
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

const emptyForm = () => ({
    title: "",
    creator: "@username",
    locationName: "",
    date: todayISO(),
    time: "12:00",
    tag: TAGS[0],
    description: ""
});

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
    )
};

function MapPage() {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const layerRef = useRef(null);
    const mapClickRef = useRef(() => {});

    const [projects, setProjects] = useState(sampleProjects);
    const [selectedId, setSelectedId] = useState(null);
    const [placing, setPlacing] = useState(false);
    const [draft, setDraft] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [copied, setCopied] = useState(false);

    const selected = projects.find((project) => project.id === selectedId);

    // Keep the latest click behavior available to the Leaflet listener.
    useEffect(() => {
        mapClickRef.current = (latlng) => {
            if (placing || draft) {
                setDraft({ lat: latlng.lat, lng: latlng.lng });
                setPlacing(false);
                setSelectedId(null);
            } else {
                setSelectedId(null);
            }
        };
    });

    // Create the map once.
    useEffect(() => {
        const map = L.map(containerRef.current, {
            center: CAMPUS_CENTER,
            zoom: START_ZOOM,
            minZoom: 14,
            maxZoom: 19,
            zoomControl: false
        });

        map.attributionControl.setPrefix(false);
        L.control.zoom({ position: "topright" }).addTo(map);
        map.fitBounds(projectBounds(sampleProjects), FIT_OPTIONS);

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
        map.on("click", (event) => mapClickRef.current(event.latlng));
        mapRef.current = map;

        const resizeObserver = new ResizeObserver(() =>
            map.invalidateSize()
        );
        resizeObserver.observe(containerRef.current);

        return () => {
            cancelled = true;
            resizeObserver.disconnect();
            map.remove();
            mapRef.current = null;
            layerRef.current = null;
        };
    }, []);

    // Draw project markers and the draft pin.
    useEffect(() => {
        const layer = layerRef.current;
        if (!layer) return;
        layer.clearLayers();

        projects.forEach((project) => {
            const isSelected = project.id === selectedId;
            const marker = L.marker([project.lat, project.lng], {
                icon: pinIcon(isSelected ? "selected" : "default"),
                title: project.title,
                alt: `${project.title} at ${project.locationName}`,
                riseOnHover: true,
                zIndexOffset: isSelected ? 1000 : 0
            });

            marker.bindTooltip(project.locationName, {
                permanent: true,
                direction: "right",
                className: "map-label"
            });

            marker.on("click", () => {
                setDraft(null);
                setPlacing(false);
                setCopied(false);
                setSelectedId(project.id);
            });

            layer.addLayer(marker);
        });

        if (draft) {
            L.marker([draft.lat, draft.lng], {
                icon: pinIcon("draft"),
                interactive: false,
                zIndexOffset: 2000
            }).addTo(layer);
        }
    }, [projects, selectedId, draft]);

    // Keep the chosen pin visible above the bottom sheet.
    useEffect(() => {
        const map = mapRef.current;
        const target = selected || draft;
        if (!map || !target) return;
        const sheet = containerRef.current?.parentElement?.querySelector(".map-sheet");
        const sheetSpace = (sheet?.offsetHeight || map.getSize().y * 0.6) + 24;
        map.panInside([target.lat, target.lng], {
            paddingTopLeft: [40, 60],
            paddingBottomRight: [40, sheetSpace]
        });
    }, [selected, draft]);

    // Escape closes whatever is open.
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key !== "Escape") return;
            setSelectedId(null);
            setPlacing(false);
            setDraft(null);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const startPlacing = () => {
        if (placing || draft) {
            setPlacing(false);
            setDraft(null);
            return;
        }
        setSelectedId(null);
        setForm(emptyForm());
        setPlacing(true);
    };

    const updateForm = (field) => (event) =>
        setForm((current) => ({
            ...current,
            [field]: event.target.value
        }));

    const saveMarker = (event) => {
        event.preventDefault();
        if (!draft || !form.title.trim()) return;

        const project = {
            ...form,
            id: Date.now(),
            title: form.title.trim(),
            creator: form.creator.trim() || "@username",
            locationName: form.locationName.trim() || "Dropped pin",
            description: form.description.trim(),
            lat: draft.lat,
            lng: draft.lng,
            userCreated: true
        };

        setProjects((current) => [...current, project]);
        setDraft(null);
        setCopied(false);
        setSelectedId(project.id);
    };

    const removeMarker = (id) => {
        setProjects((current) =>
            current.filter((project) => project.id !== id)
        );
        setSelectedId(null);
    };

    const copyCoordinates = async (project) => {
        try {
            await navigator.clipboard.writeText(
                `${project.lat.toFixed(6)}, ${project.lng.toFixed(6)}`
            );
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    const recenter = () => {
        const map = mapRef.current;
        if (!map) return;
        if (projects.length) {
            map.flyToBounds(projectBounds(projects), {
                ...FIT_OPTIONS,
                duration: 0.6
            });
        } else {
            map.flyTo(CAMPUS_CENTER, START_ZOOM, { duration: 0.6 });
        }
    };

    return (
        <div className="map-page">
            {/* MAP */}
            <div className={`map-frame${placing || draft ? " map-placing" : ""}`}>
                <div
                    className="map-canvas"
                    ref={containerRef}
                    role="application"
                    aria-label="Campus project map"
                />

                <button
                    type="button"
                    className="map-recenter"
                    aria-label="Show all markers"
                    title="Show all markers"
                    onClick={recenter}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                    </svg>
                </button>

                {placing && (
                    <div className="map-hint" role="status">
                        Tap anywhere on the map to drop a pin
                    </div>
                )}

                {/* NEW MARKER FORM */}
                {draft && (
                    <form
                        className="map-sheet"
                        aria-label="New project marker"
                        onSubmit={saveMarker}>
                        <div className="map-sheet-header">
                            <h4>New marker</h4>
                            <button
                                type="button"
                                className="map-sheet-close"
                                aria-label="Discard marker"
                                onClick={() => setDraft(null)}>
                                ×
                            </button>
                        </div>

                        <div className="map-sheet-body">
                            <div className="map-coords">
                                {icons.pin}
                                <span>
                                    {formatCoordinates(draft.lat, draft.lng)}
                                </span>
                            </div>
                            <p className="map-sheet-note">
                                Tap the map again to move the pin.
                            </p>

                            <label className="map-field">
                                <span>Project title</span>
                                <input
                                    required
                                    value={form.title}
                                    onChange={updateForm("title")}
                                    placeholder="e.g. Open Print Studio"
                                    autoFocus
                                />
                            </label>

                            <label className="map-field">
                                <span>Location name</span>
                                <input
                                    value={form.locationName}
                                    onChange={updateForm("locationName")}
                                    placeholder="e.g. Dexter Lawn, north side"
                                />
                            </label>

                            <div className="map-field-row">
                                <label className="map-field">
                                    <span>Date</span>
                                    <input
                                        type="date"
                                        min={todayISO()}
                                        value={form.date}
                                        onChange={updateForm("date")}
                                    />
                                </label>

                                <label className="map-field">
                                    <span>Time</span>
                                    <input
                                        type="time"
                                        value={form.time}
                                        onChange={updateForm("time")}
                                    />
                                </label>
                            </div>

                            <div className="map-field-row">
                                <label className="map-field">
                                    <span>Category</span>
                                    <select
                                        value={form.tag}
                                        onChange={updateForm("tag")}>
                                        {TAGS.map((tag) => (
                                            <option key={tag}>{tag}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="map-field">
                                    <span>Host</span>
                                    <input
                                        value={form.creator}
                                        onChange={updateForm("creator")}
                                    />
                                </label>
                            </div>

                            <label className="map-field">
                                <span>Details</span>
                                <textarea
                                    rows="3"
                                    value={form.description}
                                    onChange={updateForm("description")}
                                    placeholder="What should people know before they come?"
                                />
                            </label>

                            <div className="map-actions">
                                <button
                                    type="button"
                                    className="map-secondary"
                                    onClick={() => setDraft(null)}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="map-primary"
                                    disabled={!form.title.trim()}>
                                    Save marker
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* MARKER DETAILS */}
                {selected && !draft && (
                    <section
                        className="map-sheet"
                        aria-label={`${selected.title} details`}>
                        <div className="map-sheet-header">
                            <span className="map-tag">{selected.tag}</span>
                            <button
                                type="button"
                                className="map-sheet-close"
                                aria-label="Close details"
                                onClick={() => setSelectedId(null)}>
                                ×
                            </button>
                        </div>

                        <div className="map-sheet-body">
                            <h4 className="map-project-title">
                                {selected.title}
                            </h4>
                            <p className="map-project-creator">
                                Hosted by {selected.creator}
                            </p>

                            <div className="map-details">
                                <DetailRow icon={icons.pin} label="Exact location">
                                    <strong>{selected.locationName}</strong>
                                    <span className="map-detail-coords">
                                        {formatCoordinates(selected.lat, selected.lng)}
                                    </span>
                                </DetailRow>

                                <DetailRow icon={icons.date} label="Date">
                                    {formatDate(selected.date)}
                                </DetailRow>

                                <DetailRow icon={icons.time} label="Time">
                                    {formatTime(selected.time)}
                                </DetailRow>
                            </div>

                            {selected.description && (
                                <p className="map-description">
                                    {selected.description}
                                </p>
                            )}

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

                            {selected.userCreated && (
                                <button
                                    type="button"
                                    className="map-remove"
                                    onClick={() => removeMarker(selected.id)}>
                                    Remove this marker
                                </button>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

export default MapPage;