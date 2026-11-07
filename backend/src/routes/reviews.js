import { Router } from "express";
import { z } from "zod";
import { many, one } from "../db/pool.js";
import { conflict, forbidden, notFound } from "../lib/httpError.js";
import { id, pagination } from "../lib/schemas.js";
import { Params, paginated, whereClause } from "../lib/sql.js";
import { requireAuth } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router();

const reviewSelect = `
    select
        r.order_item_id as "orderItemId",
        r.rating,
        r.content,
        r.created_at as "createdAt",
        oi.listing_id as "listingId",
        oi.title as "listingTitle",
        case when b.id is null then null
            else json_build_object('id', b.id, 'username', b.username, 'name', b.name, 'image', b.image) end as author,
        count(*) over ()::int as "totalCount"
    from reviews r
    join order_items oi on oi.id = r.order_item_id
    join orders o on o.id = oi.order_id
    left join users b on b.id = o.buyer_id`;

router.get(
    "/",
    validate({
        query: z
            .object({ listingId: id.optional(), storeId: id.optional(), ...pagination })
            .refine((query) => query.listingId || query.storeId, "Provide listingId or storeId")
    }),
    async (req, res) => {
        const { listingId, storeId, limit, offset } = req.data.query;
        const params = new Params();
        const conditions = [];
        if (listingId) conditions.push(`oi.listing_id = ${params.add(listingId)}`);
        if (storeId) conditions.push(`o.store_id = ${params.add(storeId)}`);
        const rows = await many(
            `${reviewSelect} ${whereClause(conditions)}
             order by r.created_at desc
             limit ${params.add(limit)} offset ${params.add(offset)}`,
            params.values
        );
        const summary = await one(
            `select round(avg(r.rating)::numeric, 2) as average, count(*)::int as count
             from reviews r
             join order_items oi on oi.id = r.order_item_id
             join orders o on o.id = oi.order_id
             ${whereClause(conditions)}`,
            params.values.slice(0, conditions.length)
        );
        res.json({ ...paginated(rows, { limit, offset }), summary });
    }
);

const assertReviewable = async (orderItemId, userId) => {
    const item = await one(
        `select o.buyer_id, o.status
         from order_items oi
         join orders o on o.id = oi.order_id
         where oi.id = $1`,
        [orderItemId]
    );
    if (!item) throw notFound("Order item not found");
    if (item.buyer_id !== userId) throw forbidden("Only the buyer can review this purchase");
    if (item.status !== "completed") throw conflict("You can review a purchase once it is completed");
};

router.put(
    "/:orderItemId",
    requireAuth,
    validate({
        params: z.object({ orderItemId: id }),
        body: z.object({
            rating: z.number().int().min(1).max(5),
            content: z.string().trim().max(2000).nullable().optional()
        })
    }),
    async (req, res) => {
        const { orderItemId } = req.data.params;
        await assertReviewable(orderItemId, req.user.id);
        await one(
            `insert into reviews (order_item_id, rating, content)
             values ($1, $2, $3)
             on conflict (order_item_id) do update set rating = excluded.rating, content = excluded.content`,
            [orderItemId, req.data.body.rating, req.data.body.content ?? null]
        );
        const review = await one(`${reviewSelect} where r.order_item_id = $1`, [orderItemId]);
        delete review.totalCount;
        res.json({ data: review });
    }
);

router.delete(
    "/:orderItemId",
    requireAuth,
    validate({ params: z.object({ orderItemId: id }) }),
    async (req, res) => {
        const { orderItemId } = req.data.params;
        await assertReviewable(orderItemId, req.user.id);
        await one("delete from reviews where order_item_id = $1", [orderItemId]);
        res.status(204).end();
    }
);

export default router;
