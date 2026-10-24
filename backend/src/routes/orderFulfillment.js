import { randomInt, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import config from "../config.js";
import { transaction } from "../db/pool.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/httpError.js";
import { assertPickupLocation, getOrder, pastStatuses } from "../lib/orders.js";
import { id, idParam, timestamp } from "../lib/schemas.js";
import { requireAuth } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

const generatePin = () => {
    const length = config.orders.pinLength;
    return String(randomInt(0, 10 ** length)).padStart(length, "0");
};

const lockOrder = async (client, orderId, userId) => {
    const { rows } = await client.query(
        `select o.id, o.status, o.buyer_id, o.pickup_at, o.pickup_location_id, o.pickup_pin,
                s.owner_id, s.campus_id
         from orders o
         left join stores s on s.id = o.store_id
         where o.id = $1
         for update of o`,
        [orderId]
    );
    const order = rows[0];
    if (!order) throw notFound("Order not found");
    const isBuyer = order.buyer_id === userId;
    const isSeller = order.owner_id === userId;
    if (!isBuyer && !isSeller) throw forbidden("You are not part of this order");
    if (pastStatuses.includes(order.status)) throw conflict(`This order is already ${order.status}`);
    return { order, isBuyer, isSeller };
};

router.patch(
    "/:id",
    validate({
        params: idParam,
        body: z
            .object({
                status: z.enum(["scheduled", "ready", "cancelled"]).optional(),
                pickupAt: timestamp.optional(),
                pickupLocationId: id.optional(),
                paid: z.boolean().optional()
            })
            .refine((body) => Object.keys(body).length > 0, "Provide at least one field to update")
    }),
    async (req, res) => {
        const orderId = req.data.params.id;
        const body = req.data.body;

        await transaction(async (client) => {
            const { order, isSeller } = await lockOrder(client, orderId, req.user.id);
            const sellerOnly = (action) => {
                if (!isSeller) throw forbidden(`Only the seller can ${action}`);
            };

            if (body.pickupLocationId) await assertPickupLocation(client, body.pickupLocationId, order.campus_id);
            const pickupAt = body.pickupAt ?? order.pickup_at;
            const pickupLocationId = body.pickupLocationId ?? order.pickup_location_id;

            let status = order.status;
            let pin = order.pickup_pin;

            if (body.status === "cancelled") {
                status = "cancelled";
                pin = null;
                await client.query(
                    `update listings l
                     set quantity = l.quantity + oi.quantity, updated_at = now()
                     from order_items oi
                     where oi.order_id = $1 and l.id = oi.listing_id`,
                    [orderId]
                );
            } else if (body.status) {
                sellerOnly(`mark an order ${body.status}`);
                if (!pickupAt || !pickupLocationId) {
                    throw badRequest("A pickup time and location are required first");
                }
                status = body.status;
                if (status === "ready") pin ??= generatePin();
                if (status === "scheduled") pin = null;
            }

            if (body.paid !== undefined) sellerOnly("change payment status");

            await client.query(
                `update orders set
                     status = $2,
                     pickup_at = $3,
                     pickup_location_id = $4,
                     pickup_pin = $5,
                     paid_at = case
                         when $6::boolean is null then paid_at
                         when $6 then coalesce(paid_at, now())
                         else null
                     end,
                     updated_at = now()
                 where id = $1`,
                [orderId, status, pickupAt, pickupLocationId, pin, body.paid ?? null]
            );
        });

        res.json({ data: await getOrder(orderId, req.user.id) });
    }
);

router.post(
    "/:id/handoff",
    validate({
        params: idParam,
        body: z.object({ pin: z.string().trim().regex(/^\d+$/, "PIN must be numeric") })
    }),
    async (req, res) => {
        const orderId = req.data.params.id;
        await transaction(async (client) => {
            const { order, isSeller } = await lockOrder(client, orderId, req.user.id);
            if (!isSeller) throw forbidden("Only the seller can verify a hand-off");
            if (order.status !== "ready" || !order.pickup_pin) throw conflict("This order is not ready for pickup");

            const expected = Buffer.from(order.pickup_pin);
            const received = Buffer.from(req.data.body.pin);
            if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
                throw badRequest("Incorrect pickup PIN");
            }

            await client.query(
                `update orders
                 set status = 'completed', pickup_pin = null, paid_at = coalesce(paid_at, now()), updated_at = now()
                 where id = $1`,
                [orderId]
            );
        });
        res.json({ data: await getOrder(orderId, req.user.id) });
    }
);

export default router;
