import { Router } from "express";
import { z } from "zod";
import { many, one, transaction } from "../db/pool.js";
import {
    badRequest,
    forbidden,
    notFound
} from "../lib/httpError.js";
import {
    id,
    idParam,
    money,
    pagination
} from "../lib/schemas.js";
import {
    activeListing,
    listingSelect
} from "../lib/selects.js";
import {
    Params,
    escapeLike,
    paginated,
    whereClause,
    withoutTotal
} from "../lib/sql.js";
import { requireSeller } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router();

const listingTypes = [
    "product",
    "commission",
    "service",
    "digital"
];

const sorts = {
    recent: "l.created_at desc, l.id desc",
    price_asc: "l.price asc, l.id desc",
    price_desc: "l.price desc, l.id desc"
};

export const getListing = async (listingId, viewerId) => {
    const params = new Params();
    const select = listingSelect(params, viewerId);
    return withoutTotal(
        await one(
            `${select} where l.id = ${params.add(listingId)}`,
            params.values
        )
    );
};

const assertCategory = async (categoryId) => {
    if (
        categoryId &&
        !(await one("select id from categories where id = $1", [
            categoryId
        ]))
    ) {
        throw badRequest("Unknown category");
    }
};

const assertOwnership = async (listingId, storeId) => {
    const listing = await one(
        "select store_id from listings where id = $1",
        [listingId]
    );
    if (!listing) throw notFound("Listing not found");
    if (listing.store_id !== storeId)
        throw forbidden("You do not own this listing");
};

router.get(
    "/",
    validate({
        query: z.object({
            q: z.string().trim().max(100).optional(),
            categoryId: id.optional(),
            storeId: id.optional(),
            campusId: id.optional(),
            type: z.enum(listingTypes).optional(),
            minPrice: money.optional(),
            maxPrice: money.optional(),
            status: z.enum(["active", "all"]).default("active"),
            sort: z.enum(Object.keys(sorts)).default("recent"),
            ...pagination
        })
    }),
    async (req, res) => {
        const query = req.data.query;
        const params = new Params();
        const select = listingSelect(params, req.user?.id);
        const conditions = [];

        const ownsStore =
            query.storeId &&
            req.user &&
            (await one(
                "select 1 from stores where id = $1 and owner_id = $2",
                [query.storeId, req.user.id]
            ));
        if (query.status === "active" || !ownsStore)
            conditions.push(activeListing);

        if (query.q) {
            const like = params.add(`%${escapeLike(query.q)}%`);
            conditions.push(
                `(l.title ilike ${like} or l.description ilike ${like} or s.name ilike ${like})`
            );
        }
        if (query.categoryId)
            conditions.push(
                `l.category_id = ${params.add(query.categoryId)}`
            );
        if (query.storeId)
            conditions.push(
                `l.store_id = ${params.add(query.storeId)}`
            );
        if (query.campusId)
            conditions.push(
                `s.campus_id = ${params.add(query.campusId)}`
            );
        if (query.type)
            conditions.push(
                `l.type = ${params.add(query.type)}`
            );
        if (query.minPrice !== undefined)
            conditions.push(
                `l.price >= ${params.add(query.minPrice)}`
            );
        if (query.maxPrice !== undefined)
            conditions.push(
                `l.price <= ${params.add(query.maxPrice)}`
            );

        const rows = await many(
            `${select} ${whereClause(conditions)}
             order by ${sorts[query.sort]}
             limit ${params.add(query.limit)} offset ${params.add(query.offset)}`,
            params.values
        );
        res.json(paginated(rows, query));
    }
);

router.get(
    "/:id",
    validate({ params: idParam }),
    async (req, res) => {
        const listing = await getListing(
            req.data.params.id,
            req.user?.id
        );
        if (!listing) throw notFound("Listing not found");
        if (
            listing.moderationStatus !== "approved" &&
            listing.store.owner.id !== req.user?.id &&
            req.user?.role !== "admin"
        )
            throw notFound("Listing not found");
        if (
            listing.status === "inactive" &&
            listing.store.owner.id !== req.user?.id
        )
            throw notFound("Listing not found");
        res.json({ data: listing });
    }
);

router.post(
    "/",
    requireSeller,
    validate({
        body: z.object({
            title: z.string().trim().min(2).max(120),
            description: z
                .string()
                .trim()
                .max(4000)
                .nullable()
                .optional(),
            categoryId: id.nullable().optional(),
            type: z.enum(listingTypes).default("product"),
            quantity: z
                .number()
                .int()
                .min(0)
                .max(100000)
                .default(1),
            price: money,
            imageUrls: z.array(z.url()).max(10).default([])
        })
    }),
    async (req, res) => {
        const body = req.data.body;
        if (req.store.inactiveSince)
            throw badRequest(
                "Reactivate your store before adding listings"
            );
        await assertCategory(body.categoryId);

        const listingId = await transaction(async (client) => {
            const created = await client.query(
                `insert into listings (store_id, category_id, type, title, description, quantity, price)
                 values ($1, $2, $3, $4, $5, $6, $7)
                 returning id`,
                [
                    req.store.id,
                    body.categoryId ?? null,
                    body.type,
                    body.title,
                    body.description ?? null,
                    body.quantity,
                    body.price
                ]
            );
            const newId = created.rows[0].id;
            if (body.imageUrls.length) {
                await client.query(
                    `insert into listing_images (listing_id, url, position)
                     select $1, url, (ordinality - 1)::smallint
                     from unnest($2::text[]) with ordinality as images (url, ordinality)`,
                    [newId, body.imageUrls]
                );
            }
            return newId;
        });

        res.status(201)
            .location(`/api/listings/${listingId}`)
            .json({
                data: await getListing(listingId, req.user.id)
            });
    }
);

router.patch(
    "/:id",
    requireSeller,
    validate({
        params: idParam,
        body: z
            .object({
                title: z
                    .string()
                    .trim()
                    .min(2)
                    .max(120)
                    .optional(),
                description: z
                    .string()
                    .trim()
                    .max(4000)
                    .nullable()
                    .optional(),
                categoryId: id.nullable().optional(),
                type: z.enum(listingTypes).optional(),
                quantity: z
                    .number()
                    .int()
                    .min(0)
                    .max(100000)
                    .optional(),
                price: money.optional(),
                active: z.boolean().optional()
            })
            .refine(
                (body) => Object.keys(body).length > 0,
                "Provide at least one field to update"
            )
    }),
    async (req, res) => {
        const listingId = req.data.params.id;
        const body = req.data.body;
        await assertOwnership(listingId, req.store.id);
        await assertCategory(body.categoryId);

        await one(
            `update listings set
                 moderation_status = 'pending',
                 title = coalesce($2, title),
                 description = case when $3::boolean then $4 else description end,
                 category_id = case when $5::boolean then $6::bigint else category_id end,
                 type = coalesce($7::listing_type, type),
                 quantity = coalesce($8, quantity),
                 price = coalesce($9, price),
                 inactive_since = case
                     when $10::boolean is null then inactive_since
                     when $10 then null
                     else coalesce(inactive_since, now())
                 end,
                 updated_at = now()
             where id = $1`,
            [
                listingId,
                body.title ?? null,
                "description" in body,
                body.description ?? null,
                "categoryId" in body,
                body.categoryId ?? null,
                body.type ?? null,
                body.quantity ?? null,
                body.price ?? null,
                body.active ?? null
            ]
        );
        res.json({
            data: await getListing(listingId, req.user.id)
        });
    }
);

router.delete(
    "/:id",
    requireSeller,
    validate({ params: idParam }),
    async (req, res) => {
        const listingId = req.data.params.id;
        await assertOwnership(listingId, req.store.id);
        const ordered = await one(
            "select 1 from order_items where listing_id = $1 limit 1",
            [listingId]
        );
        if (ordered) {
            await one(
                "update listings set inactive_since = coalesce(inactive_since, now()), updated_at = now() where id = $1",
                [listingId]
            );
        } else {
            await one("delete from listings where id = $1", [
                listingId
            ]);
        }
        res.status(204).end();
    }
);

export default router;
