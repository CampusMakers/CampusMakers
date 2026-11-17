import { Router } from "express";
import { z } from "zod";
import { one } from "../db/pool.js";
import { notFound } from "../lib/httpError.js";
import { id } from "../lib/schemas.js";
import { requireAuth } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router({ mergeParams: true });

const likeState = (postId, userId) =>
    one(
        `select
             (select count(*) from post_likes where post_id = $1)::int as "likeCount",
             exists (select 1 from post_likes where post_id = $1 and user_id = $2) as "likedByMe"`,
        [postId, userId]
    );

router.use(
    requireAuth,
    validate({ params: z.object({ postId: id }) })
);

router.put("/", async (req, res) => {
    const { postId } = req.data.params;
    if (
        !(await one(
            "select id from posts where id = $1 and moderation_status='approved'",
            [postId]
        ))
    )
        throw notFound("Post not found");
    await one(
        "insert into post_likes (user_id, post_id) values ($1, $2) on conflict do nothing",
        [req.user.id, postId]
    );
    res.json({ data: await likeState(postId, req.user.id) });
});

router.delete("/", async (req, res) => {
    const { postId } = req.data.params;
    await one(
        "delete from post_likes where user_id = $1 and post_id = $2",
        [req.user.id, postId]
    );
    res.json({ data: await likeState(postId, req.user.id) });
});

export default router;
