import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { sendPasswordResetEmail } from "../../src/services/passwordResetEmail.js";
import { sendSellerVerificationEmail } from "../../src/services/sellerVerificationEmail.js";

const cases = [
    {
        name: "sendPasswordResetEmail",
        send: sendPasswordResetEmail,
        subject: "Reset your Campus Makers password",
        notConfigured: /Password reset email service is not configured/,
        failed: /Password reset email delivery failed/
    },
    {
        name: "sendSellerVerificationEmail",
        send: sendSellerVerificationEmail,
        subject: "Verify your Campus Makers seller account",
        notConfigured: /Seller verification email service is not configured/,
        failed: /Seller verification email delivery failed/
    }
];

for (const { name, send, subject, notConfigured, failed } of cases) {
    describe(name, () => {
        const saved = { ...process.env };
        beforeEach(() => {
            process.env.RESEND_API_KEY = "key";
            process.env.RESEND_FROM_EMAIL = "from@example.com";
        });
        afterEach(() => {
            process.env.RESEND_API_KEY = saved.RESEND_API_KEY;
            process.env.RESEND_FROM_EMAIL = saved.RESEND_FROM_EMAIL;
        });

        it("refuses to send without configuration", async (t) => {
            delete process.env.RESEND_API_KEY;
            const fetch = t.mock.method(globalThis, "fetch", async () => ({ ok: true }));
            await assert.rejects(send({ to: "a@b.edu", url: "https://x" }), notConfigured);
            assert.equal(fetch.mock.callCount(), 0);
        });

        it("posts the email to Resend", async (t) => {
            const fetch = t.mock.method(globalThis, "fetch", async () => ({ ok: true }));
            await send({ to: "a@b.edu", url: "https://link" });
            const [url, options] = fetch.mock.calls[0].arguments;
            assert.equal(url, "https://api.resend.com/emails");
            assert.equal(options.method, "POST");
            assert.equal(options.headers.Authorization, "Bearer key");
            assert.ok(options.signal instanceof AbortSignal);
            const body = JSON.parse(options.body);
            assert.deepEqual([body.from, body.to, body.subject], ["from@example.com", ["a@b.edu"], subject]);
            assert.match(body.text, /https:\/\/link/);
            assert.match(body.text, /expires in 30 minutes/);
        });

        it("throws a generic error without leaking the link", async (t) => {
            t.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 500 }));
            await assert.rejects(send({ to: "a@b.edu", url: "https://secret-link" }), (error) => {
                assert.match(error.message, failed);
                assert.doesNotMatch(error.message, /secret-link|key/);
                return true;
            });
        });
    });
}
