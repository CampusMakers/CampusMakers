import adminMembers from "./adminMembers.js";
import { Router } from "express";
import { z } from "zod";
import { many, one } from "../db/pool.js";
import { requireAdmin } from "../middleware/session.js";
import validate from "../middleware/validate.js";
import { id } from "../lib/schemas.js";
import { notFound } from "../lib/httpError.js";
const router = Router();
router.use(requireAdmin);
router.use("/members", adminMembers);
router.get("/queue", async (req, res) => {
    const posts =
        await many(`select p.id, p.caption, p.media_url as "mediaUrl", p.type,
        p.moderation_status as status, p.pinned, p.announcement, u.username
        from posts p join users u on u.id=p.author_id
        where p.moderation_status='pending' or p.announcement
        order by p.created_at desc limit 100`);
    const listings =
        await many(`select l.id, l.title, l.description, l.price,
        l.moderation_status as status, u.username,
        (select url from listing_images where listing_id=l.id order by position limit 1) as image
        from listings l join stores s on s.id=l.store_id join users u on u.id=s.owner_id
        where l.moderation_status='pending' order by l.created_at limit 100`);
    res.json({ data: { posts, listings } });
});
router.patch(
    "/:kind/:id",
    validate({
        params: z.object({
            kind: z.enum(["posts", "listings"]),
            id
        }),
        body: z.object({
            status: z.enum(["approved", "rejected"]),
            pinned: z.boolean().optional()
        })
    }),
    async (req, res) => {
        const { kind, id } = req.data.params;
        const { status, pinned } = req.data.body;
        const row =
            kind === "posts"
                ? await one(
                      `update posts set moderation_status=$2, pinned=case when $2='approved' then coalesce($3, pinned) else false end where id=$1 returning id`,
                      [id, status, pinned ?? null]
                  )
                : await one(
                      "update listings set moderation_status=$2 where id=$1 returning id",
                      [id, status]
                  );
        if (!row) throw notFound("Content not found");
        res.json({ data: row });
    }
);
router.post(
    "/announcements",
    validate({
        body: z.object({
            caption: z.string().trim().min(1).max(2200),
            pinned: z.boolean().default(true)
        })
    }),
    async (req, res) => {
        const row = await one(
            `insert into posts (author_id, type, caption, moderation_status, announcement, pinned)
        values ($1, 'text', $2, 'approved', true, $3) returning id`,
            [
                req.user.id,
                req.data.body.caption,
                req.data.body.pinned
            ]
        );
        res.status(201).json({ data: row });
    }
);
export default router;
