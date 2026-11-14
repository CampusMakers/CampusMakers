import { betterAuth } from "better-auth";
import { bearer, username } from "better-auth/plugins";
import config from "./config.js";
import pool from "./db/pool.js";

const timestamps = { createdAt: "created_at", updatedAt: "updated_at" };

export const auth = betterAuth({
    appName: "Campus Makers",
    baseURL: config.auth.url,
    basePath: "/api/auth",
    secret: config.auth.secret,
    database: pool,
    trustedOrigins: config.clientOrigins,
    // The startup schema check queries the database at module load, which
    // Cloudflare Workers forbid outside a request. Migrations own the schema.
    advanced: { database: { validateSchema: false } },
    emailAndPassword: {
        enabled: true,
        minPasswordLength: config.auth.minPasswordLength
    },
    user: {
        modelName: "users",
        fields: { emailVerified: "email_verified", ...timestamps },
        additionalFields: {
            bio: { type: "string", required: false, fieldName: "bio" },
            campusId: { type: "number", required: false, fieldName: "campus_id" },
            role: {
                type: "string",
                required: false,
                defaultValue: "user",
                input: false,
                fieldName: "role"
            }
        },
        deleteUser: { enabled: true }
    },
    session: {
        modelName: "sessions",
        fields: {
            expiresAt: "expires_at",
            ipAddress: "ip_address",
            userAgent: "user_agent",
            userId: "user_id",
            ...timestamps
        }
    },
    account: {
        modelName: "accounts",
        fields: {
            accountId: "account_id",
            providerId: "provider_id",
            userId: "user_id",
            accessToken: "access_token",
            refreshToken: "refresh_token",
            idToken: "id_token",
            accessTokenExpiresAt: "access_token_expires_at",
            refreshTokenExpiresAt: "refresh_token_expires_at",
            ...timestamps
        }
    },
    verification: {
        modelName: "verifications",
        fields: { expiresAt: "expires_at", ...timestamps }
    },
    plugins: [
        username({
            schema: {
                user: { fields: { displayUsername: "display_username" } }
            }
        }),
        bearer()
    ]
});
