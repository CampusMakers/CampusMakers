export function deviceTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function formatScheduledTime(value, timeZone) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Invalid date";
    let zone = timeZone;
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: zone || undefined });
    } catch {
        zone = null;
    }
    const options = { timeZone: zone || undefined, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true };
    const formatted = new Intl.DateTimeFormat("en-US", options).format(date);
    const zoneName = new Intl.DateTimeFormat("en-US", { timeZone: zone || undefined, timeZoneName: "short" }).formatToParts(date).find(part => part.type === "timeZoneName")?.value;
    return `${formatted} (${zoneName || "local time"}${zone ? "" : ", your time zone"})`;
}
