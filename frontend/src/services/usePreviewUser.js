// Authentication remains disconnected after the backend rollback.
// Do not present a browser-local demo identity as a signed-in account.
export function usePreviewUser() {
    return { user: null, loading: false };
}
