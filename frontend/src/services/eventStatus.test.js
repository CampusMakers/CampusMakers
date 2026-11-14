import { strict as assert } from "node:assert";
import { test } from "node:test";
import { eventStatusAt } from "./eventStatus.js";

test("automatic event status changes at the start and end boundaries", () => {
    const event = { event_status: "Upcoming", event_status_mode: "automatic", event_starts_at: "2026-12-01T10:00:00Z", event_ends_at: "2026-12-01T11:00:00Z" };
    assert.equal(eventStatusAt(event, Date.parse("2026-12-01T09:59:59Z")), "Upcoming");
    assert.equal(eventStatusAt(event, Date.parse("2026-12-01T10:00:00Z")), "In Progress");
    assert.equal(eventStatusAt(event, Date.parse("2026-12-01T11:00:00Z")), "Event Ended");
});

test("manual status stays as selected and finished status stays finished", () => {
    const time = Date.parse("2026-12-01T12:00:00Z");
    assert.equal(eventStatusAt({ event_status_mode: "manual", event_status: "In Progress", event_ends_at: "2026-12-01T11:00:00Z" }, time), "In Progress");
    assert.equal(eventStatusAt({ event_status_mode: "automatic", event_status: "Event Ended", event_starts_at: "2026-12-02T11:00:00Z" }, time), "Event Ended");
    assert.equal(eventStatusAt({}, time), "Upcoming");
});
