import { Router } from "express";
import { z } from "zod";
import { many, one } from "../db/pool.js";
import { badRequest, forbidden, notFound } from "../lib/httpError.js";
import { id, idParam, pagination, timestamp } from "../lib/schemas.js";
import { eventSelect } from "../lib/selects.js";
import { Params, paginated, whereClause, withoutTotal } from "../lib/sql.js";
import { requireAuth } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router();

const getEvent = async (eventId, viewerId) => {
    const params = new Params();
    const select = eventSelect(params, viewerId);
    const event = await one(`${select} where e.id = ${params.add(eventId)}`, params.values);
    if (!event) throw notFound("Event not found");
    return withoutTotal(event);
};

const assertLocation = async (locationId, campusId) => {
    if (!locationId) return;
    const location = await one("select campus_id from locations where id = $1", [locationId]);
    if (!location) throw badRequest("Unknown location");
    if (location.campus_id !== campusId) throw badRequest("Location must be on the event's campus");
};

const canManage = async (eventId, user) => {
    const event = await one(
        `select e.campus_id, e.created_by, hs.owner_id as host_owner_id
         from events e left join stores hs on hs.id = e.host_store_id
         where e.id = $1`,
        [eventId]
    );
    if (!event) throw notFound("Event not found");
    if (user.role !== "admin" && event.created_by !== user.id && event.host_owner_id !== user.id) {
        throw forbidden("Only the event host can change this event");
    }
    return event;
};

router.get(
    "/",
    validate({
        query: z.object({
            campusId: id.optional(),
            when: z.enum(["upcoming", "past", "all"]).default("upcoming"),
            rsvp: z.enum(["going", "interested", "any"]).optional(),
            mine: z.enum(["hosting", "vending", "involved"]).optional(),
            ...pagination
        })
    }),
    async (req, res) => {
        const query = req.data.query;
        if ((query.rsvp || query.mine) && !req.user) throw badRequest("Sign in to filter by your events");

        const params = new Params();
        const select = eventSelect(params, req.user?.id);
        const conditions = [];
        if (query.campusId) conditions.push(`e.campus_id = ${params.add(query.campusId)}`);
        if (query.when === "upcoming") conditions.push("coalesce(e.ends_at, e.starts_at) >= now()");
        if (query.when === "past") conditions.push("coalesce(e.ends_at, e.starts_at) < now()");
        if (query.rsvp) {
            const viewer = params.add(req.user.id);
            const status = query.rsvp === "any" ? "" : `and r.status = ${params.add(query.rsvp)}`;
            conditions.push(`exists (select 1 from event_rsvps r where r.event_id = e.id and r.user_id = ${viewer} ${status})`);
        }
        if (query.mine) {
            const viewer = params.add(req.user.id);
            const hosting = `hs.owner_id = ${viewer}`;
            const vending = `exists (
                select 1 from event_vendors ev join stores vs on vs.id = ev.store_id
                where ev.event_id = e.id and vs.owner_id = ${viewer}
            )`;
            conditions.push(
                query.mine === "hosting" ? hosting : query.mine === "vending" ? vending : `(${hosting} or ${vending})`
            );
        }

        const order = query.when === "past" ? "e.starts_at desc" : "e.starts_at asc";
        const rows = await many(
            `${select} ${whereClause(conditions)}
             order by ${order}
             limit ${params.add(query.limit)} offset ${params.add(query.offset)}`,
            params.values
        );
        res.json(paginated(rows, query));
    }
);

router.get("/:id", validate({ params: idParam }), async (req, res) => {
    res.json({ data: await getEvent(req.data.params.id, req.user?.id) });
});

const eventBody = {
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(4000).nullable().optional(),
    locationId: id.nullable().optional(),
    startsAt: timestamp,
    endsAt: timestamp.nullable().optional()
};

router.post(
    "/",
    requireAuth,
    validate({
        body: z
            .object({ ...eventBody, campusId: id.optional(), hostAsStore: z.boolean().default(true) })
            .refine((body) => !body.endsAt || new Date(body.endsAt) > new Date(body.startsAt), "endsAt must be after startsAt")
    }),
    async (req, res) => {
        const body = req.data.body;
        const store = await one("select id, campus_id from stores where owner_id = $1", [req.user.id]);
        const campusId = body.campusId ?? store?.campus_id ?? req.user.campusId;
        if (!campusId) throw badRequest("Provide campusId");
        if (!store && req.user.role !== "admin") throw forbidden("Only sellers can create events");
        await assertLocation(body.locationId, campusId);

        const created = await one(
            `insert into events (campus_id, location_id, created_by, host_store_id, title, description, starts_at, ends_at)
             values ($1, $2, $3, $4, $5, $6, $7, $8)
             returning id`,
            [
                campusId,
                body.locationId ?? null,
                req.user.id,
                body.hostAsStore && store ? store.id : null,
                body.title,
                body.description ?? null,
                body.startsAt,
                body.endsAt ?? null
            ]
        );
        res.status(201).location(`/api/events/${created.id}`).json({ data: await getEvent(created.id, req.user.id) });
    }
);

router.patch(
    "/:id",
    requireAuth,
    validate({
        params: idParam,
        body: z
            .object({
                title: eventBody.title.optional(),
                description: eventBody.description,
                locationId: eventBody.locationId,
                startsAt: timestamp.optional(),
                endsAt: eventBody.endsAt
            })
            .refine((body) => Object.keys(body).length > 0, "Provide at least one field to update")
    }),
    async (req, res) => {
        const eventId = req.data.params.id;
        const body = req.data.body;
        const event = await canManage(eventId, req.user);
        await assertLocation(body.locationId, event.campus_id);

        await one(
            `update events set
                 title = coalesce($2, title),
                 description = case when $3::boolean then $4 else description end,
                 location_id = case when $5::boolean then $6::bigint else location_id end,
                 starts_at = coalesce($7, starts_at),
                 ends_at = case when $8::boolean then $9::timestamptz else ends_at end
             where id = $1`,
            [
                eventId,
                body.title ?? null,
                "description" in body,
                body.description ?? null,
                "locationId" in body,
                body.locationId ?? null,
                body.startsAt ?? null,
                "endsAt" in body,
                body.endsAt ?? null
            ]
        );
        res.json({ data: await getEvent(eventId, req.user.id) });
    }
);

router.delete("/:id", requireAuth, validate({ params: idParam }), async (req, res) => {
    await canManage(req.data.params.id, req.user);
    await one("delete from events where id = $1", [req.data.params.id]);
    res.status(204).end();
});

export default router;
