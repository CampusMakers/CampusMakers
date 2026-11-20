import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { campusInput, upsertCampus } from "../../src/lib/campuses.js";

describe("campusInput", () => {
    it("trims and lowercases the domain", () => {
        assert.deepEqual(campusInput.parse({ name: " State U ", domain: " Mail.StateU.EDU " }), {
            name: "State U",
            domain: "mail.stateu.edu"
        });
    });
    it("rejects invalid domains and short names", () => {
        assert.equal(campusInput.safeParse({ name: "State U", domain: "localhost" }).success, false);
        assert.equal(campusInput.safeParse({ name: "S", domain: "s.edu" }).success, false);
    });
    it("allows a null state", () => {
        assert.equal(campusInput.parse({ name: "State U", domain: "s.edu", state: null }).state, null);
    });
});

describe("upsertCampus", () => {
    it("sends values in order and returns the first row", async () => {
        const calls = [];
        const db = {
            query: async (sql, values) => {
                calls.push({ sql, values });
                return { rows: [{ id: 1, name: "State U" }] };
            }
        };
        const row = await upsertCampus(db, { name: "State U", domain: "s.edu" });
        assert.deepEqual(row, { id: 1, name: "State U" });
        assert.deepEqual(calls[0].values, ["State U", "s.edu", null]);
        assert.match(calls[0].sql, /on conflict \(email_domain\)/);
    });
});
