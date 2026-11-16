import { useSyncExternalStore } from "react";
import {
    AUTH_CHANGE_EVENT,
    getSession,
    getMyProfile
} from "./authApi";

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
        reloadQueued = true;
        return pending;
    }

    pending = getSession()
        .then(async (session) => {
            if (!session?.user) {
                setState({ user: null, loading: false });
                return;
            }

            try {
                // Load the authenticated user's full backend profile.
                const profile = await getMyProfile();

                // Seller access requires an active, verified store.
                const sellerVerified =
                    profile.store?.verified === true &&
                    profile.store?.active === true;

                setState({
                    user: {
                        ...session.user,
                        ...profile,
                        sellerVerified
                    },
                    loading: false
                });
            } catch {
                // Keep the session, but deny seller access if
                // the profile could not be verified.
                setState({
                    user: {
                        ...session.user,
                        sellerVerified: false
                    },
                    loading: false,
                    profileError: true
                });
            }
        })
        .catch(() => {
            setState({ user: null, loading: false });
        })
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
