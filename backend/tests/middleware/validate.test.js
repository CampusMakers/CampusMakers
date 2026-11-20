import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import validate from "../../src/middleware/validate.js";
import { HttpError } from "../../src/lib/httpError.js";

describe("validate middleware", () => {
    it("stores parsed parts on req.data and calls next", () => {
        const req = { params: { id: "4" }, body: { name: "x" } };
        let called = false;
        validate({ params: z.object({ id: z.coerce.number() }), body: z.object({ name: z.string() }) })(
            req,
            {},
            () => (called = true)
        );
        assert.equal(called, true);
        assert.deepEqual(req.data, { params: { id: 4 }, body: { name: "x" } });
    });

    it("treats a missing part as an empty object", () => {
        const req = {};
        validate({ query: z.object({ q: z.string().default("all") }) })(req, {}, () => {});
        assert.deepEqual(req.data.query, { q: "all" });
    });

    it("throws a 400 with issue details", () => {
        const req = { body: { nested: { n: "x" } } };
        assert.throws(
            () => validate({ body: z.object({ nested: z.object({ n: z.number() }) }) })(req, {}, () => {}),
            (error) => {
                assert.ok(error instanceof HttpError);
                assert.equal(error.status, 400);
                assert.equal(error.message, "Validation failed");
                assert.equal(error.details[0].location, "body");
                assert.equal(error.details[0].path, "nested.n");
                assert.equal(typeof error.details[0].message, "string");
                return true;
            }
        );
    });
});
