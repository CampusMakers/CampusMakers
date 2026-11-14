import { strict as assert } from "node:assert";
import { test } from "node:test";
import { formatScheduledTime } from "./dateTime.js";

test("scheduled times use the creator's zone and omit seconds", () => {
    const result = formatScheduledTime("2026-12-02T00:00:37Z", "America/Los_Angeles");
    assert.match(result, /4:00 PM \(PST\)/);
    assert.doesNotMatch(result, /:37/);
});

test("the zone abbreviation follows daylight saving time", () => {
    assert.match(formatScheduledTime("2026-07-01T23:00:00Z", "America/Los_Angeles"), /4:00 PM \(PDT\)/);
});

test("legacy records identify the viewer-zone fallback", () => {
    assert.match(formatScheduledTime("2026-12-02T00:00:00Z", null), /your time zone/);
});
