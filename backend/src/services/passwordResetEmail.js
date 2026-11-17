// Sends account recovery emails through Resend.
export async function sendPasswordResetEmail({ to, url }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !from) {
        throw new Error(
            "Password reset email service is not configured"
        );
    }

    const response = await fetch(
        "https://api.resend.com/emails",
        {
            method: "POST",

            // Stop waiting if the email provider takes over 10 seconds.
            signal: AbortSignal.timeout(10_000),

            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from,
                to: [to],
                subject: "Reset your Campus Makers password",
                text: [
                    "We received a request to reset your password.",
                    "",
                    `Reset your password: ${url}`,
                    "",
                    "This link expires in 30 minutes.",
                    "If you did not request this, ignore this email."
                ].join("\n")
            })
        }
    );

    if (!response.ok) {
        // Never log the recovery URL, token, or API key.
        throw new Error("Password reset email delivery failed");
    }
}
