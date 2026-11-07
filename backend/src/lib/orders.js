import { one } from "../db/pool.js";
import { forbidden, notFound } from "./httpError.js";
import { orderSelect } from "./selects.js";
import { Params, withoutTotal } from "./sql.js";

export const activeStatuses = ["pending", "scheduled", "ready"];
export const pastStatuses = ["completed", "cancelled"];

export const getOrder = async (orderId, viewerId) => {
    const params = new Params();
    const select = orderSelect(params, viewerId);
    const order = await one(`${select} where o.id = ${params.add(orderId)}`, params.values);
    if (!order) throw notFound("Order not found");
    if (order.buyer?.id !== viewerId && order.store?.owner?.id !== viewerId) throw forbidden("You are not part of this order");
    return withoutTotal(order);
};

export const assertPickupLocation = async (client, locationId, campusId) => {
    const result = await client.query("select campus_id from locations where id = $1", [locationId]);
    if (!result.rowCount) throw notFound("Pickup location not found");
    if (result.rows[0].campus_id !== campusId) throw forbidden("Pickup location must be on the store's campus");
};
