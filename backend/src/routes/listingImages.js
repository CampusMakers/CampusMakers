import { Router } from "express";
import { z } from "zod";
import { many, one } from "../db/pool.js";
import { forbidden, notFound } from "../lib/httpError.js";
import { id } from "../lib/schemas.js";
import { requireSeller } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router({ mergeParams: true });

const assertOwnership = async (listingId, storeId) => {
    const listing = await one("select store_id from listings where id = $1", [listingId]);
    if (!listing) throw notFound("Listing not found");
    if (listing.store_id !== storeId) throw forbidden("You do not own this listing");
};

router.get("/", validate({ params: z.object({ listingId: id }) }), async (req, res) => {
    const rows = await many(
        "select id, url, position from listing_images where listing_id = $1 order by position, id",
        [req.data.params.listingId]
    );
    res.json({ data: rows });
});

router.post(
    "/",
    requireSeller,
    validate({
        params: z.object({ listingId: id }),
        body: z.object({ url: z.url(), position: z.number().int().min(0).max(100).optional() })
    }),
    async (req, res) => {
        const { listingId } = req.data.params;
        await assertOwnership(listingId, req.store.id);
        const image = await one(
            `insert into listing_images (listing_id, url, position)
             values ($1, $2, coalesce($3, (select coalesce(max(position) + 1, 0) from listing_images where listing_id = $1)))
             returning id, url, position`,
            [listingId, req.data.body.url, req.data.body.position ?? null]
        );
        res.status(201).json({ data: image });
    }
);

router.delete(
    "/:imageId",
    requireSeller,
    validate({ params: z.object({ listingId: id, imageId: id }) }),
    async (req, res) => {
        const { listingId, imageId } = req.data.params;
        await assertOwnership(listingId, req.store.id);
        const deleted = await one("delete from listing_images where id = $1 and listing_id = $2 returning id", [
            imageId,
            listingId
        ]);
        if (!deleted) throw notFound("Image not found");
        res.status(204).end();
    }
);

export default router;
