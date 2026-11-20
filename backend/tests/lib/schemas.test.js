import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { id, idParam, money, pagination, paymentMethod, timestamp, username } from "../../src/lib/schemas.js";

describe("id", () => {
    it("coerces positive integers", () => assert.equal(id.parse("12"), 12));
    it("rejects zero, negatives and fractions", () => {
        for (const value of ["0", "-1", "1.5", "abc"]) assert.equal(id.safeParse(value).success, false);
    });
    it("idParam wraps id", () => assert.deepEqual(idParam.parse({ id: "3" }), { id: 3 }));
});

describe("pagination", () => {
    const schema = z.object(pagination);
    it("applies defaults", () => assert.deepEqual(schema.parse({}), { limit: 20, offset: 0 }));
    it("coerces strings", () => assert.deepEqual(schema.parse({ limit: "5", offset: "10" }), { limit: 5, offset: 10 }));
    it("enforces bounds", () => {
        assert.equal(schema.safeParse({ limit: 0 }).success, false);
        assert.equal(schema.safeParse({ limit: 101 }).success, false);
        assert.equal(schema.safeParse({ offset: -1 }).success, false);
    });
});

describe("paymentMethod", () => {
    it("accepts known methods", () => assert.equal(paymentMethod.parse("venmo"), "venmo"));
    it("rejects unknown methods", () => assert.equal(paymentMethod.safeParse("bitcoin").success, false));
});

describe("username", () => {
    it("strips a leading @ and lowercases", () => assert.equal(username.parse("  @Jane.Doe_1 "), "jane.doe_1"));
    it("rejects too short, too long and invalid characters", () => {
        for (const value of ["ab", "a".repeat(31), "bad-name", "has space"]) {
            assert.equal(username.safeParse(value).success, false, value);
        }
    });
});

describe("money", () => {
    it("accepts cents", () => assert.equal(money.parse("12.34"), 12.34));
    it("rejects negatives and sub-cent values", () => {
        assert.equal(money.safeParse(-1).success, false);
        assert.equal(money.safeParse(1.234).success, false);
    });
});

describe("timestamp", () => {
    it("accepts ISO datetimes with offsets", () => {
        assert.equal(timestamp.safeParse("2026-01-01T10:00:00Z").success, true);
        assert.equal(timestamp.safeParse("2026-01-01T10:00:00+02:00").success, true);
    });
    it("rejects other strings", () => assert.equal(timestamp.safeParse("tomorrow").success, false));
});
