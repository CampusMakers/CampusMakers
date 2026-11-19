import { useEffect, useMemo, useState } from "react";

import {
    cancelEventRsvp,
    dateKey,
    hashParam,
    isEventHost,
    listEvents,
    rsvpToEvent
} from "../services/eventsApi";
import { requestLogin } from "../services/loginFlow";
import "./Calendar.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_MONTHS_AHEAD = 6;
const VISIBLE_PER_DAY = 3;
const TONES = ["peach", "blue", "lavender", "yellow", "mint", "green"];

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Same host, same colour, so a maker's events are easy to spot.
function toneFor(event) {
    const seed = String(event.host || event.id);
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
        hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    }
    return TONES[hash % TONES.length];
}

function formatClock(date) {
    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

function buildMonthCells(month) {
    const firstWeekday = month.getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

    const cells = Array.from({ length: firstWeekday }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
        cells.push(new Date(month.getFullYear(), month.getMonth(), day));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}

function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// #calendar?date=YYYY-MM-DD (e.g. from the map) opens that day.
function linkedDay(today) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(hashParam("date") || "");
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (Number.isNaN(date.getTime()) || date < today) return null;
    const offset =
        (date.getFullYear() - today.getFullYear()) * 12 +
        date.getMonth() -
        today.getMonth();
    if (offset < 0 || offset > MAX_MONTHS_AHEAD) return null;
    return { offset, key: dateKey(date) };
}

function CalendarPage({ user }) {
    const [today] = useState(() => startOfDay(new Date()));
    const [monthOffset, setMonthOffset] = useState(() => linkedDay(today)?.offset ?? 0);
    const [selectedKey, setSelectedKey] = useState(
        () => linkedDay(today)?.key ?? dateKey(today)
    );
    const [reloadKey, setReloadKey] = useState(0);
    const [result, setResult] = useState({ key: null, status: "loading", events: [], error: "" });
    const [pendingId, setPendingId] = useState(null);
    const [actionError, setActionError] = useState("");

    useEffect(() => {
        const onHashChange = () => {
            const linked = linkedDay(today);
            if (!linked) return;
            setMonthOffset(linked.offset);
            setSelectedKey(linked.key);
        };
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, [today]);

    const viewMonth = useMemo(
        () => new Date(today.getFullYear(), today.getMonth() + monthOffset, 1),
        [today, monthOffset]
    );
    const cells = useMemo(() => buildMonthCells(viewMonth), [viewMonth]);

    // Load the visible month's events. RSVP state depends on who is signed in.
    const fetchKey = `${dateKey(viewMonth)}|${user?.id ?? "guest"}|${reloadKey}`;
    const loading = result.key !== fetchKey;
    useEffect(() => {
        const controller = new AbortController();
        const from = monthOffset === 0 ? today : viewMonth;
        const to = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
        listEvents({ when: "all", from, to, signal: controller.signal })
            .then((events) =>
                setResult({ key: fetchKey, status: "ready", events, error: "" })
            )
            .catch((error) => {
                if (controller.signal.aborted) return;
                setResult({
                    key: fetchKey,
                    status: "error",
                    events: [],
                    error: error.message || "Events could not be loaded."
                });
            });
        return () => controller.abort();
    }, [fetchKey, monthOffset, today, viewMonth]);

    const eventsByDay = useMemo(() => {
        const byDay = {};
        cells.forEach((date) => {
            if (date && date >= today) byDay[dateKey(date)] = [];
        });
        if (loading) return byDay;

        result.events.forEach((event) => {
            if (!event.startsAt) return;
            // Events that began earlier but are still running show on today.
            const day = event.startsAt < today ? today : startOfDay(event.startsAt);
            const key = dateKey(day);
            if (!byDay[key]) return;
            byDay[key].push({
                ...event,
                tone: toneFor(event),
                time: formatClock(event.startsAt)
            });
        });

        Object.values(byDay).forEach((list) =>
            list.sort((a, b) => a.startsAt - b.startsAt)
        );
        return byDay;
    }, [cells, today, result.events, loading]);

    const selectedDate = cells.find((date) => date && dateKey(date) === selectedKey);
    const selectedEvents = selectedDate ? eventsByDay[selectedKey] || [] : [];

    const changeMonth = (step) => {
        const next = Math.min(MAX_MONTHS_AHEAD, Math.max(0, monthOffset + step));
        setMonthOffset(next);
        setSelectedKey(next === 0 ? dateKey(today) : null);
        setActionError("");
    };

    const selectDay = (date) => {
        setSelectedKey(dateKey(date));
        setActionError("");
        requestAnimationFrame(() => {
            document.getElementById("calendar-day-panel")?.scrollIntoView({
                behavior: prefersReducedMotion() ? "auto" : "smooth",
                block: "nearest"
            });
        });
    };

    const updateEvent = (id, change) =>
        setResult((current) => ({
            ...current,
            events: current.events.map((event) =>
                event.id === id ? { ...event, ...change(event) } : event
            )
        }));

    const toggleRsvp = async (event) => {
        if (!user?.id) {
            requestLogin("join this event");
            return;
        }
        const going = event.myRsvp === "going";
        const previous = {
            myRsvp: event.myRsvp,
            goingCount: event.goingCount,
            interestedCount: event.interestedCount
        };
        setPendingId(event.id);
        setActionError("");
        // Show the change straight away; undo it if the request fails.
        updateEvent(event.id, (current) => ({
            myRsvp: going ? null : "going",
            goingCount: current.goingCount + (going ? -1 : 1),
            interestedCount:
                current.interestedCount - (current.myRsvp === "interested" ? 1 : 0)
        }));
        try {
            if (going) await cancelEventRsvp(event.id);
            else await rsvpToEvent(event.id, "going");
        } catch (error) {
            updateEvent(event.id, () => previous);
            setActionError(
                `${going ? "Leaving" : "Joining"} "${event.title}" failed: ${error.message}`
            );
        } finally {
            setPendingId(null);
        }
    };

    const monthLabel = viewMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
    });

    return (
        <div className="calendar-page">
            {/* MONTH NAVIGATION */}
            <div className="calendar-month-bar">
                <button
                    type="button"
                    className="calendar-arrow"
                    aria-label="Previous month"
                    disabled={monthOffset === 0}
                    onClick={() => changeMonth(-1)}>
                    &#10094;
                </button>

                <h2 className="calendar-month-title" aria-live="polite">
                    {monthLabel}
                </h2>

                <button
                    type="button"
                    className="calendar-arrow"
                    aria-label="Next month"
                    disabled={monthOffset === MAX_MONTHS_AHEAD}
                    onClick={() => changeMonth(1)}>
                    &#10095;
                </button>
            </div>

            {/* MONTH GRID */}
            <div className="calendar-grid-panel" aria-busy={loading}>
                <div className="calendar-weekdays" aria-hidden="true">
                    {WEEKDAYS.map((weekday) => (
                        <span key={weekday}>{weekday}</span>
                    ))}
                </div>

                <div className="calendar-grid" role="group" aria-label={monthLabel}>
                    {cells.map((date, index) => {
                        if (!date) {
                            return (
                                <span
                                    className="calendar-day calendar-day-empty"
                                    key={`empty-${index}`}
                                    aria-hidden="true"
                                />
                            );
                        }

                        const key = dateKey(date);
                        const isPast = date < today;
                        const isToday = key === dateKey(today);
                        const events = eventsByDay[key] || [];
                        const extra = events.length - VISIBLE_PER_DAY;
                        const fullLabel = date.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric"
                        });

                        return (
                            <button
                                type="button"
                                key={key}
                                className={`calendar-day${isToday ? " calendar-day-today" : ""}`}
                                disabled={isPast}
                                aria-pressed={selectedKey === key}
                                aria-label={
                                    isPast || loading
                                        ? fullLabel
                                        : `${fullLabel}, ${events.length} ${events.length === 1 ? "event" : "events"}`
                                }
                                onClick={() => selectDay(date)}>
                                <span className="calendar-day-number">{date.getDate()}</span>

                                {!isPast && (
                                    <span className="calendar-day-events" aria-hidden="true">
                                        {events.slice(0, VISIBLE_PER_DAY).map((event) => (
                                            <span
                                                className={`calendar-chip ${event.tone}`}
                                                key={event.id}>
                                                {event.title}
                                            </span>
                                        ))}
                                        {extra > 0 && (
                                            <span className="calendar-more">+{extra} more</span>
                                        )}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* SELECTED DAY EVENTS */}
            <section className="calendar-day-panel" id="calendar-day-panel" aria-live="polite">
                {result.status === "error" && !loading ? (
                    <div className="calendar-empty calendar-error" role="alert">
                        <p>Events could not be loaded. {result.error}</p>
                        <button
                            type="button"
                            className="calendar-retry"
                            onClick={() => setReloadKey((key) => key + 1)}>
                            Try again
                        </button>
                    </div>
                ) : selectedDate ? (
                    <>
                        <div className="calendar-panel-heading">
                            <h3>
                                {selectedDate.toLocaleDateString("en-US", {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric"
                                })}
                            </h3>

                            {!loading && (
                                <span className="calendar-count">
                                    {selectedEvents.length}{" "}
                                    {selectedEvents.length === 1 ? "event" : "events"}
                                </span>
                            )}
                        </div>

                        {actionError && (
                            <p className="calendar-action-error" role="alert">
                                {actionError}
                            </p>
                        )}

                        {loading ? (
                            <p className="calendar-empty">Loading events…</p>
                        ) : selectedEvents.length ? (
                            <div
                                className="calendar-project-list"
                                key={selectedKey}
                                tabIndex="0"
                                aria-label="Events on this day">
                                {selectedEvents.map((event) => {
                                    const [clock, period] = event.time.split(" ");
                                    const hosting = isEventHost(event, user);
                                    const going = event.myRsvp === "going";
                                    return (
                                        <article className="calendar-project-card" key={event.id}>
                                            <div className={`calendar-project-time ${event.tone}`}>
                                                <strong>{clock}</strong>
                                                <span>{period}</span>
                                            </div>

                                            <div className="calendar-project-info">
                                                <h4>{event.title}</h4>
                                                <p className="calendar-project-creator">{event.host}</p>
                                                <p className="calendar-project-location">
                                                    <svg
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        aria-hidden="true">
                                                        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                                                        <circle cx="12" cy="10" r="2.5" />
                                                    </svg>
                                                    {event.locationName}
                                                </p>

                                                <p className="calendar-project-items">
                                                    {event.endsAt
                                                        ? `Until ${formatClock(event.endsAt)} · `
                                                        : ""}
                                                    {event.goingCount} going
                                                    {event.interestedCount
                                                        ? ` · ${event.interestedCount} interested`
                                                        : ""}
                                                </p>

                                                <div className="calendar-event-actions">
                                                    {event.hasCoordinates && (
                                                        <button
                                                            type="button"
                                                            className="calendar-event-view"
                                                            onClick={() => {
                                                                window.location.hash = `map?event=${event.id}`;
                                                            }}>
                                                            View on map
                                                        </button>
                                                    )}

                                                    {hosting ? (
                                                        <span className="calendar-event-host-label">
                                                            Hosted by you
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="calendar-event-join"
                                                            disabled={pendingId === event.id}
                                                            aria-pressed={going}
                                                            onClick={() => toggleRsvp(event)}>
                                                            {going ? "Leave event" : "Join event"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="calendar-empty">No events are scheduled for this day yet.</p>
                        )}
                    </>
                ) : (
                    <p className="calendar-empty">Tap a day to see the events on it.</p>
                )}
            </section>
        </div>
    );
}

export default CalendarPage;
