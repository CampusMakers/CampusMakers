import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

dotenv.config({ path: path.join(root, ".env"), quiet: true });
dotenv.config({ path: path.join(root, "config.env"), quiet: true });

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
    port: int("PORT", 4000),
    clientOrigins: list("CLIENT_ORIGINS"),
    auth: {
        url: required("BETTER_AUTH_URL"),
        secret: required("BETTER_AUTH_SECRET"),
        minPasswordLength: int("MIN_PASSWORD_LENGTH", 8)
    },
    db: {
        url: required("DATABASE_URL"),
        ssl: process.env.DB_SSL === "true",
        poolMax: int("DB_POOL_MAX", 10)
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
    }
};

export default config;
