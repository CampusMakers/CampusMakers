import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { hashVerificationToken } from "../lib/sellerVerificationTokens.js";

test("seller verification API endpoints", async (t) => {
    // Fake database state. No real PostgreSQL connection.
    const state = {
        store: {
            id: 123,
            ownerId: "test-user",
            schoolEmail: "student@example.edu",
            verifiedAt: null
        },
        pending: null,
        sentEmail: null,
        failDelivery: false
    };

    const fakeClient = {
        async query(sql, params = []) {
            // Find the store owned by the signed-in user.
            if (
                sql.includes("from stores") &&
                sql.includes("for update")
            ) {
                const owned = state.store.ownerId === params[0];

                return {
                    rowCount: owned ? 1 : 0,
                    rows: owned
                        ? [
                              {
                                  id: state.store.id,
                                  schoolEmail:
                                      state.store.schoolEmail,
                                  verifiedAt:
                                      state.store.verifiedAt
                              }
                          ]
                        : []
                };
            }

            // Check the one-minute email cooldown.
            if (sql.includes("created_at > now()")) {
                const recent =
                    state.pending &&
                    Date.now() - state.pending.createdAt <
                        60000;

                return {
                    rowCount: recent ? 1 : 0,
                    rows: []
                };
            }

            // Save only the verification token hash.
            if (
                sql.includes(
                    "insert into store_email_verifications"
                )
            ) {
                state.pending = {
                    storeId: params[0],
                    schoolEmail: params[1],
                    tokenHash: params[2],
                    expiresAt: params[3],
                    createdAt: Date.now()
                };

                return { rowCount: 1, rows: [] };
            }

            // Validate token, expiry, account and school email.
            if (
                sql.includes("from store_email_verifications v")
            ) {
                const valid =
                    state.pending &&
                    state.pending.tokenHash === params[0] &&
                    state.store.ownerId === params[1] &&
                    state.pending.schoolEmail ===
                        state.store.schoolEmail &&
                    !state.store.verifiedAt &&
                    new Date(
                        state.pending.expiresAt
                    ).getTime() > Date.now();

                return {
                    rowCount: valid ? 1 : 0,
                    rows: valid
                        ? [
                              {
                                  store_id:
                                      state.pending.storeId,
                                  school_email:
                                      state.pending.schoolEmail
                              }
                          ]
                        : []
                };
            }

            // Mark the correct store as verified.
            if (sql.includes("update stores")) {
                const valid =
                    params[0] === state.store.id &&
                    params[1] === state.store.schoolEmail &&
                    !state.store.verifiedAt;

                if (valid) state.store.verifiedAt = new Date();

                return {
                    rowCount: valid ? 1 : 0,
                    rows: valid ? [{ id: state.store.id }] : []
                };
            }

            // Consume or clean up the pending token.
            if (
                sql.includes(
                    "delete from store_email_verifications"
                )
            ) {
                if (
                    state.pending &&
                    state.pending.storeId === params[0] &&
                    (!params[1] ||
                        state.pending.tokenHash === params[1])
                ) {
                    state.pending = null;
                }

                return { rowCount: 1, rows: [] };
            }

            throw new Error(
                "Unexpected database query in test"
            );
        }
    };

    // Mock database operations.
    t.mock.module("../db/pool.js", {
        exports: {
            many: async () => [],
            one: async () => null,
            transaction: async (work) => work(fakeClient)
        }
    });

    // Mock authentication.
    t.mock.module("../middleware/session.js", {
        exports: {
            requireAuth: (req, res, next) => {
                req.user = {
                    id: req.get("x-test-user") || "test-user"
                };
                next();
            }
        }
    });

    // Use fictional configuration only.
    t.mock.module("../config.js", {
        exports: {
            default: {
                clientOrigins: ["http://localhost:8787"],
                sellers: { emailSuffix: ".edu" },
                pagination: {
                    maxSize: 100,
                    defaultSize: 20
                }
            }
        }
    });

    // Mock Resend. Never send real emails.
    t.mock.module("../services/sellerVerificationEmail.js", {
        exports: {
            sendSellerVerificationEmail: async (email) => {
                if (state.failDelivery) {
                    throw new Error(
                        "Mock email delivery failed"
                    );
                }
                state.sentEmail = email;
            }
        }
    });

    // Load the actual routes after installing all mocks.
    const { default: storeRoutes } =
        await import("./stores.js");

    const app = express();
    app.use(express.json());
    app.use("/api/stores", storeRoutes);

    app.use((error, _req, res, _next) => {
        res.status(
            error.status || error.statusCode || 500
        ).json({ message: error.message });
    });

    const requestUrl = "/api/stores/me/verify-email/request";
    const confirmUrl = "/api/stores/me/verify-email/confirm";

    await t.test(
        "requests verification and stores only a token hash",
        async () => {
            const response = await request(app)
                .post(requestUrl)
                .set("Origin", "http://localhost:8787")
                .expect(200);

            assert.deepEqual(response.body, {
                data: { sent: true }
            });

            assert.equal(
                state.sentEmail.to,
                "student@example.edu"
            );
            assert.match(
                state.pending.tokenHash,
                /^[a-f0-9]{64}$/
            );

            const token = new URLSearchParams(
                state.sentEmail.url.split("?")[1]
            ).get("token");

            assert.equal(
                await hashVerificationToken(token),
                state.pending.tokenHash
            );
        }
    );

    await t.test(
        "another user cannot confirm the email",
        async () => {
            const token = new URLSearchParams(
                state.sentEmail.url.split("?")[1]
            ).get("token");

            await request(app)
                .post(confirmUrl)
                .set("x-test-user", "other-user")
                .send({ token })
                .expect(400);

            assert.equal(state.store.verifiedAt, null);
            assert.notEqual(state.pending, null);
        }
    );

    await t.test(
        "confirms verification and prevents token reuse",
        async () => {
            const token = new URLSearchParams(
                state.sentEmail.url.split("?")[1]
            ).get("token");

            const response = await request(app)
                .post(confirmUrl)
                .send({ token })
                .expect(200);

            assert.equal(response.body.data.verified, true);
            assert.ok(state.store.verifiedAt);
            assert.equal(state.pending, null);

            await request(app)
                .post(confirmUrl)
                .send({ token })
                .expect(400);
        }
    );

    await t.test(
        "rejects an expired verification token",
        async () => {
            state.store.verifiedAt = null;

            const token = "b".repeat(64);

            state.pending = {
                storeId: 123,
                schoolEmail: "student@example.edu",
                tokenHash: await hashVerificationToken(token),
                expiresAt: new Date(Date.now() - 60000),
                createdAt: Date.now() - 120000
            };

            await request(app)
                .post(confirmUrl)
                .send({ token })
                .expect(400);

            assert.equal(state.store.verifiedAt, null);
        }
    );

    await t.test(
        "cleans up the token when email delivery fails",
        async () => {
            state.pending = null;
            state.failDelivery = true;

            await request(app)
                .post(requestUrl)
                .set("Origin", "http://localhost:8787")
                .expect(503);

            assert.equal(state.pending, null);
            assert.equal(state.store.verifiedAt, null);
        }
    );
});
