import { authFetch } from "./authApi";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(
    /\/$/,
    ""
);

async function readResponse(response, fallback) {
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(
            payload?.message ||
                payload?.error?.message ||
                fallback
        );
    }
    return payload;
}

// A read-only campus list. This must be configured by the team before signup.
export async function getSellerCampuses({ signal } = {}) {
    const response = await fetch(
        `${API_ORIGIN}/api/campuses?limit=100`,
        { signal }
    );
    const payload = await readResponse(
        response,
        "Unable to load campuses."
    );
    if (!Array.isArray(payload?.data))
        throw new Error("Campus list is unavailable.");
    return payload.data;
}

// Creates a pending store; it does NOT verify university email ownership.
export async function createSellerStore({ name, schoolEmail }) {
    const response = await authFetch(
        `${API_ORIGIN}/api/stores`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: name.trim(),
                schoolEmail: schoolEmail.trim().toLowerCase()
            })
        }
    );
    const payload = await readResponse(
        response,
        "Unable to register your store."
    );
    if (!payload?.data?.id)
        throw new Error(
            "Store registration could not be confirmed."
        );
    return payload.data;
}
