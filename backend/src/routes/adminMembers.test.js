import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";

test("administrator management enforces current roles and retains a last admin", async (t) => {
    const users = new Map([
        [
            "a",
            {
                id: "a",
                username: "first",
                name: "First",
                role: "admin"
            }
        ],
        [
            "b",
            {
                id: "b",
                username: "second",
                name: "Second",
                role: "user"
            }
        ]
    ]);
    let revokeBeforeTransaction = false;
    const query = async (sql, values = []) => {
        if (sql.includes("pg_advisory_xact_lock"))
            return { rows: [] };
        if (sql.includes("count(*)"))
            return {
                rows: [
                    {
                        count: [...users.values()].filter(
                            (u) => u.role === "admin"
                        ).length
                    }
                ]
            };
        const user = users.get(values[0]);
        if (sql.startsWith("update users") && user)
            user.role = values[1];
        return { rows: user ? [{ ...user }] : [] };
    };
    t.mock.module("../db/pool.js", {
        namedExports: {
            one: async (sql, args) =>
                (await query(sql, args)).rows[0],
            many: async () => [...users.values()],
            transaction: async (fn) => {
                if (revokeBeforeTransaction)
                    users.get("b").role = "user";
                return fn({ query });
            }
        }
    });
    t.mock.module("../auth.js", { namedExports: { auth: {} } });
    const { requireAdmin } =
        await import("../middleware/session.js");
    const { default: router } =
        await import("./adminMembers.js");
    const app = express();
    app.use(express.json(), (req, res, next) => {
        req.user = req.headers["x-user"]
            ? { id: req.headers["x-user"], role: "admin" }
            : null;
        next();
    });
    app.use(requireAdmin, router);
    app.use((error, req, res, _next) =>
        res
            .status(error.status || 500)
            .json({ message: error.message })
    );
    assert.equal((await request(app).get("/")).status, 401);
    assert.equal(
        (
            await request(app)
                .patch("/a")
                .set("x-user", "b")
                .send({ role: "admin" })
        ).status,
        403
    );
    assert.equal(
        (
            await request(app)
                .patch("/b")
                .set("x-user", "a")
                .send({ role: "owner" })
        ).status,
        400
    );
    assert.equal(
        (
            await request(app)
                .patch("/b")
                .set("x-user", "a")
                .send({ role: "admin" })
        ).status,
        200
    );
    assert.equal(users.get("b").role, "admin");
    assert.equal(
        (
            await request(app)
                .patch("/a")
                .set("x-user", "b")
                .send({ role: "user" })
        ).status,
        200
    );
    assert.equal(
        (await request(app).get("/").set("x-user", "a")).status,
        403
    );
    assert.equal(
        (
            await request(app)
                .patch("/b")
                .set("x-user", "b")
                .send({ role: "user" })
        ).status,
        409
    );
    assert.equal(users.get("b").role, "admin");
    assert.equal(
        (
            await request(app)
                .patch("/missing")
                .set("x-user", "b")
                .send({ role: "admin" })
        ).status,
        404
    );
    revokeBeforeTransaction = true;
    assert.equal(
        (
            await request(app)
                .patch("/a")
                .set("x-user", "b")
                .send({ role: "admin" })
        ).status,
        403
    );
    assert.equal(users.get("a").role, "user");
});
