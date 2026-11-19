// Settings come from process.env. On Cloudflare Workers that is filled from
// the "vars" in wrangler.jsonc plus secrets (.dev.vars locally, or
// `wrangler secret put` when deployed). The Node scripts load the same values
// through scripts/env.js.

const required = (name) => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required environment variable ${name}`);
    return value;
};

const int = (name, fallback) => {
    const value = Number.parseInt(process.env[name] ?? "", 10);
    return Number.isNaN(value) ? fallback : value;
};

const list = (name) =>
    (process.env[name] ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

const config = {
    env: process.env.NODE_ENV ?? "development",
    clientOrigins: list("CLIENT_ORIGINS"),
    auth: {
        url: required("BETTER_AUTH_URL"),
        secret: required("BETTER_AUTH_SECRET"),
        minPasswordLength: int("MIN_PASSWORD_LENGTH", 8)
    },
    db: {
        url: required("DATABASE_URL"),
        ssl: process.env.DB_SSL === "true",
        // Workers allow 6 open connections per request, so keep this at 5 or less.
        poolMax: int("DB_POOL_MAX", 5)
    },
    r2: {
        endpoint:
            process.env.R2_ENDPOINT ||
            (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : null),
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        bucket: process.env.R2_BUCKET,
        publicUrl: process.env.R2_PUBLIC_URL
    },
    uploads: {
        maxBytes: int("MAX_UPLOAD_MB", 10) * 1024 * 1024
    },
    orders: {
        pinLength: int("PICKUP_PIN_LENGTH", 4)
    },
    sellers: {
        emailSuffix: process.env.SELLER_EMAIL_SUFFIX ?? ".edu"
    },
    pagination: {
        defaultSize: int("DEFAULT_PAGE_SIZE", 20),
        maxSize: int("MAX_PAGE_SIZE", 100)
    },
    // OpenStreetMap Nominatim, used to turn location names and addresses into
    // map coordinates. The public server requires an identifying User-Agent
    // and at most one request per second:
    // https://operations.osmfoundation.org/policies/nominatim/
    geocoder: {
        enabled: process.env.GEOCODER_ENABLED !== "false",
        url: (process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org").replace(/\/$/, ""),
        userAgent: process.env.GEOCODER_USER_AGENT || "CampusMakers/1.0 (campus events map)",
        email: process.env.GEOCODER_EMAIL || null,
        minIntervalMs: int("GEOCODER_MIN_INTERVAL_MS", 1100),
        timeoutMs: int("GEOCODER_TIMEOUT_MS", 5000),
        // Longest a single API request may spend geocoding before answering.
        requestBudgetMs: int("GEOCODER_REQUEST_BUDGET_MS", 6000),
        // Wait this long before retrying a location that could not be matched.
        retryAfterHours: int("GEOCODER_RETRY_HOURS", 24)
    }
};

export default config;
