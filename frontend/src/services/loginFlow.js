const KEY = "campus-makers-login-return";
let pending = null;
const safeRoute = (value) =>
    typeof value === "string" &&
    /^#[a-z]/i.test(value) &&
    !value.startsWith("#login")
        ? value
        : "#home";
export function requestLogin(
    action = "continue",
    resume = false
) {
    if (
        !window.confirm(
            `Please log in to ${action}. Go to login?`
        )
    )
        return false;
    pending = { from: safeRoute(window.location.hash), resume };
    try {
        sessionStorage.setItem(KEY, JSON.stringify(pending));
    } catch {
        /* In-memory fallback. */
    }
    window.location.hash = "login";
    return false;
}
function read() {
    try {
        return (
            JSON.parse(sessionStorage.getItem(KEY)) || pending
        );
    } catch {
        return pending;
    }
}
export function finishLogin(cancel = false) {
    const context = read();
    const target =
        cancel || context?.resume
            ? safeRoute(context?.from)
            : "#profile";
    pending = null;
    try {
        sessionStorage.removeItem(KEY);
    } catch {
        /* Storage unavailable. */
    }
    window.location.hash = target;
}
