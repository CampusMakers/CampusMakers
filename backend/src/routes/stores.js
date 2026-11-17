import { Router } from "express";
import { z } from "zod";
import config from "../config.js";
import { many, one, transaction } from "../db/pool.js";
import {
    badRequest,
    conflict,
    forbidden,
    notFound
} from "../lib/httpError.js";
import {
    id,
    idParam,
    pagination,
    paymentMethod
} from "../lib/schemas.js";
import {
    Params,
    escapeLike,
    paginated,
    whereClause,
    withoutTotal
} from "../lib/sql.js";
import { requireAuth } from "../middleware/session.js";
import validate from "../middleware/validate.js";
import {
    createVerificationToken,
    hashVerificationToken,
    getVerificationExpiry
} from "../lib/sellerVerificationTokens.js";

import { sendSellerVerificationEmail } from "../services/sellerVerificationEmail.js";

const router = Router();

const storeSelect = `
    select
        s.id,
        s.name,
        s.description,
        s.verified_at is not null as verified,
        s.inactive_since is null as active,
        s.created_at as "createdAt",
        json_build_object('id', u.id, 'username', u.username, 'name', u.name, 'image', u.image) as owner,
        json_build_object('id', c.id, 'name', c.name, 'emailDomain', c.email_domain) as campus,
        coalesce((
            select json_agg(pm.method order by pm.method)
            from store_payment_methods pm
            where pm.store_id = s.id
        ), '[]'::json) as "paymentMethods",
        (select count(*) from listings l where l.store_id = s.id and l.inactive_since is null)::int as "activeListingCount",
        count(*) over ()::int as "totalCount"
    from stores s
    join users u on u.id = s.owner_id
    join campuses c on c.id = s.campus_id`;

const getStore = async (storeId) =>
    withoutTotal(
        await one(`${storeSelect} where s.id = $1`, [storeId])
    );

const replacePaymentMethods = async (
    client,
    storeId,
    methods
) => {
    await client.query(
        "delete from store_payment_methods where store_id = $1",
        [storeId]
    );
    if (methods.length) {
        await client.query(
            `insert into store_payment_methods (store_id, method)
             select $1, unnest($2::payment_method[])`,
            [storeId, [...new Set(methods)]]
        );
    }
};

router.get(
    "/",
    validate({
        query: z.object({
            campusId: id.optional(),
            q: z.string().trim().max(100).optional(),
            ...pagination
        })
    }),
    async (req, res) => {
        const { campusId, q, limit, offset } = req.data.query;
        const params = new Params();
        const conditions = ["s.inactive_since is null"];
        if (campusId)
            conditions.push(
                `s.campus_id = ${params.add(campusId)}`
            );
        if (q) {
            const like = params.add(`%${escapeLike(q)}%`);
            conditions.push(
                `(s.name ilike ${like} or s.description ilike ${like} or u.username ilike ${like})`
            );
        }
        const rows = await many(
            `${storeSelect} ${whereClause(conditions)}
             order by s.name
             limit ${params.add(limit)} offset ${params.add(offset)}`,
            params.values
        );
        res.json(paginated(rows, { limit, offset }));
    }
);

router.get(
    "/:id",
    validate({ params: idParam }),
    async (req, res) => {
        const store = await getStore(req.data.params.id);
        if (!store) throw notFound("Store not found");
        res.json({ data: store });
    }
);

router.post(
    "/",
    requireAuth,
    validate({
        body: z.object({
            name: z.string().trim().min(2).max(80),
            description: z
                .string()
                .trim()
                .max(1000)
                .nullable()
                .optional(),
            schoolEmail: z.email().trim().toLowerCase(),
            paymentMethods: z
                .array(paymentMethod)
                .max(6)
                .default(["cash"])
        })
    }),
    async (req, res) => {
        const body = req.data.body;
        if (
            !body.schoolEmail.endsWith(
                config.sellers.emailSuffix
            )
        ) {
            throw badRequest(
                `School email must end in ${config.sellers.emailSuffix}`
            );
        }

        const storeId = await transaction(async (client) => {
            const existing = await client.query(
                "select id from stores where owner_id = $1",
                [req.user.id]
            );
            if (existing.rowCount)
                throw conflict("You already have a store");

            // Find an existing trusted campus using the school email domain.
            const emailDomain = body.schoolEmail.split("@")[1];

            const campusResult = await client.query(
                `select id, email_domain as "emailDomain"
     from campuses
     where email_domain = $1
        or $1 like ('%.' || email_domain)
     order by length(email_domain) desc
     limit 1`,
                [emailDomain]
            );

            const campus = campusResult.rows[0];

            if (!campus) {
                throw badRequest(
                    "Your university is not configured for seller registration yet."
                );
            }

            const created = await client.query(
                `insert into stores (owner_id, campus_id, name, description, school_email)
                 values ($1, $2, $3, $4, $5)
                 returning id`,
                [
                    req.user.id,
                    campus.id,
                    body.name,
                    body.description ?? null,
                    body.schoolEmail
                ]
            );
            const newId = created.rows[0].id;
            await replacePaymentMethods(
                client,
                newId,
                body.paymentMethods
            );
            await client.query(
                "update users set campus_id = coalesce(campus_id, $2) where id = $1",
                [req.user.id, campus.id]
            );
            return newId;
        });

        res.status(201)
            .location(`/api/stores/${storeId}`)
            .json({ data: await getStore(storeId) });
    }
);

router.post(
    "/me/verify-email/request",
    requireAuth,
    async (req, res) => {
        // Only generate links pointing to a trusted frontend origin.
        const origin = req.get("origin");

        if (!origin || !config.clientOrigins.includes(origin)) {
            throw badRequest(
                "Unrecognized application origin."
            );
        }

        const token = createVerificationToken();
        const tokenHash = await hashVerificationToken(token);
        const expiresAt = getVerificationExpiry();

        const store = await transaction(async (client) => {
            // Lock the user's store to serialize verification requests.
            const result = await client.query(
                `select id, school_email as "schoolEmail", verified_at as "verifiedAt"
                 from stores
                 where owner_id = $1
                 for update`,
                [req.user.id]
            );

            if (!result.rowCount) {
                throw badRequest("Register a store first.");
            }

            const ownedStore = result.rows[0];

            if (ownedStore.verifiedAt) {
                throw conflict(
                    "Your store is already verified."
                );
            }

            // Limit repeated emails to one request per minute.
            const recent = await client.query(
                `select 1
                 from store_email_verifications
                 where store_id = $1
                   and created_at > now() - interval '1 minute'`,
                [ownedStore.id]
            );

            if (recent.rowCount) {
                throw badRequest(
                    "Please wait before requesting another verification email."
                );
            }

            // Replace any previous pending token.
            await client.query(
                `insert into store_email_verifications
                    (store_id, school_email, token_hash, expires_at)
                 values ($1, $2, $3, $4)
                 on conflict (store_id)
                 do update set
                    school_email = excluded.school_email,
                    token_hash = excluded.token_hash,
                    expires_at = excluded.expires_at,
                    created_at = now()`,
                [
                    ownedStore.id,
                    ownedStore.schoolEmail,
                    tokenHash,
                    expiresAt
                ]
            );

            return ownedStore;
        });

        // The token stays in the email link, never in logs or the database.
        const url = `${origin}/#verify-seller?token=${encodeURIComponent(token)}`;

        try {
            await sendSellerVerificationEmail({
                to: store.schoolEmail,
                url
            });
        } catch {
            // Remove this token if delivery fails.
            await transaction(async (client) => {
                await client.query(
                    `delete from store_email_verifications
                     where store_id = $1 and token_hash = $2`,
                    [store.id, tokenHash]
                );
            });

            res.status(503).json({
                error: {
                    message:
                        "Verification email is unavailable. Please try again."
                }
            });
            return;
        }

        res.json({ data: { sent: true } });
    }
);

/**
 * Confirm ownership of a seller's university email.
 * Requires the account owner and a valid, unused token.
 */
router.post(
    "/me/verify-email/confirm",
    requireAuth,
    validate({
        body: z.object({
            token: z.string().regex(/^[a-f0-9]{64}$/)
        })
    }),
    async (req, res) => {
        const tokenHash = await hashVerificationToken(
            req.data.body.token
        );

        await transaction(async (client) => {
            // Find and lock the pending verification request.
            const result = await client.query(
                `select v.store_id, v.school_email
                 from store_email_verifications v
                 join stores s on s.id = v.store_id
                 where v.token_hash = $1
                   and v.expires_at > now()
                   and s.owner_id = $2
                   and s.school_email = v.school_email
                   and s.verified_at is null
                 for update of v`,
                [tokenHash, req.user.id]
            );

            if (!result.rowCount) {
                throw badRequest(
                    "Verification link is invalid or expired."
                );
            }

            const verification = result.rows[0];

            // Mark the correct store and email as verified.
            const updated = await client.query(
                `update stores
                 set verified_at = now(),
                     updated_at = now()
                 where id = $1
                   and school_email = $2
                   and verified_at is null
                 returning id`,
                [
                    verification.store_id,
                    verification.school_email
                ]
            );

            if (!updated.rowCount) {
                throw badRequest(
                    "Store verification could not be completed."
                );
            }

            // Consume the token so it cannot be reused.
            await client.query(
                `delete from store_email_verifications
                 where store_id = $1`,
                [verification.store_id]
            );
        });

        res.json({ data: { verified: true } });
    }
);

router.patch(
    "/:id",
    requireAuth,
    validate({
        params: idParam,
        body: z
            .object({
                name: z
                    .string()
                    .trim()
                    .min(2)
                    .max(80)
                    .optional(),
                description: z
                    .string()
                    .trim()
                    .max(1000)
                    .nullable()
                    .optional(),
                paymentMethods: z
                    .array(paymentMethod)
                    .max(6)
                    .optional(),
                active: z.boolean().optional()
            })
            .refine(
                (body) => Object.keys(body).length > 0,
                "Provide at least one field to update"
            )
    }),
    async (req, res) => {
        const storeId = req.data.params.id;
        const body = req.data.body;
        await transaction(async (client) => {
            const owned = await client.query(
                "select owner_id from stores where id = $1 for update",
                [storeId]
            );
            if (!owned.rowCount)
                throw notFound("Store not found");
            if (owned.rows[0].owner_id !== req.user.id)
                throw forbidden("You do not own this store");

            await client.query(
                `update stores set
                     name = coalesce($2, name),
                     description = case when $3::boolean then $4 else description end,
                     inactive_since = case
                         when $5::boolean is null then inactive_since
                         when $5 then null
                         else coalesce(inactive_since, now())
                     end,
                     updated_at = now()
                 where id = $1`,
                [
                    storeId,
                    body.name ?? null,
                    "description" in body,
                    body.description ?? null,
                    body.active ?? null
                ]
            );
            if (body.paymentMethods)
                await replacePaymentMethods(
                    client,
                    storeId,
                    body.paymentMethods
                );
        });
        res.json({ data: await getStore(storeId) });
    }
);

export default router;
