
import test from "node:test";
import assert from "node:assert/strict";
import { sendSellerVerificationEmail } from "./sellerVerificationEmail.js";

// Fictional data for testing only.
const sample = {
    to: "student@example.edu",
    url: "https://example.com/#verify-seller?token=test-token"
};

// Configure fake credentials and restore the environment afterward.
function configureTestEnv(t, key = "test-api-key") {
    const previousKey = process.env.RESEND_API_KEY;
    const previousFrom = process.env.RESEND_FROM_EMAIL;

    process.env.RESEND_API_KEY = key;
    process.env.RESEND_FROM_EMAIL =
        "Campus Makers <test@example.com>";

    t.after(() => {
        if (previousKey === undefined) {
            delete process.env.RESEND_API_KEY;
        } else {
            process.env.RESEND_API_KEY = previousKey;
        }

        if (previousFrom === undefined) {
            delete process.env.RESEND_FROM_EMAIL;
        } else {
            process.env.RESEND_FROM_EMAIL = previousFrom;
        }
    });
}

test("sends a seller verification email request", async (t) => {
    configureTestEnv(t);

    // Mock Resend so no real email is sent.
    t.mock.method(globalThis, "fetch", async (url, options) => {
        assert.equal(url, "https://api.resend.com/emails");
        assert.equal(options.method, "POST");
        assert.equal(
            options.headers.Authorization,
            "Bearer test-api-key"
        );

        const body = JSON.parse(options.body);

        assert.deepEqual(body.to, [sample.to]);
        assert.match(body.subject, /verify/i);
        assert.ok(body.text.includes(sample.url));
        assert.ok(options.signal instanceof AbortSignal);

        return { ok: true };
    });

    await sendSellerVerificationEmail(sample);
});

test("rejects missing email credentials", async (t) => {
    configureTestEnv(t, "");

    await assert.rejects(
        sendSellerVerificationEmail(sample),
        /not configured/
    );
});

test("handles Resend delivery failures safely", async (t) => {
    configureTestEnv(t);

    // Simulate an email-provider failure.
    t.mock.method(globalThis, "fetch", async () => ({
        ok: false,
        status: 500
    }));

    await assert.rejects(
        sendSellerVerificationEmail(sample),
        /Seller verification email delivery failed/
    );
});
