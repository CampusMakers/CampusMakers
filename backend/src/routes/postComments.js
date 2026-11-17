import { Router } from "express";
import { z } from "zod";
import { many, one } from "../db/pool.js";
import { notFound } from "../lib/httpError.js";
import { id, pagination } from "../lib/schemas.js";
import { paginated } from "../lib/sql.js";
import { requireAuth } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router({ mergeParams: true });

router.use(async (req, res, next) => {
    if (!/^\d+$/.test(req.params.postId))
        throw notFound("Post not found");
    if (
        !(await one(
            "select id from posts where id=$1 and moderation_status='approved'",
            [req.params.postId]
        ))
    )
        throw notFound("Post not found");
    next();
});

const commentSelect = `
    select
        c.id, c.parent_id, c.author_id,
        c.content,
        c.created_at as "createdAt",
        json_build_object('id', u.id, 'username', u.username, 'name', u.name, 'image', u.image) as author,
        count(*) over ()::int as "totalCount"
    from post_comments c
    join users u on u.id = c.author_id`;

router.get(
    "/",
    validate({
        params: z.object({ postId: id }),
        query: z.object(pagination)
    }),
    async (req, res) => {
        const { limit, offset } = req.data.query;
        const rows = await many(
            `${commentSelect} where c.post_id = $1 order by c.created_at, c.id limit $2 offset $3`,
            [req.data.params.postId, limit, offset]
        );
        res.json(paginated(rows, { limit, offset }));
    }
);

router.post(
    "/",
    requireAuth,
    validate({
        params: z.object({ postId: id }),
        body: z.object({
            content: z.string().trim().min(1).max(1000),
            parentId: id.nullable().optional()
        })
    }),
    async (req, res) => {
        const { postId } = req.data.params;
        if (
            !(await one("select id from posts where id = $1", [
                postId
            ]))
        )
            throw notFound("Post not found");
        const parentId = req.data.body.parentId;
        if (
            parentId &&
            !(await one(
                "select id from post_comments where id=$1 and post_id=$2",
                [parentId, postId]
            ))
        )
            throw notFound("Reply not found");
        const created = await one(
            "insert into post_comments (post_id, author_id, content, parent_id) values ($1, $2, $3, $4) returning id",
            [
                postId,
                req.user.id,
                req.data.body.content,
                parentId ?? null
            ]
        );
        const { totalCount: _totalCount, ...comment } =
            await one(`${commentSelect} where c.id = $1`, [
                created.id
            ]);
        res.status(201).json({ data: comment });
    }
);

router.delete(
    "/:commentId",
    requireAuth,
    validate({
        params: z.object({ postId: id, commentId: id })
    }),
    async (req, res) => {
        const { postId, commentId } = req.data.params;
        const deleted = await one(
            `delete from post_comments c
             using posts p
             where c.id = $1 and c.post_id = $2 and p.id = c.post_id
               and (c.author_id = $3 or p.author_id = $3)
             returning c.id`,
            [commentId, postId, req.user.id]
        );
        if (!deleted) throw notFound("Comment not found");
        res.status(204).end();
    }
);

export default router;
