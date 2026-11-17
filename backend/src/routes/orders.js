import { Router } from "express";
import { z } from "zod";
import { many, transaction } from "../db/pool.js";
import { badRequest, conflict } from "../lib/httpError.js";
import {
    id,
    idParam,
    pagination,
    paymentMethod,
    timestamp
} from "../lib/schemas.js";
import {
    activeStatuses,
    assertPickupLocation,
    getOrder,
    pastStatuses
} from "../lib/orders.js";
import { orderSelect } from "../lib/selects.js";
import { Params, paginated, whereClause } from "../lib/sql.js";
import { requireAuth } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

router.get(
    "/",
    validate({
        query: z.object({
            role: z.enum(["buyer", "seller"]).default("buyer"),
            state: z
                .enum(["active", "past", "all"])
                .default("all"),
            ...pagination
        })
    }),
    async (req, res) => {
        const { role, state, limit, offset } = req.data.query;
        const params = new Params();
        const select = orderSelect(params, req.user.id);
        const viewer = params.add(req.user.id);
        const conditions = [
            role === "buyer"
                ? `o.buyer_id = ${viewer}`
                : `so.id = ${viewer}`
        ];
        if (state !== "all") {
            conditions.push(
                `o.status = any(${params.add(state === "active" ? activeStatuses : pastStatuses)}::order_status[])`
            );
        }
        const order =
            state === "active"
                ? "o.pickup_at asc nulls last, o.created_at desc"
                : "o.created_at desc";
        const rows = await many(
            `${select} ${whereClause(conditions)}
             order by ${order}
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
        res.json({
            data: await getOrder(
                req.data.params.id,
                req.user.id
            )
        });
    }
);

router.post(
    "/",
    validate({
        body: z.object({
            items: z
                .array(
                    z.object({
                        listingId: id,
                        quantity: z
                            .number()
                            .int()
                            .min(1)
                            .max(1000)
                            .default(1)
                    })
                )
                .min(1)
                .max(50),
            paymentMethod,
            pickupLocationId: id.optional(),
            pickupAt: timestamp.optional()
        })
    }),
    async (req, res) => {
        const body = req.data.body;
        const quantities = new Map();
        for (const item of body.items) {
            quantities.set(
                item.listingId,
                (quantities.get(item.listingId) ?? 0) +
                    item.quantity
            );
        }
        const listingIds = [...quantities.keys()];

        const orderId = await transaction(async (client) => {
            const { rows: listings } = await client.query(
                `select l.moderation_status, l.id, l.title, l.price, l.quantity, l.inactive_since, l.store_id,
                        s.owner_id, s.campus_id, s.inactive_since as store_inactive_since
                 from listings l
                 join stores s on s.id = l.store_id
                 where l.id = any($1::bigint[])
                 for update of l`,
                [listingIds]
            );
            if (listings.length !== listingIds.length)
                throw badRequest(
                    "One or more listings do not exist"
                );

            const storeIds = new Set(
                listings.map((listing) => listing.store_id)
            );
            if (storeIds.size !== 1)
                throw badRequest(
                    "Each order must contain listings from a single store"
                );
            const [
                {
                    store_id: storeId,
                    owner_id: ownerId,
                    campus_id: campusId
                }
            ] = listings;
            if (ownerId === req.user.id)
                throw badRequest(
                    "You cannot order from your own store"
                );

            for (const listing of listings) {
                if (
                    listing.moderation_status !== "approved" ||
                    listing.inactive_since ||
                    listing.store_inactive_since
                ) {
                    throw conflict(
                        `"${listing.title}" is no longer available`
                    );
                }
                if (
                    listing.quantity <
                    quantities.get(listing.id)
                ) {
                    throw conflict(
                        `Only ${listing.quantity} of "${listing.title}" left`
                    );
                }
            }

            const { rows: methods } = await client.query(
                "select method from store_payment_methods where store_id = $1",
                [storeId]
            );
            if (
                methods.length &&
                !methods.some(
                    (row) => row.method === body.paymentMethod
                )
            ) {
                throw badRequest(
                    `This store accepts ${methods.map((row) => row.method).join(", ")}`
                );
            }

            if (body.pickupLocationId)
                await assertPickupLocation(
                    client,
                    body.pickupLocationId,
                    campusId
                );

            const created = await client.query(
                `insert into orders (buyer_id, store_id, payment_method, pickup_location_id, pickup_at)
                 values ($1, $2, $3, $4, $5)
                 returning id`,
                [
                    req.user.id,
                    storeId,
                    body.paymentMethod,
                    body.pickupLocationId ?? null,
                    body.pickupAt ?? null
                ]
            );
            const newId = created.rows[0].id;

            await client.query(
                `insert into order_items (order_id, listing_id, title, quantity, unit_price)
                 select $1, l.id, l.title, item.quantity, l.price
                 from unnest($2::bigint[], $3::int[]) as item (listing_id, quantity)
                 join listings l on l.id = item.listing_id`,
                [
                    newId,
                    listingIds,
                    listingIds.map((listingId) =>
                        quantities.get(listingId)
                    )
                ]
            );

            await client.query(
                `update listings l
                 set quantity = l.quantity - item.quantity, updated_at = now()
                 from unnest($1::bigint[], $2::int[]) as item (listing_id, quantity)
                 where l.id = item.listing_id`,
                [
                    listingIds,
                    listingIds.map((listingId) =>
                        quantities.get(listingId)
                    )
                ]
            );

            return newId;
        });

        res.status(201)
            .location(`/api/orders/${orderId}`)
            .json({
                data: await getOrder(orderId, req.user.id)
            });
    }
);

export default router;
