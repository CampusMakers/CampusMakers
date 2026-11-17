import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import helmet from "helmet";
import request from "supertest";

test("photo responses allow same-site embedding without exposing pending media", async (t) => {
    const file = "12345678-1234-1234-1234-123456789abc.jpg";
    const profile = `/profile-photos/owner/${file}`;
    const listing = `/listing-photos/owner/${file}`;
    const post = `/post-media/owner/${file}`;
    t.mock.module("../config.js", {
        defaultExport: {
            auth: { url: "http://localhost:8787" },
            uploads: { maxBytes: 10485760 }
        }
    });
    t.mock.module("../db/pool.js", {
        namedExports: {
            one: async (sql) =>
                sql.includes("select image from users")
                    ? {
                          image: `http://localhost:8787/api/uploads${profile}`
                      }
                    : null
        }
    });
    t.mock.module("../lib/storage.js", {
        namedExports: {
            getObject: async () =>
                new Uint8Array([255, 216, 255, 217]),
            putObject: async () => {},
            deleteObject: async () => {}
        }
    });
    t.mock.module("../middleware/session.js", {
        namedExports: {
            requireAuth: (req, res, next) =>
                req.user ? next() : res.sendStatus(401),
            requireSeller: (req, res, next) => next()
        }
    });
    const { default: router } = await import("./uploads.js");
    const app = express();
    app.use(helmet(), (req, res, next) => {
        req.user = req.headers["x-owner"]
            ? { id: "owner" }
            : null;
        next();
    });
    app.get("/api/other", (req, res) => res.json({ ok: true }));
    app.use("/api/uploads", router);
    app.use((error, req, res, _next) =>
        res
            .status(error.status || 500)
            .json({ message: error.message })
    );
    const publicPhoto = await request(app).get(
        `/api/uploads${profile}`
    );
    assert.equal(publicPhoto.status, 200);
    assert.equal(
        publicPhoto.headers["cross-origin-resource-policy"],
        "same-site"
    );
    assert.match(
        publicPhoto.headers["content-type"],
        /image\/jpeg/
    );
    for (const path of [listing, post]) {
        assert.equal(
            (await request(app).get(`/api/uploads${path}`))
                .status,
            404
        );
        const owned = await request(app)
            .get(`/api/uploads${path}`)
            .set("x-owner", "1");
        assert.equal(owned.status, 200);
        assert.equal(
            owned.headers["cross-origin-resource-policy"],
            "same-site"
        );
    }
    assert.equal(
        (await request(app).get("/api/other")).headers[
            "cross-origin-resource-policy"
        ],
        "same-origin"
    );
});
