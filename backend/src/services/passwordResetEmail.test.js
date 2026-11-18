import test from "node:test";
import assert from "node:assert/strict";
import { sendPasswordResetEmail } from "./passwordResetEmail.js";

const sample = {
    to: "student@example.com",
    url: "https://example.com/reset?token=test-token"
};

// Restore environment variables after each test.
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

test("sends a password reset email request", async (t) => {
    configureTestEnv(t);

    t.mock.method(globalThis, "fetch", async (url, options) => {
        assert.equal(url, "https://api.resend.com/emails");
        assert.equal(options.method, "POST");
        assert.equal(
            options.headers.Authorization,
            "Bearer test-api-key"
        );

        const body = JSON.parse(options.body);
        assert.deepEqual(body.to, [sample.to]);
        assert.ok(body.text.includes(sample.url));
        assert.ok(options.signal instanceof AbortSignal);

        return { ok: true };
    });

    await sendPasswordResetEmail(sample);
});

test("rejects missing email credentials", async (t) => {
    configureTestEnv(t, "");

    await assert.rejects(
        sendPasswordResetEmail(sample),
        /not configured/
    );
});

test("handles email provider failure safely", async (t) => {
    configureTestEnv(t);

    t.mock.method(globalThis, "fetch", async () => ({
        ok: false,
        status: 500
    }));

    await assert.rejects(
        sendPasswordResetEmail(sample),
        /Password reset email delivery failed/
    );
});
