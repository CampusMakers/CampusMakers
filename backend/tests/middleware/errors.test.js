import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { APIError } from "better-auth/api";
import multer from "multer";
import { errorHandler, notFoundHandler } from "../../src/middleware/errors.js";
import { HttpError } from "../../src/lib/httpError.js";

const fakeRes = (headersSent = false) => {
    const res = { headersSent, statusCode: null, body: null };
    res.status = (code) => ((res.statusCode = code), res);
    res.json = (body) => ((res.body = body), res);
    return res;
};

const handle = (error) => {
    const res = fakeRes();
    errorHandler(error, {}, res, () => {});
    return res;
};

describe("notFoundHandler", () => {
    it("reports the method and path", () => {
        const res = fakeRes();
        notFoundHandler({ method: "GET", path: "/nope" }, res);
        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { error: { message: "No route for GET /nope" } });
    });
});

describe("errorHandler", () => {
    it("delegates when headers are already sent", () => {
        const error = new Error("x");
        let passed;
        errorHandler(error, {}, fakeRes(true), (e) => (passed = e));
        assert.equal(passed, error);
    });

    it("maps HttpError", () => {
        const res = handle(new HttpError(422, "bad", ["d"]));
        assert.equal(res.statusCode, 422);
        assert.deepEqual(res.body, { error: { message: "bad", details: ["d"] } });
    });

    it("maps Better Auth APIError", () => {
        const res = handle(new APIError("UNAUTHORIZED", { message: "Invalid", code: "INVALID" }));
        assert.equal(res.statusCode, 401);
        assert.deepEqual(res.body, { error: { message: "Invalid", code: "INVALID" } });
    });

    it("maps multer errors to 400", () => {
        const res = handle(new multer.MulterError("LIMIT_FILE_SIZE"));
        assert.equal(res.statusCode, 400);
        assert.match(res.body.error.message, /too large/i);
    });

    it("maps JSON parse failures to 400", () => {
        const res = handle({ type: "entity.parse.failed" });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.error.message, "Request body is not valid JSON");
    });

    it("maps known Postgres codes and includes details outside production", () => {
        const cases = { 23505: 409, 23503: 409, 23514: 400, 23502: 400, "22P02": 400 };
        for (const [code, status] of Object.entries(cases)) {
            const res = handle({ code, detail: "why" });
            assert.equal(res.statusCode, status, code);
            assert.equal(res.body.error.details, "why");
        }
    });

    it("hides unknown errors behind a 500", (t) => {
        t.mock.method(console, "error", () => {});
        const res = handle(new Error("secret"));
        assert.equal(res.statusCode, 500);
        assert.deepEqual(res.body, { error: { message: "Internal server error" } });
        assert.equal(console.error.mock.callCount(), 1);
    });
});
