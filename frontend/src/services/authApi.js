/*
 * Campus Makers Authentication API
 *
 * Talks to the backend's Better Auth routes mounted at /api/auth.
 * On sign-in/sign-up the backend returns a session token in the
 * `set-auth-token` response header (Better Auth bearer plugin).
 * The token is kept in localStorage and sent as
 * `Authorization: Bearer <token>` on requests that require auth.
 */

const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(
    /\/$/,
    ""
);

const TOKEN_STORAGE_KEY = "campus-makers-auth-token";
export const AUTH_CHANGE_EVENT = "campus-makers-auth-change";

let memoryToken = null;

export function getAuthToken() {
    try {
        return window.localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
        return memoryToken;
    }
}

function setAuthToken(token) {
    memoryToken = token || null;
    try {
        if (token) {
            window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
        } else {
            window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
    } catch {
        // Fall back to the in-memory token if storage is unavailable.
    }
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

// Headers to attach to any request that requires authentication.
export function authHeaders() {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// fetch() wrapper for authenticated backend requests. Sends the bearer
// token and session cookie, and clears a token the server rejects.
export async function authFetch(url, options = {}) {
    const response = await fetch(url, {
        credentials: "include",
        ...options,
        headers: {
            ...authHeaders(),
            ...options.headers
        }
    });

    if (response.status === 401 && getAuthToken()) {
        setAuthToken(null);
    }

    return response;
}

async function authRequest(path, { method = "POST", body } = {}) {
    let response;
    try {
        response = await fetch(`${API_ORIGIN}/api/auth${path}`, {
            method,
            credentials: "include",
            headers: {
                ...authHeaders(),
                ...(body !== undefined && {
                    "Content-Type": "application/json"
                })
            },
            body: body !== undefined ? JSON.stringify(body) : undefined
        });
    } catch {
        throw new Error(
            "Could not reach the server. Please try again."
        );
    }

    const result = await response.json().catch(() => null);

    if (!response.ok) {
        const error = new Error(
            result?.message ||
                result?.error?.message ||
                `Request failed (${response.status})`
        );
        error.code = result?.code;
        error.status = response.status;
        throw error;
    }

    const token = response.headers.get("set-auth-token");
    if (token) setAuthToken(token);

    return result;
}

// Create an account with email, password, and username.
export function signUp({ name, email, password, username }) {
    return authRequest("/sign-up/email", {
        body: { name, email, password, username }
    });
}

// Sign in with email and password.
export function signIn({ email, password }) {
    return authRequest("/sign-in/email", {
        body: { email, password }
    });
}

// Get the current session, or null when signed out.
export async function getSession() {
    const result = await authRequest("/get-session", {
        method: "GET"
    });
    if (!result?.user && getAuthToken()) setAuthToken(null);
    return result?.user ? result : null;
}

// End the current session on the server and forget the token.
export async function signOut() {
    try {
        await authRequest("/sign-out", { body: {} });
    } finally {
        setAuthToken(null);
    }
}
