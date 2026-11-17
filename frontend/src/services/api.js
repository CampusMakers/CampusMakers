import { authFetch } from "./authApi.js";
const origin = (import.meta.env?.VITE_API_URL || "").replace(
    /\/$/,
    ""
);
export async function api(path, options = {}) {
    const response = await authFetch(`${origin}/api${path}`, {
        ...options,
        headers: {
            ...(options.body &&
            !(options.body instanceof FormData)
                ? { "Content-Type": "application/json" }
                : {}),
            ...options.headers
        }
    });
    if (response.status === 204) return null;
    const result = await response.json().catch(() => null);
    if (!response.ok)
        throw new Error(
            result?.error?.message ||
                result?.message ||
                `Request failed (${response.status})`
        );
    return result?.data;
}
