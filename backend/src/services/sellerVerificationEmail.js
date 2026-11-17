
 // Sends university email verification links through Resend.
export async function sendSellerVerificationEmail({ to, url }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !from) {
        throw new Error(
            "Seller verification email service is not configured"
        );
    }

    const response = await fetch(
        "https://api.resend.com/emails",
        {
            method: "POST",
            signal: AbortSignal.timeout(10_000),
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from,
                to: [to],
                subject: "Verify your Campus Makers seller account",
                text: [
                    "Welcome to Campus Makers!",
                    "",
                    "Verify your university email to activate your seller account.",
                    "",
                    `Verify your email: ${url}`,
                    "",
                    "This link expires in 30 minutes.",
                    "If you did not request this, ignore this email."
                ].join("\n")
            })
        }
    );

    if (!response.ok) {
        // Never expose API keys or verification links in logs.
        throw new Error("Seller verification email delivery failed");
    }
}
