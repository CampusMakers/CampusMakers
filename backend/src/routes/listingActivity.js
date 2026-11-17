import { Router } from "express";
import { z } from "zod";
import { one, many } from "../db/pool.js";
import { requireAuth } from "../middleware/session.js";
import { notFound } from "../lib/httpError.js";
import { id } from "../lib/schemas.js";
import validate from "../middleware/validate.js";
const router = Router({ mergeParams: true });
router.use(
    validate({ params: z.object({ listingId: id }) }),
    async (req, res, next) => {
        const listing = await one(
            "select id from listings where id=$1 and moderation_status='approved'",
            [req.data.params.listingId]
        );
        if (!listing) throw notFound("Listing not found");
        next();
    }
);
const summary = (listingId, userId) =>
    one(
        `select
    (select avg(rating)::float from listing_ratings where listing_id=$1) as average,
    (select count(*)::int from listing_ratings where listing_id=$1) as count,
    (select rating from listing_ratings where listing_id=$1 and user_id=$2) as "ownRating",
    exists(select 1 from listing_likes where listing_id=$1 and user_id=$2) as liked`,
        [listingId, userId ?? null]
    );
router.get("/", async (req, res) =>
    res.json({
        data: await summary(req.params.listingId, req.user?.id)
    })
);
router.put(
    "/rating",
    requireAuth,
    validate({
        body: z.object({
            rating: z.number().int().min(1).max(5)
        })
    }),
    async (req, res) => {
        await one(
            `insert into listing_ratings (listing_id,user_id,rating) values ($1,$2,$3)
        on conflict (listing_id,user_id) do update set rating=excluded.rating`,
            [
                req.params.listingId,
                req.user.id,
                req.data.body.rating
            ]
        );
        res.json({
            data: await summary(
                req.params.listingId,
                req.user.id
            )
        });
    }
);
router.put("/like", requireAuth, async (req, res) => {
    await one(
        "insert into listing_likes (listing_id,user_id) values ($1,$2) on conflict do nothing",
        [req.params.listingId, req.user.id]
    );
    res.json({
        data: await summary(req.params.listingId, req.user.id)
    });
});
router.delete("/like", requireAuth, async (req, res) => {
    await one(
        "delete from listing_likes where listing_id=$1 and user_id=$2",
        [req.params.listingId, req.user.id]
    );
    res.json({
        data: await summary(req.params.listingId, req.user.id)
    });
});
const comments = (id) =>
    many(
        `select c.id,c.parent_id,c.author_id,c.content,c.created_at,'@'||u.username as author
    from listing_comments c join users u on u.id=c.author_id where listing_id=$1 order by c.id limit 1000`,
        [id]
    );
router.get("/comments", async (req, res) =>
    res.json({ data: await comments(req.params.listingId) })
);
router.post(
    "/comments",
    requireAuth,
    validate({
        body: z.object({
            content: z.string().trim().min(1).max(1000),
            parentId: id.nullable().optional()
        })
    }),
    async (req, res) => {
        const { content, parentId } = req.data.body;
        if (
            parentId &&
            !(await one(
                "select id from listing_comments where id=$1 and listing_id=$2",
                [parentId, req.params.listingId]
            ))
        )
            throw notFound("Reply not found");
        const row = await one(
            "insert into listing_comments (listing_id,author_id,content,parent_id) values ($1,$2,$3,$4) returning id",
            [
                req.params.listingId,
                req.user.id,
                content,
                parentId ?? null
            ]
        );
        res.status(201).json({
            data: (await comments(req.params.listingId)).find(
                (c) => c.id === row.id
            )
        });
    }
);
router.delete(
    "/comments/:commentId",
    requireAuth,
    validate({
        params: z.object({ listingId: id, commentId: id })
    }),
    async (req, res) => {
        const row = await one(
            "delete from listing_comments where id=$1 and listing_id=$2 and author_id=$3 returning id",
            [
                req.params.commentId,
                req.params.listingId,
                req.user.id
            ]
        );
        if (!row) throw notFound("Comment not found");
        res.status(204).end();
    }
);
export default router;
