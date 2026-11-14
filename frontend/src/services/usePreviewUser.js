import { useSyncExternalStore } from "react";
import { AUTH_CHANGE_EVENT, getSession } from "./authApi";

// Signed-in user from the backend session (Better Auth).
// Shared across components so the session is fetched once per change.
let state = { user: null, loading: true };
let pending = null;
const listeners = new Set();

function setState(next) {
    state = next;
    listeners.forEach((listener) => listener());
}

let reloadQueued = false;

function loadSession() {
    if (pending) {
        // Auth changed mid-request: fetch again once this one settles.
        reloadQueued = true;
        return pending;
    }
    pending = getSession()
        .then((session) =>
            setState({ user: session?.user ?? null, loading: false })
        )
        .catch(() => setState({ user: null, loading: false }))
        .finally(() => {
            pending = null;
            if (reloadQueued) {
                reloadQueued = false;
                loadSession();
            }
        });
    return pending;
}

if (typeof window !== "undefined") {
    window.addEventListener(AUTH_CHANGE_EVENT, loadSession);
    loadSession();
}

function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function usePreviewUser() {
    return useSyncExternalStore(subscribe, () => state);
}
