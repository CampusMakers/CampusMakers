const TOKEN_EXPIRY_MINUTES = 30;

// Generate a cryptographically secure, random verification token.
export function createVerificationToken() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);

    return Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, "0")
    ).join("");
}

// Store only the token hash, never the original token.
export async function hashVerificationToken(token) {
    const encoded = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest(
        "SHA-256",
        encoded
    );

    return Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0")
    ).join("");
}

// Verification links expire after 30 minutes.
export function getVerificationExpiry() {
    return new Date(
        Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000
    );
}
