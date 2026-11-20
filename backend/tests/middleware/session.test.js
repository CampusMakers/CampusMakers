import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

let session = null;
let row = null;
const oneCalls = [];

mock.module("../../src/auth.js", {
    namedExports: { auth: { api: { getSession: async ({ headers }) => (session ? { ...session, headers } : null) } } }
});
mock.module("../../src/db/pool.js", {
    namedExports: {
        one: async (sql, values) => {
            oneCalls.push({ sql, values });
            return row;
        }
    }
});

const { loadSession, requireAdmin, requireAuth, requireSeller } = await import("../../src/middleware/session.js");

const status = (fn) => async () => {
    try {
        await fn();
    } catch (error) {
        return error.status;
    }
    return "ok";
};

beforeEach(() => {
    session = null;
    row = null;
    oneCalls.length = 0;
});

describe("loadSession", () => {
    it("sets user and session from Better Auth", async () => {
        session = { user: { id: "u1" }, session: { id: "s1" } };
        const req = { headers: { cookie: "a=b" } };
        let called = false;
        await loadSession(req, {}, () => (called = true));
        assert.deepEqual([req.user, req.session, called], [{ id: "u1" }, { id: "s1" }, true]);
    });

    it("sets nulls when signed out", async () => {
        const req = { headers: {} };
        await loadSession(req, {}, () => {});
        assert.deepEqual([req.user, req.session], [null, null]);
    });
});

describe("requireAuth", () => {
    it("rejects anonymous requests and passes signed-in ones", async () => {
        assert.equal(await status(() => requireAuth({}, {}, () => {}))(), 401);
        assert.equal(await status(() => requireAuth({ user: { id: "u" } }, {}, () => {}))(), "ok");
    });
});

describe("requireAdmin", () => {
    it("requires a user", async () => {
        assert.equal(await status(() => requireAdmin({}, {}, () => {}))(), 401);
    });
    it("rejects non-admins", async () => {
        row = { role: "user" };
        assert.equal(await status(() => requireAdmin({ user: { id: "u" } }, {}, () => {}))(), 403);
        assert.deepEqual(oneCalls[0].values, ["u"]);
    });
    it("allows admins", async () => {
        row = { role: "admin" };
        let called = false;
        await requireAdmin({ user: { id: "u" } }, {}, () => (called = true));
        assert.equal(called, true);
    });
});

describe("requireSeller", () => {
    const run = () => {
        const req = { user: { id: "u" } };
        return status(() => requireSeller(req, {}, () => {}))().then((s) => ({ s, req }));
    };

    it("requires a user", async () => {
        assert.equal(await status(() => requireSeller({}, {}, () => {}))(), 401);
    });
    it("rejects users without a store", async () => assert.equal((await run()).s, 403));
    it("rejects unverified stores", async () => {
        row = { id: 1, verifiedAt: null, inactiveSince: null };
        assert.equal((await run()).s, 403);
    });
    it("rejects inactive stores", async () => {
        row = { id: 1, verifiedAt: new Date(), inactiveSince: new Date() };
        assert.equal((await run()).s, 403);
    });
    it("attaches active verified stores to the request", async () => {
        row = { id: 1, campusId: 2, verifiedAt: new Date(), inactiveSince: null };
        const { s, req } = await run();
        assert.equal(s, "ok");
        assert.equal(req.store, row);
    });
});
