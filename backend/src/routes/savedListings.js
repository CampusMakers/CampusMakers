import { Router } from "express";
import { z } from "zod";
import { many, one } from "../db/pool.js";
import { notFound } from "../lib/httpError.js";
import { id, pagination } from "../lib/schemas.js";
import { listingSelect } from "../lib/selects.js";
import { Params, paginated } from "../lib/sql.js";
import { requireAuth } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate({ query: z.object(pagination) }), async (req, res) => {
    const { limit, offset } = req.data.query;
    const params = new Params();
    const select = listingSelect(params, req.user.id);
    const viewer = params.add(req.user.id);
    const rows = await many(
        `${select}
         join saved_listings saved on saved.listing_id = l.id and saved.user_id = ${viewer}
         order by saved.created_at desc
         limit ${params.add(limit)} offset ${params.add(offset)}`,
        params.values
    );
    res.json(paginated(rows, { limit, offset }));
});

router.put("/:listingId", validate({ params: z.object({ listingId: id }) }), async (req, res) => {
    const { listingId } = req.data.params;
    if (!(await one("select id from listings where id = $1", [listingId]))) throw notFound("Listing not found");
    await one("insert into saved_listings (user_id, listing_id) values ($1, $2) on conflict do nothing", [
        req.user.id,
        listingId
    ]);
    res.status(204).end();
});

router.delete("/:listingId", validate({ params: z.object({ listingId: id }) }), async (req, res) => {
    await one("delete from saved_listings where user_id = $1 and listing_id = $2", [
        req.user.id,
        req.data.params.listingId
    ]);
    res.status(204).end();
});

export default router;
