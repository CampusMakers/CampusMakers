import { Router } from "express";
import { z } from "zod";
import { many, one } from "../db/pool.js";
import { badRequest, notFound } from "../lib/httpError.js";
import { id } from "../lib/schemas.js";
import { requireSeller } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router({ mergeParams: true });

const params = z.object({ eventId: id });

router.get("/", validate({ params }), async (req, res) => {
    const rows = await many(
        `select s.id as "storeId", s.name as "storeName", ev.booth,
                json_build_object('id', u.id, 'username', u.username, 'name', u.name) as owner
         from event_vendors ev
         join stores s on s.id = ev.store_id
         join users u on u.id = s.owner_id
         where ev.event_id = $1
         order by s.name`,
        [req.data.params.eventId]
    );
    res.json({ data: rows });
});

router.put(
    "/me",
    requireSeller,
    validate({ params, body: z.object({ booth: z.string().trim().max(60).nullable().optional() }) }),
    async (req, res) => {
        const { eventId } = req.data.params;
        const event = await one("select campus_id from events where id = $1", [eventId]);
        if (!event) throw notFound("Event not found");
        if (event.campus_id !== req.store.campusId) throw badRequest("You can only vend at events on your campus");
        const vendor = await one(
            `insert into event_vendors (event_id, store_id, booth)
             values ($1, $2, $3)
             on conflict (event_id, store_id) do update set booth = excluded.booth
             returning event_id as "eventId", store_id as "storeId", booth`,
            [eventId, req.store.id, req.data.body.booth ?? null]
        );
        res.json({ data: vendor });
    }
);

router.delete("/me", requireSeller, validate({ params }), async (req, res) => {
    await one("delete from event_vendors where event_id = $1 and store_id = $2", [req.data.params.eventId, req.store.id]);
    res.status(204).end();
});

export default router;
