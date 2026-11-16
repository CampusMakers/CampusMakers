import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { one } from "../db/pool.js";
import { forbidden, unauthorized } from "../lib/httpError.js";

export const loadSession = async (req, res, next) => {
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers)
    });
    req.user = session?.user ?? null;
    req.session = session?.session ?? null;
    next();
};

export const requireAuth = (req, res, next) => {
    if (!req.user) throw unauthorized();
    next();
};

export const requireAdmin = (req, res, next) => {
    if (!req.user) throw unauthorized();
    if (req.user.role !== "admin")
        throw forbidden("Administrator access required");
    next();
};

export const requireSeller = async (req, res, next) => {
    if (!req.user) throw unauthorized();

    const store = await one(
        `select
            id,
            campus_id as "campusId",
            verified_at as "verifiedAt",
            inactive_since as "inactiveSince"
         from stores
         where owner_id = $1`,
        [req.user.id]
    );

    if (!store) {
        throw forbidden(
            "You need a seller store for this action"
        );
    }

    // Require university email verification.
    if (!store.verifiedAt) {
        throw forbidden(
            "Verify your university email before using seller features"
        );
    }

    // Prevent inactive stores from performing seller operations.
    if (store.inactiveSince) {
        throw forbidden(
            "Reactivate your store before using seller features"
        );
    }

    req.store = store;
    next();
};
