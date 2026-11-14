import { useMemo, useState } from "react";

import "./Calendar.css";

const WEEKDAYS = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
];
const MAX_MONTHS_AHEAD = 6;
const VISIBLE_PER_DAY = 3;

const TIME_SLOTS = [
    "9:00 AM",
    "10:30 AM",
    "12:00 PM",
    "1:30 PM",
    "3:00 PM",
    "4:30 PM",
    "6:00 PM",
    "7:30 PM"
];

// Sample projects used to fill the calendar.
// Replace with real project data when the backend is connected.
const projectPool = [
    {
        title: "Wheel Throwing Basics",
        short: "Wheel",
        creator: "@slo_clay",
        tag: "Ceramics",
        tone: "peach",
        location: "Art & Design Studio 102",
        items: 10
    },
    {
        title: "Open Print Studio",
        short: "Prints",
        creator: "@flora.studio",
        tag: "Printmaking",
        tone: "blue",
        location: "Dexter Building 34",
        items: 14
    },
    {
        title: "Zine Making Circle",
        short: "Zines",
        creator: "@campusnotes",
        tag: "Paper Arts",
        tone: "lavender",
        location: "Kennedy Library, 2nd Floor",
        items: 16
    },
    {
        title: "Sticker Design Sprint",
        short: "Stickers",
        creator: "@jules.illustrates",
        tag: "Design",
        tone: "yellow",
        location: "University Union Plaza",
        items: 20
    },
    {
        title: "Laser Cutter Office Hours",
        short: "Laser",
        creator: "@noah.builds",
        tag: "Fabrication",
        tone: "mint",
        location: "Innovation Sandbox",
        items: 6
    },
    {
        title: "Crochet & Chill",
        short: "Crochet",
        creator: "@maya.makes",
        tag: "Textiles",
        tone: "peach",
        location: "Dexter Lawn",
        items: 18
    },
    {
        title: "Candle Pouring Night",
        short: "Candles",
        creator: "@themakersclub",
        tag: "Craft",
        tone: "yellow",
        location: "Student Life Center",
        items: 12
    },
    {
        title: "Bookbinding Workshop",
        short: "Binding",
        creator: "@campusmakers",
        tag: "Paper Arts",
        tone: "lavender",
        location: "Kennedy Library, Room 202",
        items: 10
    },
    {
        title: "Pop-Up Maker Market",
        short: "Market",
        creator: "@campusmakers",
        tag: "Market",
        tone: "green",
        location: "Dexter Lawn",
        items: 40
    },
    {
        title: "Wire Wrapped Jewelry",
        short: "Jewelry",
        creator: "@leo_ceramics",
        tag: "Craft",
        tone: "yellow",
        location: "Art & Design Studio 104",
        items: 8
    },
    {
        title: "Watercolor on the Lawn",
        short: "Paint",
        creator: "@maya.makes",
        tag: "Art",
        tone: "blue",
        location: "Dexter Lawn",
        items: 15
    },
    {
        title: "Woodshop Safety Session",
        short: "Wood",
        creator: "@devwithlee",
        tag: "Fabrication",
        tone: "mint",
        location: "Engineering West, Shop 21",
        items: 8
    }
];

function dateKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

// Small seeded generator so each day always shows the same sample projects.
function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state += 0x6d2b79f5;
        let value = Math.imul(
            state ^ (state >>> 15),
            1 | state
        );
        value ^=
            value +
            Math.imul(value ^ (value >>> 7), 61 | value);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function sampleProjectsForDay(date) {
    const random = seededRandom(
        date.getFullYear() * 10000 +
            (date.getMonth() + 1) * 100 +
            date.getDate()
    );
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const roll = random();

    let count;
    if (roll < (weekend ? 0.1 : 0.2)) count = 0;
    else if (roll < 0.45) count = 1 + Math.floor(random() * 2);
    else if (roll < 0.75) count = 3;
    else count = 4 + Math.floor(random() * (weekend ? 4 : 3));

    const projects = [...projectPool]
        .map((project) => ({ project, order: random() }))
        .sort((a, b) => a.order - b.order)
        .slice(0, count)
        .map(({ project }) => project);

    const slots = TIME_SLOTS.map((time, index) => ({
        time,
        index,
        order: random()
    }))
        .sort((a, b) => a.order - b.order)
        .slice(0, count)
        .sort((a, b) => a.index - b.index);

    return projects.map((project, index) => ({
        ...project,
        id: `${dateKey(date)}-${index}`,
        time: slots[index].time,
        itemsLeft: 1 + Math.floor(random() * project.items)
    }));
}

function buildMonthCells(month) {
    const firstWeekday = month.getDay();
    const daysInMonth = new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        0
    ).getDate();

    const cells = Array.from(
        { length: firstWeekday },
        () => null
    );
    for (let day = 1; day <= daysInMonth; day += 1) {
        cells.push(
            new Date(month.getFullYear(), month.getMonth(), day)
        );
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}

function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches;
}

function CalendarPage({
    events = [],
    user,
    joinedEventIds = [],
    onJoinEvent,
    onLeaveEvent,
    onOpenEvent
}) {
    const [today] = useState(() => {
        const now = new Date();
        return new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );
    });
    const [monthOffset, setMonthOffset] = useState(0);
    const [selectedKey, setSelectedKey] = useState(() =>
        dateKey(today)
    );

    const viewMonth = useMemo(
        () =>
            new Date(
                today.getFullYear(),
                today.getMonth() + monthOffset,
                1
            ),
        [today, monthOffset]
    );

    const cells = useMemo(
        () => buildMonthCells(viewMonth),
        [viewMonth]
    );

    const projectsByDay = useMemo(() => {
        const byDay = {};

        // Keep the existing sample calendar projects.
        cells.forEach((date) => {
            if (date && date >= today) {
                byDay[dateKey(date)] =
                    sampleProjectsForDay(date);
            }
        });

        // Add real events created by Campus Makers sellers.
        events.forEach((event) => {
            if (!event.is_event || !event.event_starts_at) {
                return;
            }

            const startDate = new Date(event.event_starts_at);

            if (Number.isNaN(startDate.getTime())) {
                return;
            }

            const key = dateKey(startDate);

            // Only include events within the displayed dates.
            if (!byDay[key]) {
                return;
            }

            const time = startDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            });

            byDay[key].push({
                id: `calendar-event-${event.id}`,
                postId: event.id,
                sellerId: event.seller_id,
                isRealEvent: true,
                title: event.event_title || "Campus Event",
                short: "Event",
                creator: event.creator || "@campusmaker",
                tag: "Event",
                tone: "peach",
                location:
                    event.event_location || "Location TBD",
                time,
                itemsLeft: 0
            });
        });

        return byDay;
    }, [cells, today, events]);

    const selectedDate = cells.find(
        (date) => date && dateKey(date) === selectedKey
    );
    const selectedProjects = selectedDate
        ? projectsByDay[selectedKey] || []
        : [];

    const changeMonth = (step) => {
        const next = Math.min(
            MAX_MONTHS_AHEAD,
            Math.max(0, monthOffset + step)
        );
        setMonthOffset(next);
        setSelectedKey(next === 0 ? dateKey(today) : null);
    };

    const selectDay = (date) => {
        setSelectedKey(dateKey(date));
        requestAnimationFrame(() => {
            document
                .getElementById("calendar-day-panel")
                ?.scrollIntoView({
                    behavior: prefersReducedMotion()
                        ? "auto"
                        : "smooth",
                    block: "nearest"
                });
        });
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

                <h2
                    className="calendar-month-title"
                    aria-live="polite">
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
            <div className="calendar-grid-panel">
                <div
                    className="calendar-weekdays"
                    aria-hidden="true">
                    {WEEKDAYS.map((weekday) => (
                        <span key={weekday}>{weekday}</span>
                    ))}
                </div>

                <div
                    className="calendar-grid"
                    role="group"
                    aria-label={monthLabel}>
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
                        const projects =
                            projectsByDay[key] || [];
                        const extra =
                            projects.length - VISIBLE_PER_DAY;
                        const fullLabel =
                            date.toLocaleDateString("en-US", {
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
                                aria-pressed={
                                    selectedKey === key
                                }
                                aria-label={
                                    isPast
                                        ? fullLabel
                                        : `${fullLabel}, ${projects.length} ${projects.length === 1 ? "project" : "projects"}`
                                }
                                onClick={() => selectDay(date)}>
                                <span className="calendar-day-number">
                                    {date.getDate()}
                                </span>

                                {!isPast && (
                                    <span
                                        className="calendar-day-events"
                                        aria-hidden="true">
                                        {projects
                                            .slice(
                                                0,
                                                VISIBLE_PER_DAY
                                            )
                                            .map((project) => (
                                                <span
                                                    className={`calendar-chip ${project.tone}`}
                                                    key={
                                                        project.id
                                                    }>
                                                    {
                                                        project.short
                                                    }
                                                </span>
                                            ))}
                                        {extra > 0 && (
                                            <span className="calendar-more">
                                                +{extra} more
                                            </span>
                                        )}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* SELECTED DAY PROJECTS */}
            <section
                className="calendar-day-panel"
                id="calendar-day-panel"
                aria-live="polite">
                {selectedDate ? (
                    <>
                        <div className="calendar-panel-heading">
                            <h3>
                                {selectedDate.toLocaleDateString(
                                    "en-US",
                                    {
                                        weekday: "long",
                                        month: "long",
                                        day: "numeric"
                                    }
                                )}
                            </h3>

                            <span className="calendar-count">
                                {selectedProjects.length}{" "}
                                {selectedProjects.length === 1
                                    ? "project"
                                    : "projects"}
                            </span>
                        </div>

                        {selectedProjects.length ? (
                            <div
                                className="calendar-project-list"
                                key={selectedKey}
                                tabIndex="0"
                                aria-label="Available projects">
                                {selectedProjects.map(
                                    (project) => {
                                        const [clock, period] =
                                            project.time.split(
                                                " "
                                            );
                                        return (
                                            <article
                                                className="calendar-project-card"
                                                key={
                                                    project.id
                                                }>
                                                <div
                                                    className={`calendar-project-time ${project.tone}`}>
                                                    <strong>
                                                        {clock}
                                                    </strong>
                                                    <span>
                                                        {period}
                                                    </span>
                                                </div>

                                                <div className="calendar-project-info">
                                                    <h4>
                                                        {
                                                            project.title
                                                        }
                                                    </h4>
                                                    <p className="calendar-project-creator">
                                                        {
                                                            project.creator
                                                        }
                                                    </p>
                                                    <p className="calendar-project-location">
                                                        <svg
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            aria-hidden="true">
                                                            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                                                            <circle
                                                                cx="12"
                                                                cy="10"
                                                                r="2.5"
                                                            />
                                                        </svg>
                                                        {
                                                            project.location
                                                        }
                                                    </p>

                                                    <p className="calendar-project-items">
                                                        {project.isRealEvent
                                                            ? "Campus Makers Event"
                                                            : `${project.itemsLeft} ${
                                                                  project.itemsLeft ===
                                                                  1
                                                                      ? "item"
                                                                      : "items"
                                                              } left`}
                                                    </p>

                                                    {project.isRealEvent && (
                                                        <div className="calendar-event-actions">
                                                            <button
                                                                type="button"
                                                                className="calendar-event-view"
                                                                onClick={() =>
                                                                    onOpenEvent?.(
                                                                        project.postId
                                                                    )
                                                                }>
                                                                View
                                                                Event
                                                            </button>

                                                            {user?.id &&
                                                            project.sellerId ===
                                                                user.id ? (
                                                                <span className="calendar-event-host-label">
                                                                    Hosted
                                                                    by
                                                                    you
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    className="calendar-event-join"
                                                                    onClick={() => {
                                                                        if (
                                                                            joinedEventIds.includes(
                                                                                project.postId
                                                                            )
                                                                        ) {
                                                                            onLeaveEvent?.(
                                                                                project.postId
                                                                            );
                                                                        } else {
                                                                            onJoinEvent?.(
                                                                                project.postId
                                                                            );
                                                                        }
                                                                    }}>
                                                                    {joinedEventIds.includes(
                                                                        project.postId
                                                                    )
                                                                        ? "Leave Event"
                                                                        : "Join Event"}
                                                                </button>
                                                            )}

                                                            <p className="calendar-project-items">
                                                                Registration
                                                                preview
                                                                only
                                                                —
                                                                no
                                                                RSVP
                                                                is
                                                                submitted.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    }
                                )}
                            </div>
                        ) : (
                            <p className="calendar-empty">
                                No projects are scheduled for
                                this day yet.
                            </p>
                        )}
                    </>
                ) : (
                    <p className="calendar-empty">
                        Tap a day to see the projects available
                        on it.
                    </p>
                )}
            </section>
        </div>
    );
}

export default CalendarPage;
