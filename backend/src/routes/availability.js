import { Router } from "express";
import { z } from "zod";
import { many, one } from "../db/pool.js";
import { badRequest, forbidden, notFound } from "../lib/httpError.js";
import { id, timestamp } from "../lib/schemas.js";
import { requireSeller } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router({ mergeParams: true });

const columns = `
    a.id,
    a.starts_at as "startsAt",
    a.ends_at as "endsAt",
    json_build_object('id', loc.id, 'name', loc.name, 'address', loc.address) as location`;

const ownStore = (req) => {
    if (req.store.id !== req.data.params.storeId) throw forbidden("You do not own this store");
};

router.get(
    "/",
    validate({
        params: z.object({ storeId: id }),
        query: z.object({ includePast: z.stringbool().default(false) })
    }),
    async (req, res) => {
        const rows = await many(
            `select ${columns}
             from availability a
             join locations loc on loc.id = a.location_id
             where a.store_id = $1 and ($2 or a.ends_at > now())
             order by a.starts_at`,
            [req.data.params.storeId, req.data.query.includePast]
        );
        res.json({ data: rows });
    }
);

router.post(
    "/",
    requireSeller,
    validate({
        params: z.object({ storeId: id }),
        body: z
            .object({ locationId: id, startsAt: timestamp, endsAt: timestamp })
            .refine((body) => new Date(body.endsAt) > new Date(body.startsAt), "endsAt must be after startsAt")
    }),
    async (req, res) => {
        ownStore(req);
        const { locationId, startsAt, endsAt } = req.data.body;
        const location = await one("select campus_id from locations where id = $1", [locationId]);
        if (!location) throw badRequest("Unknown location");
        if (location.campus_id !== req.store.campusId) throw badRequest("Location must be on your store's campus");

        const created = await one(
            `insert into availability (store_id, location_id, starts_at, ends_at)
             values ($1, $2, $3, $4)
             returning id`,
            [req.store.id, locationId, startsAt, endsAt]
        );
        const row = await one(
            `select ${columns} from availability a join locations loc on loc.id = a.location_id where a.id = $1`,
            [created.id]
        );
        res.status(201).json({ data: row });
    }
);

router.delete(
    "/:availabilityId",
    requireSeller,
    validate({ params: z.object({ storeId: id, availabilityId: id }) }),
    async (req, res) => {
        ownStore(req);
        const deleted = await one("delete from availability where id = $1 and store_id = $2 returning id", [
            req.data.params.availabilityId,
            req.store.id
        ]);
        if (!deleted) throw notFound("Availability window not found");
        res.status(204).end();
    }
);

export default router;
