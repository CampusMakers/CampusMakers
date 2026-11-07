import { Router } from "express";
import { z } from "zod";
import { many, one } from "../db/pool.js";
import { notFound } from "../lib/httpError.js";
import { id } from "../lib/schemas.js";
import { requireAuth } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router({ mergeParams: true });

const params = z.object({ eventId: id });

router.get("/", requireAuth, validate({ params }), async (req, res) => {
    const event = await one(
        `select hs.owner_id from events e left join stores hs on hs.id = e.host_store_id where e.id = $1`,
        [req.data.params.eventId]
    );
    if (!event) throw notFound("Event not found");
    const isHost = event.owner_id === req.user.id || req.user.role === "admin";
    const rows = await many(
        `select r.status, r.created_at as "createdAt",
                json_build_object('id', u.id, 'username', u.username, 'name', u.name, 'image', u.image) as attendee
         from event_rsvps r
         join users u on u.id = r.user_id
         where r.event_id = $1 and ($2 or r.user_id = $3)
         order by r.created_at`,
        [req.data.params.eventId, isHost, req.user.id]
    );
    res.json({ data: rows });
});

router.put(
    "/me",
    requireAuth,
    validate({ params, body: z.object({ status: z.enum(["going", "interested"]) }) }),
    async (req, res) => {
        const { eventId } = req.data.params;
        if (!(await one("select id from events where id = $1", [eventId]))) throw notFound("Event not found");
        const rsvp = await one(
            `insert into event_rsvps (event_id, user_id, status)
             values ($1, $2, $3)
             on conflict (event_id, user_id) do update set status = excluded.status
             returning event_id as "eventId", status, created_at as "createdAt"`,
            [eventId, req.user.id, req.data.body.status]
        );
        res.json({ data: rsvp });
    }
);

router.delete("/me", requireAuth, validate({ params }), async (req, res) => {
    await one("delete from event_rsvps where event_id = $1 and user_id = $2", [req.data.params.eventId, req.user.id]);
    res.status(204).end();
});

export default router;
