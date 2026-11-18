
import { authFetch } from "./authApi";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// Handle backend responses without exposing verification tokens.
async function readResponse(response) {
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            payload?.error?.message ||
            payload?.message ||
            "Seller verification failed."
        );
    }

    return payload.data;
}

// Request a university verification email.
export async function requestSellerVerification() {
    const response = await authFetch(
        `${API_ORIGIN}/api/stores/me/verify-email/request`,
        {
            method: "POST"
        }
    );

    return readResponse(response);
}

// Confirm a university email using its verification token.
export async function confirmSellerVerification(token) {
    const response = await authFetch(
        `${API_ORIGIN}/api/stores/me/verify-email/confirm`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ token })
        }
    );

    return readResponse(response);
}
