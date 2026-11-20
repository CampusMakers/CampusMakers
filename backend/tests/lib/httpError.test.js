import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HttpError, badRequest, conflict, forbidden, notFound, unauthorized } from "../../src/lib/httpError.js";

describe("HttpError", () => {
    it("stores status, message and details", () => {
        const error = new HttpError(418, "teapot", { a: 1 });
        assert.ok(error instanceof Error);
        assert.equal(error.status, 418);
        assert.equal(error.message, "teapot");
        assert.deepEqual(error.details, { a: 1 });
    });

    it("helpers build errors with the right status and default messages", () => {
        assert.deepEqual([badRequest("bad", ["x"]).status, badRequest("bad", ["x"]).details], [400, ["x"]]);
        assert.equal(unauthorized().status, 401);
        assert.equal(unauthorized().message, "Authentication required");
        assert.equal(forbidden().status, 403);
        assert.equal(forbidden().message, "You do not have access to this resource");
        assert.equal(notFound().status, 404);
        assert.equal(notFound().message, "Resource not found");
        assert.equal(conflict("dup").status, 409);
        assert.equal(conflict("dup").message, "dup");
    });

    it("helpers accept custom messages", () => {
        assert.equal(unauthorized("nope").message, "nope");
        assert.equal(forbidden("no").message, "no");
        assert.equal(notFound("gone").message, "gone");
    });
});
